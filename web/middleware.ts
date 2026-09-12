import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Couples Corner — edge middleware.
 *
 * Guards /admin/* routes at the Edge so unauthenticated visitors are
 * rejected before the request ever reaches a server function.
 *
 * Uses process.env.NODE_ENV (which is replaced at build time) to skip
 * strict JWT validation in development — the server-side guard in
 * app/admin/layout.tsx is the real authority there.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const isAdminPath = url.pathname.startsWith("/admin");

  if (!isAdminPath) {
    return NextResponse.next();
  }

  // ---- Development: let server-side guard handle auth ----
  // In development, Supabase may not be configured, so we let requests
  // through and let the server-side guard in app/admin/layout.tsx
  // decide whether to show the placeholder or the admin shell.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  // ---- Production: enforce session cookie ----
  const sessionCookie = request.cookies.get("couples_corner_session")?.value;

  if (!sessionCookie) {
    // No session cookie — redirect to the homepage so the user can sign in
    // via the auth modal. (A hard 404 or redirect to /login would prevent
    // users from ever reaching the login flow.)
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 302);
  }

  // In production we would validate the JWT here.
  return NextResponse.next({
    request: { headers: request.headers },
  });
}

/**
 * Only match /admin/* so public routes like / and /login stay middleware-free.
 */
export const config = {
  matcher: ["/admin/:path*"],
};
