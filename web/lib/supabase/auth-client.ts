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
 * Get a fresh, valid access token for authenticated API calls.
 *
 * The browser client auto-refreshes via its stored refresh token, but the
 * httpOnly session cookie holds the access token from sign-in time and goes
 * stale after ~1h. Sending a fresh bearer token lets server routes
 * (e.g. photo upload) verify auth even when the cookie token expired.
 * Also re-syncs the cookie when a refresh produced a newer token.
 */
export async function getFreshAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();

  // Force a token refresh so we never ship an expired access token.
  // `getSession()` only returns the cached session — it does NOT trigger a
  // token refresh. The client's `autoRefreshToken` option refreshes on outbound
  // network calls through the client (e.g. `supabase.from().select()`), NOT on
  // `getSession()`. So we must explicitly refresh first to guarantee a fresh
  // access token, otherwise uploads fail with 401 after the ~1h access-token
  // lifetime even though the browser client still holds a valid session.
  //
  // `refreshSession()` uses the stored refresh token; if that has also expired
  // (e.g. the user hasn't used the app in 7+ days), it rejects — in that case
  // the user is genuinely signed out and must sign in again.
  try {
    await supabase.auth.refreshSession();
  } catch (err) {
    // Refresh failed: refresh token expired / network error / not signed in.
    // Fall back to the cached session so we can still surface a clear message
    // rather than a generic fetch failure.
    console.warn("[auth] refreshSession failed, using cached session if available:", err);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  try {
    await exchangeSessionCookie(session.access_token);
  } catch {
    // Cookie re-sync is best-effort — the bearer token itself still works.
  }
  return session.access_token;
}

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

  /* GUARD THE SESSION BEFORE THE EXCHANGE.

     `data.session` is null whenever the account exists but has NOT confirmed its
     email yet - a first sign-in on a fresh signup. The old line read
     `data.session.access_token` unguarded, so that case threw a raw
     `TypeError: Cannot read properties of null`, which is reported as a client
     crash rather than as "confirm your email". `exchangeSessionCookie` also
     validates now, but reaching it with a null token is a distinct, expected
     state that deserves its own message. */
  if (!data.session?.access_token) {
    throw new Error(
      "Your account is not confirmed yet. Please check your email for the confirmation link."
    );
  }

  await exchangeSessionCookie(data.session.access_token);
  return data.user;
}

/**
 * Register with email + password, then provision the user's account record.
 *
 * After Supabase Auth creates the auth user, we call POST /api/auth/register
 * to create the `users` and `profiles` rows server-side (via the service
 * role client, bypassing RLS). This ensures new users are discoverable by
 * default (`profiles.discoverable = true`, `users.status = 'active'`).
 *
 * NOTE: There is NO Postgres `handle_new_user` trigger in this codebase;
 * account provisioning is performed exclusively through this API route.
 * Omitting it leaves the user without a profile row, so they won't appear
 * in discovery.
 */
