/**
 * POST /api/auth/logout — clears the session cookie and revokes refresh
 * tokens server-side so the cookie value cannot be replayed.
 */

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/server/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
