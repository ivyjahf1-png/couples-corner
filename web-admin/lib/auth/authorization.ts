/**
 * Couples Corner — server-side authorization boundary.
 *
 * This is the single place where "who may access this area" is decided, and it
 * always runs on the server (never the client).
 */

import { notFound, redirect } from "next/navigation";
import type { AppRole } from "@/lib/models";
import { getCurrentSessionUser } from "@/lib/server/session";
import { isNavigationSignal, rethrowIfNavigation } from "@/lib/utils/errors";

/**
 * True when the error is a Next.js navigation signal (redirect() or notFound()).
 *
 * Server actions and pages may call requireAdmin()/requireUser() which invoke
 * redirect()/notFound(). Those throw a special error that Next.js must handle
 * to route the user correctly. A bare catch (e.g. "Failed to load users") would
 * swallow it and render an empty page instead of navigating — this helper lets
 * callers re-throw the navigation signal while still degrading gracefully on
 * genuine failures.
 *
 * Delegates to the shared util so the whole workspace uses one detector.
 */
export function isNavigationError(err: unknown): boolean {
  return isNavigationSignal(err);
}

/** The subset of a User that server-side guards actually depend on. */
export interface SessionUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  role: AppRole;
  isDemo: boolean;
}

/**
 * Developer / early-access admin override.
 *
 * No personal email is hardcoded. The allowlist is read from the
 * `ADMIN_ALLOWLIST_EMAILS` environment variable (comma-separated); the
 * authoritative production role remains the `users.role` column.
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

/** Resolve whether the given authenticated user should be granted the `admin` role. */
export function resolveAdminAccess(dbRole: AppRole, email: string): boolean {
  if (dbRole === "admin") return true;
  if (isDevAdminBypassActive()) return true;
  return isAllowedAdminEmail(email);
}

/** Resolve the current session on the server. Returns null for anonymous or invalid sessions. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    return await getCurrentSessionUser();
  } catch (err) {
    // A navigation signal (redirect/notFound) must propagate so Next.js routes
    // the user — never swallow it as a no-op.
    rethrowIfNavigation(err);
    return null;
  }
}

/** For zones that must only be seen when signed OUT. */
export async function requireGuest(): Promise<void> {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }
}

/** For the authenticated app zone. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }
  return user;
}

/** For the admin zone. Requires an authenticated user whose role is "admin". */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    notFound();
  }
  return user;
}

/** Admin guard for development / local access. */
export async function requireAdminDev(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user && user.role === "admin") return user;

  if (isDevAdminBypassActive()) {
    if (user) {
      return {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        role: "admin",
        isDemo: user.isDemo,
      };
    }
    return {
      uid: "dev-admin",
      email: "dev@example.com",
      emailVerified: true,
      role: "admin",
      isDemo: true,
    };
  }

  if (!user) {
    redirect("/");
  }
  if (user.role !== "admin") {
    notFound();
  }
  return user;
}

/** Lightweight admin check for page components. */
export async function isAdminUser(): Promise<boolean> {
  try {
    const user = await getSessionUser();
    return user?.role === "admin";
  } catch (err) {
    // Re-throw navigation signals so they don't get converted into a "false".
    rethrowIfNavigation(err);
    return false;
  }
}
