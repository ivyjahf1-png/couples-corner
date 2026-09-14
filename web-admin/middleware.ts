import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Couples Corner admin — edge middleware. Guards /admin/* at the Edge. */

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const isAdminPath = url.pathname.startsWith("/admin");

  if (!isAdminPath) {
    return NextResponse.next();
  }

  // Development: let server-side guard handle auth
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  // Production: enforce session cookie
  const sessionCookie = request.cookies.get("couples_corner_session")?.value;

  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 302);
  }

  return NextResponse.next({
    request: { headers: request.headers },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
