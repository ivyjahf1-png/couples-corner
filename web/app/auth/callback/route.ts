import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { getRequestOriginOr } from "@/lib/server/request-origin";

/**
 * OAuth / email-link callback handler.
 *
 * Supabase redirects here after Apple / Facebook OAuth consent or an email
 * confirmation link with the `code` query parameter. We exchange the code for
 * a session (which @supabase/ssr persists into httpOnly cookies), then send
 * the user onward:
 *
 *   - OAuth sign-in           → /onboarding (profile completion check happens there)
 *   - Email confirm / recover → /login (next=... honored when provided)
 *
 * Errors land on /login?error=... instead of crashing or leaving the user in
 * a half-authenticated state.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  // Provider/Supabase rejected the flow (user cancelled, misconfig, etc.)
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}`
    );
  }

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.redirect(`${origin}/login?error=Supabase%20not%20configured`);
    }

    let response = NextResponse.next();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (let i = 0; i < cookiesToSet.length; i++) {
            const item = cookiesToSet[i];
            response.cookies.set(item.name, item.value, item.options);
          }
          // Mirror cookies onto a fresh response for the final redirect so the
          // session survives the hop to the browser.
          const redirectResponse = NextResponse.next();
          for (let i = 0; i < cookiesToSet.length; i++) {
            const item = cookiesToSet[i];
            redirectResponse.cookies.set(item.name, item.value, item.options);
          }
          response = redirectResponse;
        },
      },
    });

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(error.message)}`
        );
      }
    } catch {
      return NextResponse.redirect(
        `${origin}/login?error=Failed%20to%20exchange%20auth%20code`
      );
    }

    // Authenticated — send the user where the flow intended.
    // Only allow same-origin relative paths to prevent open redirects.
    const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

    // Resolve the origin from the request so the hop lands on whichever domain
    // the flow STARTED on.
    //
    // This previously rebuilt the base URL as `https://${x-forwarded-host}`.
    // That hardcoded the scheme and, more importantly, disagreed with every
    // error redirect above it (which used `origin`, parsed from request.url) —
    // so a failure could bounce the user off the custom domain while a success
    // did not. Both now go through one resolver.
    const baseUrl = (await getRequestOriginOr(origin)) || origin;

    return NextResponse.redirect(`${baseUrl}${safeNext}`);
  }

  // No code present — nothing to exchange.
  return NextResponse.redirect(`${origin}/login?error=Missing%20auth%20code`);
}
