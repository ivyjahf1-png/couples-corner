/**
 * POST /api/auth/session
 *
 * SECURITY BOUNDARY: exchanges a client-obtained Supabase access token for an
 * httpOnly session cookie. The token is verified server-side with the Supabase
 * server client; suspended accounts never receive a cookie.
 * This route performs NO other work and never returns admin credentials.
 */

import { NextResponse } from "next/server";
import { createSessionFromIdToken, getCurrentSessionUser } from "@/lib/server/session";

/**
 * GET /api/auth/session — lightweight persistence probe.
 *
 * The client's `exchangeSessionCookie` calls this right after the POST: a 200
 * there only proves the server WROTE Set-Cookie, not that the browser STORED
 * it. A 200 here proves the cookie round-tripped (middleware/server sees it);
 * anything else is logged client-side as a non-fatal persistence warning.
 */
export async function GET() {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true });
}

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

    /* THE REASON IS RETURNED, NOT COLLAPSED.

       This used to answer every failure with the literal string
       "Invalid session request", so the client could distinguish exactly one
       case and had to render every other cause as a generic network message.
       Three very different failures all arrived here identically:

         • "Supabase not configured"  — SUPABASE_SERVICE_ROLE_KEY missing/misnamed.
           A deployment problem, not a member's problem.
         • "Invalid session token"    — the access token was rejected by GoTrue
           (expired, wrong project, or signed by a different Supabase instance).
         • "Account is not active"    — a real policy decision: suspended or
           deactivated. The member's sign-in is CORRECTLY refused, and telling
           them to "check your connection" invites them to retry forever.

       Only the last one is a message the member should see verbatim. The first
       two are server misconfigurations whose copy belongs in the server log,
       where it is already written above.

       So the distinction is made here, once, at the boundary that has the full
       error in hand — rather than being guessed at from a generic string in the
       client, which is what made every cause look the same. */
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Account is not active") {
      return NextResponse.json(
        { error: "Account is not active", code: "account_inactive" },
        { status: 403 }
      );
    }
    if (message === "Invalid session token") {
      return NextResponse.json(
        { error: "Invalid session request", code: "invalid_token" },
        { status: 401 }
      );
    }
    // Anything else is a server-side fault (missing service-role key, a thrown
    // error inside the verify path). The detail stays in the log above.
    return NextResponse.json(
      { error: "Invalid session request", code: "server_error" },
      { status: 500 }
    );
  }
}

