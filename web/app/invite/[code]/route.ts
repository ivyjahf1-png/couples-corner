import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizeInviteCode, INVITE_COOKIE } from "@/lib/utils/invite";

/**
 * Invite landing route — sets the referral cookie and forwards to the feed.
 *
 * THE FUNNEL: a visitor arrives here from a shared `/invite/CODE` link. Rather
 * than showing a static "Accept invitation" card, this route hands the referral
 * off to the home feed and redirects there, so the visitor lands straight into
 * the immersive feed with a video already playing. The feed then runs a
 * 3-second timer and raises the signup wall (see
 * `components/app/InviteSignupWall.tsx`).
 *
 * ── WHY THIS IS A ROUTE HANDLER AND NOT A PAGE ────────────────────────────
 * This was previously `page.tsx`, a Server Component, and it CRASHED for every
 * VALID code. The route's whole job is to write a cookie, and Next.js permits
 * cookie mutation only in a Server Action or a Route Handler:
 *
 *     Error: Cookies can only be modified in a Server Action or Route Handler.
 *
 * That thrown error surfaced as the app's generic "Let's get you back to your
 * corner" recovery screen. The malformed-code path masked the bug completely,
 * because it called `redirect("/")` BEFORE the write: `/invite/ZZZZZZ` was
 * fine while every real share link (`/invite/21ATZE`) 500'd. Route handlers
 * may set cookies, so the funnel works here and the failure mode is gone.
 *
 * No database lookup happens here, and none is needed: the code is only
 * recorded, never trusted. `resolveUserCode` re-validates it server-side at
 * registration before any referral is written, so an unknown or revoked code
 * is simply dropped then - which is the correct place to fail, since it costs
 * the visitor nothing and keeps this route unable to break on a DB outage.
 *
 * WHY A SERVER COOKIE: the referral has to survive a redirect to `/`, and it
 * also has to be readable by the SERVER component that renders the feed (so the
 * wall is present in the first HTML paint, not only after hydration). A cookie
 * is the only store that satisfies both. It is intentionally NOT httpOnly - the
 * client reads it to pass the code into registration, which happens entirely in
 * the browser. The value is a public, non-secret invite code.
 *
 * Attribution survives independently of this route: the signup wall also writes
 * localStorage, and RegisterForm reads that as a fallback.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  let normalized: string | null = null;
  try {
    const { code } = await params;
    normalized = normalizeInviteCode(code);
  } catch {
    // A missing or malformed segment is indistinguishable from a bad code to a
    // visitor, so it takes the same route as one: straight home, no cookie.
    normalized = null;
  }

  // Resolve the redirect target from the request so the hop lands on whichever
  // domain the link was opened on, rather than a hardcoded origin.
  const origin = new URL(request.url).origin;

  // Unconditional: a route handler that falls through without returning a
  // Response is itself a 500, so every path below must return.
  if (!normalized) {
    return NextResponse.redirect(`${origin}/`);
  }

  // Built on the redirect response ITSELF, not on a separate response that is
  // then discarded. This is the subtle part: `NextResponse.redirect(...)` returns
  // a fresh object, so a cookie written to any other response never reaches the
  // browser and the referral would be silently dropped with a 307 that looks
  // entirely successful.
  const response = NextResponse.redirect(`${origin}/`);

  response.cookies.set(INVITE_COOKIE, normalized, {
    // Referral attribution should outlive a short browsing session - the
    // visitor watches the feed, may explore, and only then registers. 30 days
    // is a standard referral window; `maxAge` matches it exactly.
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    // `secure` so the referral is never sent over plaintext. This is a
    // production HTTPS app; the guard keeps local http dev working.
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
