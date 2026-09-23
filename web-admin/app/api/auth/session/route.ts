/**
 * POST /api/auth/session (admin)
 *
 * Exchanges a Supabase access token (obtained client-side via sign-in /
 * sign-up on the dedicated admin auth views) for the shared httpOnly
 * session cookie. Deliberately thin: no client-supplied role or status is
 * ever accepted — role resolution happens server-side in session.ts.
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
    console.error("[/api/auth/session] failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    const message =
      error instanceof Error && error.message === "Account is not active"
        ? "Account is not active"
        : "Could not establish your admin session";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}