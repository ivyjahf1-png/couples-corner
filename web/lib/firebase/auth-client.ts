/**
 * Couples Corner — client-side authentication helpers.
 *
 * Thin wrappers around Firebase Auth for the browser. The returned ID token
 * must be exchanged for an httpOnly session cookie via POST /api/auth/session
 * before any server-side surface treats the user as signed in (see
 * `lib/server/session.ts`). Passwordless email-link sign-in is included per
 * the approved architecture; enable the "Email link" provider in Firebase
 * Console before using it.
 */

import {
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

/** Register with email + password, then trigger the verification email. */
export async function registerWithEmail(
  email: string,
  password: string
): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  return credential.user;
}

/** Sign in with email + password and exchange the token for a session cookie. */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await exchangeSessionCookie(credential.user);
  return credential.user;
}

/** Register, provision the Firestore user record, and start a session. */
export async function registerAndProvision(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const user = await registerWithEmail(email, password);
  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, displayName }),
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
  await exchangeSessionCookie(user);
  return user;
}

/** Send a passwordless sign-in link to the given email. */
export async function sendEmailSignInLink(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/verify-email`,
    handleCodeInApp: true,
  });
}

/** Complete a passwordless sign-in from the email link, then start a session. */
export async function completeEmailSignInLink(email: string): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!isSignInWithEmailLink(auth, window.location.href)) return null;
  const credential = await signInWithEmailLink(auth, email, window.location.href);
  await exchangeSessionCookie(credential.user);
  return credential.user;
}

/** Send a password-reset email. */
export function requestPasswordReset(email: string): Promise<void> {
  return sendPasswordResetEmail(getFirebaseAuth(), email);
}

/** Re-send the email-verification message to the currently signed-in user. */
export async function resendEmailVerification(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("You need to be signed in to resend the verification email.");
  await sendEmailVerification(user);
}

/** Sign out everywhere: Firebase session, cookie, and revoked refresh tokens. */
export async function signOutEverywhere(): Promise<void> {
  await signOut(getFirebaseAuth());
  await fetch("/api/auth/logout", { method: "POST" });
}

/** Subscribe to auth state (UI convenience only — never authorize on this). */
export function observeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/** Exchange the current ID token for an httpOnly session cookie (server trust). */
export async function exchangeSessionCookie(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
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
