/**
 * Couples Corner — server-side session handling.
 *
 * SECURITY BOUNDARY
 * -----------------
 * Sessions are httpOnly cookies created from a Supabase session.
 * The server verifies the session with the Supabase server client.
 * Role (`user` | `admin`) comes exclusively from the user's app_metadata
 * or a custom `role` field in the users table — never from a client-supplied
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

  // Set the session cookie with the access token
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
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
        cookieStore.set(SESSION_COOKIE_NAME, validToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: SESSION_TTL_SECONDS,
          path: "/",
        });
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

    // Get the user's role and demo flag from the users table
    const { data: userRecord } = await supabase
      .from("users")
      .select("role, is_demo")
      .eq("id", userId)
      .single();

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

