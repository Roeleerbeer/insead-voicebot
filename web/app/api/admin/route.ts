import { NextResponse, type NextRequest } from "next/server";
import { isPaused, setPaused } from "@/lib/usage";

export const dynamic = "force-dynamic";

/**
 * Secret kill-switch endpoint.
 *
 *   GET /api/admin?key=<ADMIN_SECRET>&action=pause
 *   GET /api/admin?key=<ADMIN_SECRET>&action=resume
 *   GET /api/admin?key=<ADMIN_SECRET>&action=status
 *
 * The key is matched against ADMIN_SECRET via a constant-time compare so a
 * leaked URL stops the demo without exposing the secret to timing attacks.
 */
export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const key = searchParams.get("key") ?? "";
  if (!constantTimeEqual(key, adminSecret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const action = searchParams.get("action") ?? "status";
  switch (action) {
    case "pause":
      setPaused(true);
      return NextResponse.json({ ok: true, paused: true });
    case "resume":
      setPaused(false);
      return NextResponse.json({ ok: true, paused: false });
    case "status":
      return NextResponse.json({ ok: true, paused: isPaused() });
    default:
      return NextResponse.json(
        { error: "Unknown action. Use pause | resume | status." },
        { status: 400 },
      );
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
