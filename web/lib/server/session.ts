/**
 * Couples Corner — server-side session handling.
 *
 * SECURITY BOUNDARY
 * -----------------
 * Sessions are httpOnly cookies created from a Supabase session.
 * The server verifies the session with the Supabase server client.
 * Role (`user` | `admin`) comes exclusively from the `role` column of the
 * `users` table, looked up by the verified session user ID — never from
 * Supabase JWT metadata (app_metadata/user_metadata) or a client-supplied
 * value.
 */

import { cookies, headers } from "next/headers";
import {
  isSessionRevoked,
  registerOrTouchSession,
} from "@/lib/server/account-security";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveAdminAccess,
  type SessionUser,
} from "@/lib/auth/authorization";
import { isDemoEmail } from "@/lib/auth/demo-guard";

export const SESSION_COOKIE_NAME = "couples_corner_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

/**
 * Shared cookie attributes for the session cookie.
 *
 * `secure` IS DECIDED FROM THE LIVE REQUEST, NOT `NODE_ENV`. This is the single
 * most important detail for the Capacitor APK, and getting it wrong is silent:
 * the user signs in successfully, the cookie is written, and it is then simply
 * never sent back — so every app launch looks like a fresh, signed-out install.
 *
 * The reason: a `Secure` cookie is only stored and transmitted over HTTPS (and
 * the `localhost` exception, which Android WebView does NOT extend to a
 * custom scheme). A Capacitor app commonly serves its content from
 * `capacitor://localhost` or `http://localhost`, where a `Secure` cookie is
 * dropped by the WebView. Keying off `NODE_ENV === "production"` therefore
 * breaks the native app in production while working fine in a browser.
 *
 * Reading the real request protocol means:
 *   • https://…            → `secure: true`   (correct, and unchanged for web)
 *   • capacitor://localhost → `secure: false` (the cookie can actually persist)
 *   • http://localhost dev → `secure: false` (unchanged local behaviour)
 *
 * The trade-off is explicit: a non-HTTPS, non-localhost request would get a
 * non-Secure cookie. `x-forwarded-proto` is included because a Vercel/proxy
 * deployment terminates TLS upstream, and the Node-side request is then plain
 * HTTP — without that header every production cookie would silently drop its
 * Secure flag, which is the opposite bug.
 */
export async function sessionCookieOptions() {
  const requestHeaders = await headers();

  // A reverse proxy (Vercel) terminates TLS upstream, so the Node-side request
  // is plain HTTP even though the browser used HTTPS. `x-forwarded-proto` is the
  // only place the real scheme survives; without it every production cookie
  // would silently lose its Secure flag, which is the opposite bug.
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || requestHeaders.get("x-forwarded-ssl") || "";

  // No proxy header (direct connection, or a Capacitor WebView serving content
  // from a custom scheme). Detect the scheme from the request itself.
  const effective = protocol || detectRequestProtocol();

  return {
    httpOnly: true,
    secure: effective === "https",
    sameSite: "lax" as const,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  };
}

/**
 * Best-effort scheme detection when no proxy header is present.
 *
 * Prefers an explicit app-URL env var so a Capacitor deployment can declare its
 * own scheme. Defaults to "https" when nothing is knowable, which preserves the
 * previous (safe) production default rather than silently downgrading a real
 * HTTPS deployment.
 *
 * LIMITATION, deliberately conservative: without `x-forwarded-proto` AND without
 * an app-url env var, a native request cannot be told apart from a browser one,
 * so it falls back to secure. That is the SAFE direction (a cookie that is not
 * sent is a login prompt; a cookie sent in cleartext is a session hijack), and
 * the fix is a one-line env change, not a code change. Vercel sets the forwarded
 * header, so the hosted app is unaffected either way.
 */
function detectRequestProtocol(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[];
  for (const url of candidates) {
    try {
      return new URL(url).protocol.replace(":", "");
    } catch {
      /* unparseable env value — try the next one */
    }
  }
  return "https";
}

/**
 * Exchange a Supabase access token for an httpOnly session cookie.
 * Rejects suspended/deactivated users before a cookie is ever issued.
 */
export async function createSessionFromIdToken(accessToken: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  // Verify the access token and get the user
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error("Invalid session token");
  }

  // Check if user is active in our users table
  const { data: userRecord } = await supabase
    .from("users")
    .select("status, role")
    .eq("id", data.user.id)
    .single();

  const status = userRecord?.status ?? "active";
  if (status !== "active") {
    throw new Error("Account is not active");
  }

  // Set the session cookie with the access token. `secure` is derived from the
  // live request so a Capacitor WebView on a custom scheme can actually persist
  // it — see sessionCookieOptions.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, accessToken, await sessionCookieOptions());
}

