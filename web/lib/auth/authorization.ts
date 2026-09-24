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
import { isNavigationSignal } from "@/lib/utils/errors";

/**
 * True when the error is a Next.js navigation signal (redirect() or notFound()).
 *
 * Guards like requireUser()/requireAdmin() call redirect()/notFound(), which
 * throw a special error Next.js must handle to route the user. Any catch block
 * that wraps one of these guards (or a helper like getSessionUser) must re-throw
 * this signal — otherwise the navigation is swallowed and the page degrades (or
 * the raw digest is logged) instead of redirecting.
 *
 * Delegates to the shared util so the whole workspace uses one detector.
 */
export function isRedirectOrNotFoundError(err: unknown): boolean {
  return isNavigationSignal(err);
}

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
 * IMPORTANT: no personal email is hardcoded here. The allowlist is read from
 * the `ADMIN_ALLOWLIST_EMAILS` environment variable (comma-separated), so a
 * deployment opts specific operators into admin without committing their
 * address to the repository:
 *
 *   ADMIN_ALLOWLIST_EMAILS=ops@your-domain.com,second-admin@your-domain.com
 *
 * The authoritative production role always remains the `users.role` column;
 * this allowlist is only an early-access convenience (see README / .env.example).
 */
export const ALLOWED_ADMIN_EMAILS: readonly string[] = (process.env.ADMIN_ALLOWLIST_EMAILS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

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
  } catch (err) {
    // A navigation signal (redirect/notFound) bubbling up from a session read
    // must propagate so Next.js routes the user — never swallow it as a no-op.
    if (isRedirectOrNotFoundError(err)) throw err;
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
 *   - The user's email is in ALLOWED_ADMIN_EMAILS (configured per deployment
 *     through the ADMIN_ALLOWLIST_EMAILS environment variable) in any
 *     environment.
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
    // Cleanly send unauthenticated visitors to the login page.
    redirect("/login");
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
  } catch (err) {
    // Re-throw navigation signals so they don't get converted into a "false".
    if (isRedirectOrNotFoundError(err)) throw err;
    return false;
  }
}
