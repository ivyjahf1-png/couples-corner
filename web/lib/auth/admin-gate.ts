import "server-only";

/**
 * Couples Corner — lightweight administrative gate.
 *
 * WHY THIS EXISTS: gating the admin surface on a `role = 'admin'` row in the
 * `users` table is correct but operationally heavy — it needs a promoted
 * account, a verified email, and a working Supabase config before anyone can
 * look at the moderation queue. This module provides the simpler gate the
 * product asked for: a single shared passphrase held in the environment, which
 * unlocks the admin surface for whoever types it.
 *
 * WHAT THIS IS *NOT*: a replacement for per-user roles. A shared passphrase
 * grants access to EVERY admin capability — including destructive actions like
 * deleting a member or publishing a broadcast — to anyone who holds it. There is
 * no per-person attribution and no way to revoke one operator without rotating
 * the secret for everyone. That is an accepted trade for now; the correct
 * long-term move is to reinstate per-user roles and keep this only as a
 * break-glass path. See the audit-actor note in lib/server/actor.ts.
 *
 * SECURITY PROPERTIES (all deliberate, none incidental):
 *
 *   • The secret comes from `ADMIN_PANEL_PASSWORD` — deliberately WITHOUT a
 *     `NEXT_PUBLIC_` prefix. A public prefix inlines the value into the client
 *     bundle, which would publish the admin password to every visitor.
 *   • Comparison is constant-time. A plain `===` leaks the secret one character
 *     at a time through response timing, against a value that is brute-forceable.
 *   • The unlock cookie is HMAC-signed, so it cannot be forged by setting an
 *     arbitrary value, and it is `httpOnly` so script cannot read or write it.
 *   • Failed attempts are rate-limited per client so the passphrase cannot be
 *     ground down by a script.
 */

import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Cookie carrying the signed unlock token. */
const ADMIN_GATE_COOKIE = "cc_admin_gate";

/** How long an unlock lasts. Short enough to be a session, not a keyring. */
const ADMIN_GATE_TTL_SECONDS = 60 * 60 * 8;

/** Failed attempts allowed per client before the gate locks. */
const MAX_ATTEMPTS = 8;
/** Lockout once the attempt budget is exhausted. */
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * In-memory attempt tracker, keyed by client address.
 *
 * Deliberately per-process rather than shared. A distributed store is the right
 * answer for a multi-instance deployment, and this is a real hardening gap there
 * (an attacker who can spread requests across instances gets a fresh budget on
 * each). On a single instance it does the job and adds no infrastructure.
 */
const attempts = new Map<string, { count: number; until: number }>();

/** Best-effort client address for rate limiting. */
async function resolveClientKey(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * The configured passphrase, or null when unset.
 *
 * Null is treated as DENY, never as "allow". A deployment that forgot the
 * variable must fail closed; defaulting open would turn a missing env var into
 * a public admin panel.
 */
function configuredPassword(): string | null {
  const value = process.env.ADMIN_PANEL_PASSWORD?.trim();
  return value ? value : null;
}

/** Signing key. Falls back to the passphrase so one variable is enough. */
function signingSecret(): string | null {
  return (
    process.env.ADMIN_PANEL_SECRET?.trim() ||
    process.env.ADMIN_PANEL_PASSWORD?.trim() ||
    null
  );
}

/**
 * Constant-time string comparison.
 *
 * Both sides are hashed first so the buffers are always the same length:
 * `timingSafeEqual` throws on a length mismatch, and checking lengths up front
 * would itself leak the secret's length.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cc-admin-compare").update(a).digest();
  const hb = createHmac("sha256", "cc-admin-compare").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** True when `ADMIN_PANEL_PASSWORD` is configured. Drives the UI's copy. */
export function isAdminGateConfigured(): boolean {
  return configuredPassword() !== null;
}

/**
 * Check a submitted passphrase.
 *
 * Returns a discriminated result rather than a bare boolean, because the three
 * failure modes need different UI: "wrong password" (retry), "too many
 * attempts" (stop) and "not configured" (an operator needs to fix the deploy,
 * which retrying cannot solve).
 */
export async function verifyAdminPassword(
  candidate: string
): Promise<{ ok: true } | { ok: false; reason: "unconfigured" | "locked" | "incorrect" }> {
  const expected = configuredPassword();
  if (!expected) return { ok: false, reason: "unconfigured" };

  const key = await resolveClientKey();
  const record = attempts.get(key);
  if (record && record.until > Date.now()) return { ok: false, reason: "locked" };

  if (safeEqual(candidate, expected)) {
    attempts.delete(key);
    return { ok: true };
  }

  // Failed: increment, and lock once the budget is spent.
  const next = (record?.count ?? 0) + 1;
  attempts.set(key, {
    count: next,
    until: next >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0,
  });
  return { ok: false, reason: "incorrect" };
}

/** Issue the signed, httpOnly unlock cookie. */
export async function grantAdminGate(): Promise<void> {
  const value = String(Date.now() + ADMIN_GATE_TTL_SECONDS * 1000);
  const token = sign(value);
  if (!token) return;
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_GATE_TTL_SECONDS,
    // Scoped to the admin tree: the unlock is useless anywhere else, and a
    // narrow path keeps it off every ordinary page request.
    path: "/admin",
  });
}

/** Remove the unlock cookie. */
export async function revokeAdminGate(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_GATE_COOKIE);
}

/**
 * Is the gate currently unlocked?
 *
 * Requires BOTH a valid signature and an unexpired timestamp, so a captured
 * cookie cannot be replayed indefinitely.
 */
export async function isAdminGateOpen(): Promise<boolean> {
  if (!isAdminGateConfigured()) return false;
  const cookieStore = await cookies();
  const value = verify(cookieStore.get(ADMIN_GATE_COOKIE)?.value);
  if (!value) return false;
  const expiry = Number(value);
  return Number.isFinite(expiry) && expiry > Date.now();
}

/**
 * Allow the request through, or render a 404.
 *
 * This is the authorization entry point the /admin PAGES use in place of the
 * `users.role = 'admin'` database check.
 *
 * WHY PAGES RE-CHECK AT ALL: the layout already hides its children while locked,
 * so a locked visitor only ever sees the unlock card. But a page that fetched
 * moderation data on the assumption that "the layout already checked" would be
 * relying on a fact that is not part of its own contract — and layout/page
 * rendering is not something to build a security boundary on. Each page asserts
 * the gate itself, so authorisation sits next to the data it protects.
 *
 * It throws `notFound()` rather than redirecting, matching the previous admin
 * behaviour: an unauthorised visitor should not learn that /admin exists as a
 * distinct destination. "No access" and "no such page" then look identical,
 * which is the point.
 *
 * THE DATABASE ROLE CHECK STILL EXISTS and still guards the server actions that
 * mutate data (`requireAdmin` in lib/auth/authorization.ts). This gate governs
 * access to the admin SURFACE; it deliberately does not weaken the checks on the
 * writes themselves.
 */
export async function requireAdminGate(): Promise<void> {
  if (!(await isAdminGateOpen())) notFound();
}



/** Sign a payload with the deployment secret, or null when unconfigured. */
function sign(value: string): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const mac = createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${mac}`;
}

/** Verify a token from `sign`, returning its payload when the MAC matches. */
function verify(token: string | undefined): string | null {
  if (!token) return null;
  const secret = signingSecret();
  if (!secret) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const value = token.slice(0, separator);
  const mac = token.slice(separator + 1);
  const expected = createHmac("sha256", secret).update(value).digest("hex");
  if (!safeEqual(mac, expected)) return null;
  return value;
}
