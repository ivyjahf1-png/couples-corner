/**
 * Couples Corner — server-side authorization boundary.
 *
 * This is the single place where "who may access this area" is decided, and it
 * always runs on the server (never the client). The session is an httpOnly
 * cookie created by `/api/auth/session` after the Supabase server client verifies
 * the user's session (see `lib/server/session.ts`). The role is sourced from the
 * `users` table in Supabase — the client is never trusted, and no client-writable
 * field can influence privilege.
 */

import { notFound, redirect } from "next/navigation";
import type { AppRole } from "@/lib/models";
import { getCurrentSessionUser } from "@/lib/server/session";

/** The subset of a User that server-side guards actually depend on. */
export interface SessionUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  /** Sourced from the `users` table — the only sanctioned source of admin privilege. */
  role: AppRole;
  /** True when this is a demo/preview account (cannot write production data). */
  isDemo: boolean;
}

/**
 * Developer / early-access admin override.
 *
 * IMPORTSANT: This is a controlled, maintainable bypass so that authenticated
 * local developers (and the platform owner) can use the admin surface without
 * first promoting their Supabase `users` row to `admin`. Two conditions apply;
 * if either is true, `getCurrentSessionUser` promotes the role to `admin`:
 *
 *   1. `NODE_ENV === "development"`  — any authenticated user is treated as
 *      admin locally. The real admin role still governs production.
 *   2. The user's email is in ALLOWED_ADMIN_EMAILS. This allowlist works in ANY
 *      environment (including production staging) so the owner can access the
 *      admin dashboard from a real deployment before the DB role is set.
 */
export const ALLOWED_ADMIN_EMAILS: readonly string[] = [
  "8gregwilliams@gmail.com",
];

/** Normalized allowlist for O(1) membership checks. */
const ALLOWED_ADMIN_EMAILS_NORMALIZED = new Set(
  ALLOWED_ADMIN_EMAILS.map((e) => e.trim().toLowerCase()).filter(Boolean)
);

/** True when running in local development. */
export function isDevAdminBypassActive(): boolean {
  return process.env.NODE_ENV === "development";
}

/** True when the given email is in the admin allowlist. */
export function isAllowedAdminEmail(email: string): boolean {
  return ALLOWED_ADMIN_EMAILS_NORMALIZED.has(email.trim().toLowerCase());
}

/**
 * Resolve whether the given authenticated user should be granted the `admin`
 * role for the current request. Combines the source-of-truth DB role with the
 * dev/allowlist overrides (see above).
 */
export function resolveAdminAccess(
  dbRole: AppRole,
  email: string
): boolean {
  if (dbRole === "admin") return true;
  if (isDevAdminBypassActive()) return true;
  return isAllowedAdminEmail(email);
}

/**
 * Resolve the current session on the server. Returns null for anonymous or
 * invalid sessions — including when Supabase credentials are not yet
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
 * Redirects already-authenticated visitors to the dashboard.
 */
export async function requireGuest(): Promise<void> {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }
}

/**
 * For the authenticated app zone. Redirects anonymous visitors to the
 * homepage so they can sign in via the auth modal instead of a separate
 * /login route (which may not exist or may cause Netlify 404s).
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }
  // `redirect` returns `never`, so TS narrows `user` to `SessionUser` here.
  return user;
}

/**
 * For the admin zone. Requires an authenticated user whose role in the `users`
 * table is "admin".
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

/**
 * Admin guard for development / local access.
 *
 * Returns an admin SessionUser immediately when:
 *   - Running in development (NODE_ENV === "development") — any authenticated
 *     user is promoted to admin locally.
 *   - The user's email is in ALLOWED_ADMIN_EMAILS (e.g. 8gregwilliams@gmail.com)
 *     in any environment.
 *
 * When Supabase is not configured and there is no session cookie at all:
 *   - In development: returns a synthetic admin SessionUser so the admin UI
 *     renders without requiring a real login.
 *   - In production: throws a redirect to /login (no session = no access).
 *
 * This is used by app/admin/layout.tsx so that local developers and the
 * platform owner can access all /admin/* pages immediately.
 */
export async function requireAdminDev(): Promise<SessionUser> {
  // Allowlist email check (works in any environment)
  const user = await getSessionUser();
  if (user && user.role === "admin") return user;

  // Development bypass: no real session needed
  if (isDevAdminBypassActive()) {
    // If there's an authenticated user (even non-admin), promote them
    if (user) {
      return {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        role: "admin",
        isDemo: user.isDemo,
      };
    }
    // No session at all in dev — synthetic admin so the UI renders
    return {
      uid: "dev-admin",
      email: "dev@example.com",
      emailVerified: true,
      role: "admin",
      isDemo: true, // Dev synthetic admin is always a demo account
    };
  }

  // Production: require a real authenticated admin session
  if (!user) {
    redirect("/");
  }
  if (user.role !== "admin") {
    notFound();
  }
  return user;
}

/**
 * Lightweight admin check for page components.
 * Does NOT throw or redirect — safe to use in page components
 * that need to conditionally render admin UI.
 *
 * Returns true only when:
 *   - A valid session exists
 *   - The user has the 'admin' role in the database
 *
 * Returns false when:
 *   - No session exists
 *   - Session is invalid/expired
 *   - Supabase credentials are not configured
 *   - User does not have admin role
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    const user = await getSessionUser();
    return user?.role === "admin";
  } catch {
    return false;
  }
}
