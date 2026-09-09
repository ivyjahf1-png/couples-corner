/**
 * Couples Corner — server-side session handling.
 *
 * SECURITY BOUNDARY
 * -----------------
 * Sessions are httpOnly cookies created from a Firebase ID token that the
 * server verifies with the Admin SDK. The ID token never remains in client
 * JS after the exchange, and every guard/server-side read re-verifies the
 * cookie. Role (`user` | `admin`) comes exclusively from Auth **custom
 * claims** embedded in the verified token — never from a client-supplied
 * value and never from a writable Firestore field.
 */

import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { adminRefs } from "@/lib/firebase/collections";
import type { SessionUser } from "@/lib/auth/authorization";

export const SESSION_COOKIE_NAME = "cc_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

/**
 * Exchange a verified ID token for an httpOnly session cookie.
 * Rejects suspended/deactivated users before a cookie is ever issued.
 */
export async function createSessionFromIdToken(idToken: string): Promise<void> {
  const auth = getAdminAuth();

  // `checkRevoked: true` rejects tokens from signed-out/revoked sessions.
  const decoded = await auth.verifyIdToken(idToken, true);

  const userSnap = await adminRefs(getAdminFirestore()).users.doc(decoded.uid).get();
  const status = (userSnap.data() as { status?: string } | undefined)?.status ?? "active";
  if (status !== "active") {
    throw new Error("Account is not active");
  }

  const sessionCookie = await auth.createSessionCookie(idToken, {
    // Admin SDK expects milliseconds (`expiresIn`), max 14 days.
    expiresIn: SESSION_TTL_SECONDS * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

/** Clear the session cookie and revoke the user's refresh tokens. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (cookie) {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(cookie.value);
      await getAdminAuth().revokeRefreshTokens(decoded.sub);
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
    const decoded: DecodedIdToken = await getAdminAuth().verifySessionCookie(
      cookie.value,
      true // checkRevoked
    );
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      emailVerified: decoded.email_verified === true,
      // Role is read from the VERIFIED token's custom claims — the only
      // sanctioned source of admin privilege.
      role: decoded.admin === true ? "admin" : "user",
    };
  } catch {
    return null; // invalid/expired/revoked cookie
  }
}
