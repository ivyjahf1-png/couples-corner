import "server-only";
import { NextResponse } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { getCurrentSessionUser } from "@/lib/server/session";

/**
 * POST /api/agora-token
 *
 * Body: { channelName: string, uid?: number | string }
 *
 * Returns a dynamic RTC token for joining `channelName` as `uid` (or any
 * positive integer; Agora also accepts uid 0 on join for auto-assignment —
 * the token is then bound to the channel, not to one uid). Authenticated:
 * only signed-in members may mint tokens, and the channel name is
 * length-capped so it cannot be abused as an oracle.
 *
 * ── WHY SERVER-SIDE ─────────────────────────────────────────────────────────
 * The App CERTIFICATE must never ship to the browser — anyone holding it can
 * mint tokens for any channel forever. The client asks this route for a
 * fresh 1-hour token per call, and `VideoCallModal` treats a 503 as
 * "provider not configured", falling back to the built-in peer-to-peer
 * `CallScreen` (WebRTC over Supabase Realtime, no Agora needed), so calls
 * keep working on deploys that never set Agora keys.
 *
 * env: AGORA_APP_ID + AGORA_APP_CERTIFICATE (AGORA_APP_SECRET accepted as
 * the certificate alias).
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let channelName = "";
  let uid: number | string = 0;
  try {
    const body = (await request.json()) as { channelName?: unknown; uid?: unknown };
    channelName = typeof body.channelName === "string" ? body.channelName.trim().slice(0, 64) : "";
    if (typeof body.uid === "number" && Number.isInteger(body.uid) && body.uid >= 0) {
      uid = body.uid;
    } else if (typeof body.uid === "string" && body.uid.trim()) {
      uid = body.uid.trim().slice(0, 64);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!channelName) {
    return NextResponse.json({ error: "channelName is required" }, { status: 400 });
  }

  const appId = process.env.AGORA_APP_ID?.trim();
  const certificate =
    process.env.AGORA_APP_CERTIFICATE?.trim() || process.env.AGORA_APP_SECRET?.trim();
  if (!appId || !certificate) {
    return NextResponse.json(
      { error: "Live calling is not configured on this deployment" },
      { status: 503 },
    );
  }

  try {
    const expireSeconds = 60 * 60; // whole-token + privilege lifetime: 1 hour
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      certificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expireSeconds,
      expireSeconds,
    );
    return NextResponse.json({
      token,
      appId,
      channelName,
      uid,
      expiresAt: Math.floor(Date.now() / 1000) + expireSeconds,
    });
  } catch (error) {
    console.error("[agora-token] mint failed", error);
    return NextResponse.json({ error: "Could not issue a call token" }, { status: 503 });
  }
}