/** Clear the session cookie and sign out server-side. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (cookie) {
    try {
      const supabase = getSupabaseServerClient();
      await supabase?.auth.admin.signOut(cookie.value);
    } catch {
      // Cookie already invalid — clearing it is still correct.
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Resolve the current session server-side, or null when unauthenticated. */
export async function getCurrentSessionUser(
  bearerToken?: string | null
): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);

  // Prefer the httpOnly session cookie; fall back to an explicit Bearer token
  // (e.g. a freshly-refreshed Supabase access token sent by the client when
  // the cookie's embedded token has expired). Either token is verified
  // server-side with Supabase Auth — never trusted blindly.
  // IMPORTANT: if the cookie token is present but expired/invalid, we must
  // still try the bearer token instead of failing outright — otherwise
  // long-lived sessions always hit "Authentication required" even though the
  // browser holds a freshly-refreshed session.
  const authHeaderToken =
    bearerToken?.startsWith("Bearer ") ? bearerToken.slice(7) : bearerToken;
  const candidates = [cookie?.value, authHeaderToken].filter(Boolean) as string[];
  if (candidates.length === 0) return null;

  let supabase = getSupabaseServerClient();
  if (!supabase) {
    // Supabase server client not configured — fail closed, no private data leaked.
    return null;
  }

  try {
    // Try each candidate token in order (cookie first, then bearer).
    let userId: string | null = null;
    let userEmail = "";
    let emailConfirmedAt: string | null = null;
    let validToken: string | null = null;
    for (const token of candidates) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? "";
        emailConfirmedAt = data.user.email_confirmed_at ?? null;
        validToken = token;
        break;
      }
    }
    if (!userId || !validToken) return null;

    // Refresh the cookie when the bearer token worked but the cookie is
    // stale, so subsequent cookie-only requests (Server Actions, navigations)
    // stop failing too.
    if (cookie?.value !== validToken) {
      try {
        const cookieStore = await cookies();
        /* `sessionCookieOptions()`, NOT a hand-rolled object with
           `secure: process.env.NODE_ENV === "production"`.

           This block re-derives the attributes inline, and its rule directly
           contradicts the function 60 lines above whose entire purpose is to
           avoid exactly this. `sessionCookieOptions` decides `secure` from the
           LIVE REQUEST so a Capacitor WebView on `capacitor://localhost` — where
           the WebView silently DROPS a Secure cookie — can persist one at all.
           Keying off NODE_ENV instead means the production APK writes a Secure
           cookie that is never stored or sent back: the member signs in
           successfully and every launch looks like a fresh signed-out install.

           It is not merely redundant duplication. The refresh path is the one
           that runs on ordinary authenticated navigation, so it is precisely the
           path that turns a working native sign-in into a broken one. Reusing the
           shared helper makes the two impossible to drift apart again. */
        cookieStore.set(SESSION_COOKIE_NAME, validToken, await sessionCookieOptions());
      } catch {
        // Cookie refresh is best-effort (e.g. called outside a request scope).
      }
    }

    // Session tracking (best-effort): register the device row, refresh the
    // last-seen heartbeat, and enforce revocations made from /settings.
    try {
      const h = await headers();
      await registerOrTouchSession(userId, validToken, {
        userAgent: h.get("user-agent"),
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      });
      if (await isSessionRevoked(userId, validToken)) {
        return null; // Signed out from another device via settings.
      }
    } catch {
      // Session tracking must never break authentication.
    }

    // Get the user's role and demo flag from the users table. A failed lookup
    // must never discard the verified identity — fall back to the least-
    // privileged role ("user") so a transient DB error can't bounce the user
    // out of the app. Admin is only ever granted from a confirmed row; the
    // fallback can lower privilege, never raise it.
    let userRecord: { role?: string | null; is_demo?: boolean | null } | null = null;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role, is_demo")
        .eq("id", userId)
        .single();
      if (!error) userRecord = data;
    } catch {
      // Transient lookup failure — keep the session with the default role.
    }

    const email = userEmail;
    const dbRole: SessionUser["role"] =
      userRecord?.role === "admin" ? "admin" : "user";

    // Determine demo status: DB flag OR email pattern match
    const isDemo = (userRecord?.is_demo as boolean) ?? isDemoEmail(email);

    return {
      uid: userId,
      email,
      emailVerified: emailConfirmedAt != null,
      // Source of truth is the users table; `resolveAdminAccess` additionally
      // grants admin in local development and for allowlisted owner emails.
      role: resolveAdminAccess(dbRole, email) ? "admin" : dbRole,
      isDemo,
    };
  } catch {
    return null; // invalid/expired/revoked cookie
  }
}

