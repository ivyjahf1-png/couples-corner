/**
 * Couples Corner — server-side authorization boundary.
 *
 * This is the single place where "who may access this area" is decided, and it
 * always runs on the server (never the client). The session is an httpOnly
 * cookie created by `/api/auth/session` after the Admin SDK verifies a Firebase
 * ID token (see `lib/server/session.ts`). The role is sourced from Auth custom
 * claims embedded in the verified cookie — the client is never trusted, and no
 * client-writable Firestore field can influence privilege.
 */

import { notFound, redirect } from "next/navigation";
import type { AppRole } from "@/lib/models";
import { getCurrentSessionUser } from "@/lib/server/session";

/** The subset of a User that server-side guards actually depend on. */
export interface SessionUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  /** Mirrored from Auth custom claims; authoritative server-side. */
  role: AppRole;
}

/**
 * Resolve the current session on the server. Returns null for anonymous or
 * invalid sessions — including when Firebase Admin credentials are not yet
 * configured (fail-closed: nothing private is ever served by accident).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    return await getCurrentSessionUser();
  } catch {
    return null;
  }
}

/**
 * For zones that must only be seen when signed OUT (public marketing + auth).
 * Redirects already-authenticated visitors back into the app.
 */
export async function requireGuest(): Promise<void> {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }
}

/**
 * For the authenticated app zone. Redirects anonymous visitors to sign in so
 * that no private app UI or data is rendered.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  // `redirect` returns `never`, so TS narrows `user` to `SessionUser` here.
  return user;
}

/**
 * For the admin zone. Requires an authenticated user whose **custom claim**
 * role is "admin".
 *
 * Non-admins are served a 404 (anti-enumeration, so the admin surface isn't
 * revealed). Every admin action must also be recorded via ModerationAction /
 * auditLogs before it is implemented.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    notFound();
  }
  return user;
}
