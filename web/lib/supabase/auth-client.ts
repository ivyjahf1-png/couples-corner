/**
 * Couples Corner — client-side authentication helpers.
 *
 * Thin wrappers around Supabase Auth for the browser. The returned access token
 * must be exchanged for an httpOnly session cookie via POST /api/auth/session
 * before any server-side surface treats the user as signed in (see
 * `lib/server/session.ts`). Passwordless email-link sign-in is included per
 * the approved architecture; enable the "Email link" provider in Supabase
 * Console before using it.
 */

import { getSupabaseClient } from "./client";
import type { User, AuthError } from "@supabase/supabase-js";

/** Register with email + password, then trigger the verification email. */
export async function registerWithEmail(
  email: string,
  password: string
): Promise<User> {
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

/** Register, provision the user record, and start a session. */
export async function registerAndProvision(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const user = await registerWithEmail(email, password);
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: session?.access_token, displayName }),
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
      detail === "Could not create your account record"
        ? "Your account was created, but setting it up failed. Please try signing in."
        : "Registration failed. Please check your connection and try again."
    );
  }
  await exchangeSessionCookie(session?.access_token ?? "");
  return user;
}

/** Send a passwordless sign-in link to the given email. */
export async function sendEmailSignInLink(email: string): Promise<void> {
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
  const supabase = getSupabaseClient();
  // Supabase handles the URL hash automatically when signInWithOtp is called
  // For email link completion, we verify the token from the URL
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
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/forgot-password`,
  });
  if (error) throw error;
}

/** Re-send the email-verification message to the currently signed-in user. */
export async function resendEmailVerification(): Promise<void> {
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
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  await fetch("/api/auth/logout", { method: "POST" });
}

/** Subscribe to auth state (UI convenience only — never authorize on this). */
export function observeAuthState(callback: (user: User | null) => void): () => void {
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