export async function registerAndProvision(
  email: string,
  password: string,
  displayName?: string,
  /**
   * Public invite code (NNXXXX) that referred this signup.
   *
   * The `/register` page form has always passed this. The signup wall's modal
   * path previously did NOT, so anyone who registered through the invite
   * funnel silently lost their attribution even though the code was sitting in
   * storage. Passed through to the provisioning route, which re-validates it
   * with `resolveUserCode` and drops bogus or self-referral codes.
   */
  inviteCode?: string
): Promise<User> {
  ensureSupabaseConfigured();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
      // Pass display_name in user_metadata so it can be propagated server-side.
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

  // Provision the user's account record (users + profiles tables) so they
  // appear in discovery with discoverable=true and status='active'.
  // Best-effort: we don't block sign-in if provisioning fails — the user
  // can still use auth, but may not appear in discovery until fixed.
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: session?.access_token,
        displayName: displayName?.trim() || undefined,
        inviteCode,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.warn("[auth] Profile provisioning failed:", res.status, errText);
    }
  } catch (provisionError) {
    // Network error or route unavailable — log and continue so the user
    // can still access the app.
    console.warn("[auth] Profile provisioning error:", provisionError);
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

/**
 * Exchange the current access token for an httpOnly session cookie (server trust).
 *
 * THE 401 BRANCH THIS FUNCTION USED TO BE MISSING.
 *
 * `/api/auth/session` answers a token GoTrue refused with `401` +
 * `code: "invalid_token"`, and a server fault with `500` + `code: "server_error"`.
 * The old branch chain handled 403, 400 and >=500 - but NOT 401. So the single most
 * common failure of this function fell straight through to the generic fallback,
 * which interpolated the route's raw internal label:
 *
 *     "Sign-in failed - Invalid session request. Please try again."
 *
 * That is the console error this function was reported for, and it was unhelpful
 * twice over: "Invalid session request" is an internal string rather than a
 * member-facing sentence, and "please try again" invites a retry at a request
 * that cannot succeed on a retry.
 *
 * WHY A 401 IS POSSIBLE AFTER A SUCCESSFUL `signInWithPassword`. The token the
 * browser holds and the token the server verifies must be issued by the SAME
 * Supabase project and signed by the same JWT secret. They diverge when the client
 * and server point at different projects, or when one side has a newer JWT secret.
 * In development the usual cause is a STALE `.next` build: Next inlines
 * `NEXT_PUBLIC_*` variables at build time, so a browser bundle built before the
 * env changed keeps talking to the old project while the server has moved.
 */
export async function exchangeSessionCookie(accessToken: string): Promise<void> {
  /* VALIDATE BEFORE THE ROUND TRIP.

     Callers have historically been trusted to hand us a real string, and being
     wrong costs a confusing 400 from the route that reads like a server fault.
     `signInWithPassword` can legitimately resolve with `session: null` when an
     account exists but has not confirmed its email, so a null token is an
     EXPECTED state rather than a programming error - it gets a named error the
     caller can act on, instead of an opaque HTTP round trip. */
  if (typeof accessToken !== "string" || accessToken.trim().length === 0) {
    console.error("[auth] exchangeSessionCookie called without an access token", {
      received: typeof accessToken,
    });
    throw new Error("Sign-in failed - no session was returned. Please sign in again.");
  }

  /* THE FETCH IS GUARDED.

     `fetch` rejects on a network drop, an offline device or a CORS failure, and
     an unguarded rejection escapes as a bare `TypeError: Failed to fetch` with no
     `[auth]` marker - which is how a client-side connectivity blip gets reported
     as a server-side session bug. It is converted here into a message that names
     the real cause. */
  let response: Response;
  try {
    response = await fetch("/api/auth/session", {
      method: "POST",
      /* `credentials: "same-origin"` is what lets the browser ACCEPT the
         Set-Cookie the route returns. Without it, fetch still completes 200
         but the cookie jar drops the Set-Cookie silently — sign-in looks
         successful and every subsequent navigation is signed out. Same-origin
         keeps the cookie first-party (path=/, SameSite=Lax from the server)
         so middleware sees it on the very next request. */
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
  } catch (networkError) {
    console.error("[auth] session cookie exchange could not reach the server", {
      message: networkError instanceof Error ? networkError.message : String(networkError),
    });
    throw new Error(
      "Couldn't reach the server to complete sign-in. Please check your connection and try again."
    );
  }

  if (response.ok) {
    /* VERIFY THE COOKIE ACTUALLY LANDED. A 200 means the server WROTE the
       Set-Cookie header, not that the browser STORED it — third-party-cookie
       blocking, a Secure mismatch, or a rejected domain silently drops it. A
       follow-up GET that requires the cookie confirms persistence; failure
       here is a graceful fallback (bearer session still works client-side),
       never a crash — the exact reason is logged for diagnosis. */
    try {
      const verify = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!verify.ok) {
        console.warn("[auth] session cookie exchange succeeded but cookie did not persist", {
          verifyStatus: verify.status,
        });
      }
    } catch (verifyError) {
      console.warn("[auth] session cookie persistence check failed (non-fatal)", {
        message: verifyError instanceof Error ? verifyError.message : String(verifyError),
      });
    }
    return;
  }

  /* READ THE STATUS CODE, NOT JUST THE BODY.

     A proxy or platform can produce a non-JSON body, and `response.status` is the
     one signal that survives that; `code` narrows it further when the route does
     answer with JSON. */
  let detail = "";
  let code = "";
  const status = response.status;
  try {
    const body = (await response.json()) as { error?: string; code?: string };
    detail = body.error ?? "";
    code = body.code ?? "";
  } catch {
    // Non-JSON body (proxy error page, platform 5xx). Status is all we have.
  }

  console.error("[auth] session cookie exchange failed", { status, code, detail });

  if (code === "account_inactive" || status === 403) {
    /* A deliberate policy decision, not a failure to retry: the password is
       correct and the account is suspended. The copy must not invite a retry. */
    throw new Error("This account is not active. Contact support for help.");
  }

  if (status === 401) {
    /* THE CASE THIS FUNCTION PREVIOUSLY FELL THROUGH. The token REACHED the
       server and was refused there, so it is not missing and not malformed in
       transit - this is a verification mismatch. The 400 branch's "malformed"
       copy would be wrong, and so would "try again": a retry re-sends the same
       unverifiable token. `detail` is deliberately NOT interpolated - the route's
       string is an internal label, not a sentence for a member. */
    throw new Error("Sign-in failed - your session could not be verified. Please sign in again.");
  }

  if (status === 400) {
    throw new Error("Sign-in failed - the session token was missing or malformed.");
  }

  if (status >= 500) {
    throw new Error(
      "Sign-in couldn't be completed because of a server error. Please try again shortly."
    );
  }

  throw new Error(detail ? `Sign-in failed - ${detail}.` : "Sign-in could not be completed.");
}