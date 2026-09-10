/**
 * POST /api/auth/session
 *
 * SECURITY BOUNDARY: exchanges a client-obtained Supabase access token for an
 * httpOnly session cookie. The token is verified server-side with the Supabase
 * server client; suspended accounts never receive a cookie.
 * This route performs NO other work and never returns admin credentials.
 */

import { NextResponse } from "next/server";
import { createSessionFromIdToken } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accessToken?: string };
    if (!body.accessToken || typeof body.accessToken !== "string") {
      return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
    }
    await createSessionFromIdToken(body.accessToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log the full error for server-side debugging — this reveals issues like
    // missing Supabase credentials or token verification failures.
    console.error("[/api/auth/session] failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Invalid session request" }, { status: 401 });
  }
}

