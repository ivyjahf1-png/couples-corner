/**
 * Couples Corner — server-side session handling.
 *
 * SECURITY BOUNDARY
 * - Sessions are httpOnly cookies created from a Supabase session.
 * - The server verifies the session with the Supabase server client.
 * - Role (user | admin) comes exclusively from the users table — never from a client-supplied value.
 */

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAdminAccess, type SessionUser } from "@/lib/auth/authorization";
import { isDemoEmail } from "@/lib/auth/demo-guard";

export const SESSION_COOKIE_NAME = "couples_corner_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

/** Exchange a Supabase access token for an httpOnly session cookie. */
export async function createSessionFromIdToken(accessToken: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error("Invalid session token");
  }
  const { data: userRecord } = await supabase
    .from("users")
    .select("status, role")
    .eq("id", data.user.id)
    .single();
  const status = userRecord?.status ?? "active";
  if (status !== "active") {
    throw new Error("Account is not active");
  }
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

  const authHeaderToken =
    bearerToken?.startsWith("Bearer ") ? bearerToken.slice(7) : bearerToken;
  const candidates = [cookie?.value, authHeaderToken].filter(Boolean) as string[];
  if (candidates.length === 0) return null;

  let supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  try {
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
        // Cookie refresh is best-effort.
      }
    }

    const { data: userRecord } = await supabase
      .from("users")
      .select("role, is_demo")
      .eq("id", userId)
      .single();

    const email = userEmail;
    const dbRole: SessionUser["role"] =
      userRecord?.role === "admin" ? "admin" : "user";

    const isDemo = (userRecord?.is_demo as boolean) ?? isDemoEmail(email);

    return {
      uid: userId,
      email,
      emailVerified: emailConfirmedAt != null,
      role: resolveAdminAccess(dbRole, email) ? "admin" : dbRole,
      isDemo,
    };
  } catch {
    return null;
  }
}
