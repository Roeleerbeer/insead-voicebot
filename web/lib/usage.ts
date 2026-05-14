/**
 * SQLite-backed usage / cost counters + a kill-switch flag.
 *
 * The same DB file is shared with the Python agent worker (agent/usage.py).
 * The agent writes session-end cost increments to the month/day counters;
 * the web token endpoint reads counters + writes per-IP pre-charges.
 *
 * Graceful degradation: if better-sqlite3 isn't installed or the native
 * binding isn't built (dev on Windows without VS Build Tools), all
 * functions return permissive defaults — useful for local development
 * where caps don't matter.
 */

import crypto from "node:crypto";

type DB = {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
};

let dbInstance: DB | null = null;
let dbInitFailed = false;

function db(): DB | null {
  if (dbInstance) return dbInstance;
  if (dbInitFailed) return null;

  try {
    // Dynamic require so a missing native binding doesn't crash module load.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3") as new (
      path: string,
      opts?: { fileMustExist?: boolean },
    ) => DB;
    const path = process.env.USAGE_DB_PATH ?? "/data/usage.sqlite";
    const inst = new Database(path);
    inst.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS usage_counters (
        key TEXT PRIMARY KEY,
        cost_cents INTEGER NOT NULL DEFAULT 0,
        minutes INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS flags (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    dbInstance = inst;
    return inst;
  } catch (err) {
    console.warn(
      "[usage] better-sqlite3 unavailable; cap checks will no-op.",
      (err as Error).message,
    );
    dbInitFailed = true;
    return null;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function monthKey(d = new Date()): string {
  return `month:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dayKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `day:${y}-${m}-${day}`;
}

function ipHourKey(ipHash: string, d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `ip:${ipHash}:hour:${y}-${m}-${day}-${h}`;
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 12);
}

function readCounter(
  conn: DB,
  key: string,
): { cost_cents: number; minutes: number } {
  const row = conn
    .prepare("SELECT cost_cents, minutes FROM usage_counters WHERE key = ?")
    .get(key) as { cost_cents: number; minutes: number } | undefined;
  return row ?? { cost_cents: 0, minutes: 0 };
}

function incrementCounter(
  conn: DB,
  key: string,
  costCents: number,
  minutes: number,
): void {
  conn
    .prepare(
      `
      INSERT INTO usage_counters (key, cost_cents, minutes, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        cost_cents = cost_cents + excluded.cost_cents,
        minutes    = minutes + excluded.minutes,
        updated_at = excluded.updated_at
    `,
    )
    .run(key, costCents, minutes, nowIso());
}

export type CapCheck =
  | { ok: true }
  | { ok: false; reason: "paused" | "monthly" | "daily" | "ip"; message: string };

export type CapConfig = {
  maxMonthlyCostUsd: number;
  maxDailyCostUsd: number;
  maxIpMinutesPerHour: number;
  maxSessionMinutes: number;
};

export function loadCapConfig(): CapConfig {
  return {
    maxMonthlyCostUsd: Number(process.env.MAX_MONTHLY_COST_USD ?? 20),
    maxDailyCostUsd: Number(process.env.MAX_DAILY_COST_USD ?? 5),
    maxIpMinutesPerHour: Number(process.env.MAX_IP_MINUTES_PER_HOUR ?? 8),
    maxSessionMinutes: Number(process.env.MAX_SESSION_MINUTES ?? 5),
  };
}

/**
 * Check all caps before minting a token. On success, pre-charges the
 * per-IP hourly counter by the worst-case session length so a single IP
 * cannot mint a flurry of tokens before a long session even starts.
 *
 * If the DB is unavailable (local dev), returns ok: true unconditionally.
 */
export function checkAndPreCharge(
  ipHash: string,
  cfg: CapConfig = loadCapConfig(),
): CapCheck {
  const conn = db();
  if (!conn) return { ok: true };

  const paused =
    (conn
      .prepare("SELECT value FROM flags WHERE key = 'paused'")
      .get() as { value: string } | undefined)?.value === "1";
  if (paused) {
    return {
      ok: false,
      reason: "paused",
      message: "Demo is paused. Try again later.",
    };
  }

  const month = readCounter(conn, monthKey());
  if (month.cost_cents >= cfg.maxMonthlyCostUsd * 100) {
    return {
      ok: false,
      reason: "monthly",
      message: "Demo has hit its monthly capacity. Back next month.",
    };
  }

  const day = readCounter(conn, dayKey());
  if (day.cost_cents >= cfg.maxDailyCostUsd * 100) {
    return {
      ok: false,
      reason: "daily",
      message: "Demo has hit today's capacity. Back tomorrow.",
    };
  }

  const ipHour = readCounter(conn, ipHourKey(ipHash));
  // Block if even one more worst-case session would exceed the IP's hourly
  // budget. Keeps a single IP from running through several sessions in a row.
  if (ipHour.minutes + cfg.maxSessionMinutes > cfg.maxIpMinutesPerHour) {
    return {
      ok: false,
      reason: "ip",
      message: "You've used your hourly budget. Try again in a bit.",
    };
  }

  // Pre-charge: assume the user will use the full session length. Agent
  // doesn't refund the unused portion — pessimistic accounting on purpose.
  incrementCounter(conn, ipHourKey(ipHash), 0, cfg.maxSessionMinutes);
  return { ok: true };
}

export function isPaused(): boolean {
  const conn = db();
  if (!conn) return false;
  return (
    (conn
      .prepare("SELECT value FROM flags WHERE key = 'paused'")
      .get() as { value: string } | undefined)?.value === "1"
  );
}

export function setPaused(paused: boolean): void {
  const conn = db();
  if (!conn) return;
  conn
    .prepare(
      "INSERT INTO flags (key, value) VALUES ('paused', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(paused ? "1" : "0");
}
