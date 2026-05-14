import { NextResponse, type NextRequest } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { randomUUID } from "crypto";
import { checkAndPreCharge, hashIp, loadCapConfig } from "@/lib/usage";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  // Shared Caddy sets X-Real-IP; X-Forwarded-For is the chain.
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "unknown";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    return NextResponse.json(
      { error: "LiveKit env vars missing" },
      { status: 500 },
    );
  }

  const cfg = loadCapConfig();
  const ipHash = hashIp(clientIp(req));
  const check = checkAndPreCharge(ipHash, cfg);
  if (!check.ok) {
    return NextResponse.json(
      { error: check.message, reason: check.reason },
      { status: 503 },
    );
  }

  const room = `session-${randomUUID()}`;
  const identity = `user-${randomUUID().slice(0, 8)}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: "10m",
  });
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({ room, token, url });
}
