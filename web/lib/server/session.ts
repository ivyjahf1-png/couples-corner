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

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/authorization";

export const SESSION_COOKIE_NAME = "cc_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

/**
 * Exchange a Supabase access token for an httpOnly session cookie.
 * Rejects suspended/deactivated users before a cookie is ever issued.
 */
export async function createSessionFromIdToken(accessToken: string): Promise<void> {
  const supabase = getSupabaseServerClient();

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
      await supabase.auth.admin.signOut(cookie.value);
    } catch {
      // Cookie already invalid — clearing it is still correct.
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Resolve the current session server-side, or null when unauthenticated. */
export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie) return null;

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(cookie.value);
    if (error || !data.user) return null;

    // Get the user's role from the users table
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    return {
      uid: data.user.id,
      email: data.user.email ?? "",
      emailVerified: data.user.email_confirmed_at != null,
      // Role is read from the users table — the only sanctioned source of admin privilege.
      role: userRecord?.role === "admin" ? "admin" : "user",
    };
  } catch {
    return null; // invalid/expired/revoked cookie
  }
}

