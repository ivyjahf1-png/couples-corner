/**
 * POST /api/auth/session
 *
 * SECURITY BOUNDARY: exchanges a client-obtained Firebase ID token for an
 * httpOnly session cookie. The token is verified (and revocation-checked)
 * server-side with the Admin SDK; suspended accounts never receive a cookie.
 * This route performs NO other work and never returns admin credentials.
 */

import { NextResponse } from "next/server";
import { createSessionFromIdToken } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    if (!body.idToken || typeof body.idToken !== "string") {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }
    await createSessionFromIdToken(body.idToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log the full error for server-side debugging — this reveals issues like
    // missing Admin SDK credentials or token verification failures.
    console.error("[/api/auth/session] failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Invalid session request" }, { status: 401 });
  }
}
