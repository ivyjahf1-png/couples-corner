/**
 * Couples Corner — client-side authentication helpers.
 *
 * Thin wrappers around Supabase Auth for the browser. The returned access token
 * must be exchanged for an httpOnly session cookie via POST /api/auth/session
 * before any server-side surface treats the user as signed in (see
 * `lib/server/session.ts`). Passwordless email-link sign-in is included per
 * the approved architecture; enable the "Email link" provider in Supabase
 * Console before using it.
 *
 * IMPORTANT: All functions check Supabase configuration before making network
 * calls. If NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are
 * missing, functions throw descriptive errors instead of generic "Failed to
 * fetch" TypeErrors from the browser's fetch API.
 */

import { getSupabaseClient, validateSupabaseConfig, isSupabaseConfigured } from "./client";
import type { User, AuthError } from "@supabase/supabase-js";

/**
 * Check if Supabase is properly configured and throw a helpful error if not.
 *
 * This prevents generic "Failed to fetch" errors by failing fast with a
 * clear message about what's missing.
 */
function ensureSupabaseConfigured(): void {
  const error = validateSupabaseConfig();
  if (error) {
    throw new Error(
      error + ". Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file."
    );
  }
}

/** Register with email + password, then trigger the verification email. */
export async function registerWithEmail(
  email: string,
  password: string
): Promise<User> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Registration failed");
  return data.user;
}

/** Sign in with email + password and exchange the token for a session cookie. */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Sign-in failed");
  await exchangeSessionCookie(data.session.access_token);
  return data.user;
}

/**
 * Register with email + password. The Postgres trigger `handle_new_user`
 * automatically creates the profile row in `public.users` — no separate
 * client-side insert required, so RLS permission failures are avoided.
 */
export async function registerAndProvision(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
      // Pass display_name in user_metadata so the trigger can populate the
      // public.users row automatically.
      data: displayName != null ? { display_name: displayName } : undefined,
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Registration failed");

  // Exchange the access token for an httpOnly session cookie so the server
  // treats the user as signed in.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    await exchangeSessionCookie(session.access_token);
  }
  return data.user;
}

/** Send a passwordless sign-in link to the given email. */
export async function sendEmailSignInLink(email: string): Promise<void> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

/** Complete a passwordless sign-in from the email link, then start a session. */
export async function completeEmailSignInLink(email: string): Promise<User | null> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) return null;

  await exchangeSessionCookie(session.access_token);
  return session.user;
}

/** Send a password-reset email. */
export async function requestPasswordReset(email: string): Promise<void> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/forgot-password`,
  });
  if (error) throw error;
}

/** Re-send the email-verification message to the currently signed-in user. */
export async function resendEmailVerification(): Promise<void> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to resend the verification email.");

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email!,
  });
  if (error) throw error;
}

/** Sign out everywhere: Supabase session, cookie. */
export async function signOutEverywhere(): Promise<void> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  await fetch("/api/auth/logout", { method: "POST" });
}

/** Subscribe to auth state (UI convenience only — never authorize on this). */
export function observeAuthState(callback: (user: User | null) => void): () => void {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

/** Exchange the current access token for an httpOnly session cookie (server trust). */
export async function exchangeSessionCookie(accessToken: string): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      detail = body.error ?? "";
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(
      detail === "Invalid session request"
        ? "Sign-in failed — the server couldn't verify your session. Please try again."
        : "Sign-in could not be completed. Please check your connection and try again."
    );
  }
}