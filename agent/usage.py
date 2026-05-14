"""SQLite usage / cost counters, shared with web/lib/usage.ts.

Both processes open the same SQLite file (default /data/usage.sqlite under
the container, bind-mounted to /opt/insead-voicebot/data/ on the host). WAL
mode handles concurrent access; schema is created defensively on first use.

The web side does cap checks before minting tokens; this module only writes
the actual cost increments to the monthly + daily counters at the end of a
session.
"""

from __future__ import annotations

import logging
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger("voicebot.usage")

_DB_PATH = Path(os.getenv("USAGE_DB_PATH", "/data/usage.sqlite"))

# Rough per-minute cost in USD cents. Conservative — see PRD 4 math.
COST_CENTS_PER_MINUTE = int(os.getenv("COST_CENTS_PER_MINUTE", "20"))


def _connect() -> sqlite3.Connection | None:
    try:
        _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(_DB_PATH), timeout=5.0, isolation_level=None)
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS usage_counters (
                key TEXT PRIMARY KEY,
                cost_cents INTEGER NOT NULL DEFAULT 0,
                minutes INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS flags (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        return conn
    except Exception:
        logger.exception("usage: failed to open SQLite at %s", _DB_PATH)
        return None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _month_key(now: datetime) -> str:
    return f"month:{now.strftime('%Y-%m')}"


def _day_key(now: datetime) -> str:
    return f"day:{now.strftime('%Y-%m-%d')}"


def record_session_end(duration_seconds: float) -> None:
    """Add this session's cost to the month + day counters.

    Cost is estimated from duration: duration_minutes * COST_CENTS_PER_MINUTE.
    Pessimistic round-up so caps trip a hair early rather than late.
    """
    if duration_seconds <= 0:
        return

    minutes = max(1, int((duration_seconds + 59) // 60))
    cost_cents = minutes * COST_CENTS_PER_MINUTE

    conn = _connect()
    if conn is None:
        logger.warning(
            "usage: no DB; would have recorded %s min / %s cents",
            minutes,
            cost_cents,
        )
        return

    now = datetime.now(timezone.utc)
    iso = _now_iso()
    try:
        for key in (_month_key(now), _day_key(now)):
            conn.execute(
                """
                INSERT INTO usage_counters (key, cost_cents, minutes, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    cost_cents = cost_cents + excluded.cost_cents,
                    minutes    = minutes + excluded.minutes,
                    updated_at = excluded.updated_at
                """,
                (key, cost_cents, minutes, iso),
            )
        logger.info(
            "usage: session ended, +%s min / +%s cents (month=%s, day=%s)",
            minutes,
            cost_cents,
            _month_key(now),
            _day_key(now),
        )
    except Exception:
        logger.exception("usage: failed to record session end")
    finally:
        conn.close()
