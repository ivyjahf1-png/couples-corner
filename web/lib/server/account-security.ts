import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Couples Corner — account security service (SERVER ONLY).
 *
 * Password changes, two-factor (TOTP MFA) management, and active device
 * sessions. SECURITY BOUNDARY:
 * - Password changes first verify the caller's CURRENT password against
 *   Supabase Auth (`signInWithPassword`) — the new password is never applied
 *   without that identity check.
 * - MFA calls go straight to the Supabase Auth (GoTrue) REST API carrying the
 *   caller's own access token (from the httpOnly session cookie), so a user
 *   can only ever enroll/verify/unenroll factors on their own account.
 * - Session rows store a sha256 hash of the access token — never the raw
 *   token — and every query is scoped to the session's user id.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** sha256 of an access token — the only thing stored server-side. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

/** Change the signed-in user's password after verifying the current one. */
export async function changePassword(input: {
  uid: string;
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const admin = getSupabaseServerClient();
  if (!admin || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured");
  }

  // Identity check: verify the current password with a throwaway client so the
  // admin client's in-memory state is never touched by a login.
  const verifyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email: input.email,
    password: input.currentPassword,
  });
  if (verifyError) {
    throw new Error("Your current password is incorrect.");
  }

  const { error } = await admin.auth.admin.updateUserById(input.uid, {
    password: input.newPassword,
  });
  if (error) {
    throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Two-factor authentication (TOTP MFA) — Supabase Auth REST
// ---------------------------------------------------------------------------

export interface MfaFactor {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
  createdAt?: string;
  lastChallengedAt?: string | null;
}

export interface MfaEnrollment {
  factorId: string;
  challengeId: string;
  /** SVG data-URI QR code for the authenticator app. */
  qrCode: string;
  /** Manual-entry secret for users who can't scan the QR. */
  secret: string;
}

/** Auth REST helper carrying the caller's own access token. */
async function authRest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured");
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (json.msg as string) ??
      (json.error_description as string) ??
      (json.message as string) ??
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

/** List the caller's TOTP factors (read state for the 2FA toggle). */
export async function listMfaFactors(token: string): Promise<MfaFactor[]> {
  const user = await authRest<{ factors?: Array<Record<string, unknown>> }>("user", token);
  return (user.factors ?? [])
    .filter((f) => f.factor_type === "totp")
    .map((f) => ({
      id: f.id as string,
      friendlyName: (f.friendly_name as string) ?? null,
      status: (f.status as MfaFactor["status"]) ?? "unverified",
      createdAt: f.created_at as string | undefined,
      lastChallengedAt: (f.last_challenged_at as string) ?? null,
    }));
}

/** Begin TOTP enrollment: returns the QR code + secret, and opens a challenge. */
export async function enrollMfaTotp(token: string, friendlyName: string): Promise<MfaEnrollment> {
  const enrolled = await authRest<{
    id: string;
    totp?: { qr_code?: string; secret?: string };
  }>("mfa/enroll", token, {
    method: "POST",
    body: JSON.stringify({ factor_type: "totp", friendly_name: friendlyName }),
  });
  const factorId = enrolled.id;
  if (!factorId || !enrolled.totp?.qr_code) {
    throw new Error(
      "Two-factor authentication is not available. Enable TOTP MFA in Supabase Auth settings (Authentication → MFA) first."
    );
  }
  const challenged = await authRest<{ id: string }>("mfa/challenge", token, {
    method: "POST",
    body: JSON.stringify({ factor_id: factorId }),
  });
  return {
    factorId,
    challengeId: challenged.id,
    qrCode: enrolled.totp.qr_code,
    secret: enrolled.totp.secret ?? "",
  };
}

/**
 * Verify a TOTP code to finish enrollment. GoTrue issues a refreshed access
 * token on success — the caller should update the session cookie with it.
 */
export async function verifyMfaEnrollment(
  token: string,
  factorId: string,
  challengeId: string,
  code: string
): Promise<{ newAccessToken: string | null }> {
  const verified = await authRest<{ access_token?: string }>("mfa/verify", token, {
    method: "POST",
    body: JSON.stringify({ factor_id: factorId, challenge_id: challengeId, code }),
  });
  return { newAccessToken: verified.access_token ?? null };
}

/** Remove a factor (turn 2FA off). */
export async function unenrollMfa(token: string, factorId: string): Promise<void> {
  await authRest("mfa/unenroll", token, {
    method: "POST",
    body: JSON.stringify({ factor_id: factorId }),
  });
}

// ---------------------------------------------------------------------------
// Active device sessions
// ---------------------------------------------------------------------------

export interface SecuritySession {
  id: string;
  /** e.g. "Chrome on Windows" */
  device: string;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
  revoked: boolean;
}

export interface SessionRequestMeta {
  userAgent: string | null;
  ip: string | null;
}

/** Human-readable label from a raw User-Agent string. */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\/|Opera/.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /Android/.test(userAgent)
      ? "Android"
      : /iPhone|iPad|iPod/.test(userAgent)
        ? "iOS"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /CrOS/.test(userAgent)
            ? "ChromeOS"
            : /Linux/.test(userAgent)
              ? "Linux"
              : "Unknown OS";
  return `${browser} on ${os}`;
}

/**
 * Register the session row for a freshly validated token (idempotent — legacy
 * tokens get a row lazily on first sight) and refresh last_seen. Rows that
 * exist but are revoked stay revoked (that device is signed out).
 */
export async function registerOrTouchSession(
  userId: string,
  token: string,
  meta: SessionRequestMeta
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("user_sessions")
    .select("id, revoked_at")
    .eq("user_id", userId)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!existing) {
    try {
      await supabase.from("user_sessions").insert({
        user_id: userId,
        token_hash: tokenHash,
        user_agent: meta.userAgent,
        ip_address: meta.ip,
        device_label: describeUserAgent(meta.userAgent),
        created_at: now,
        last_seen_at: now,
      });
    } catch {
      // Unique-violation race (two first requests in parallel) — the row
      // exists either way, so registration is still complete.
    }
    return;
  }

  const row = existing as { id: string; revoked_at: string | null };
  if (!row.revoked_at) {
    await supabase.from("user_sessions").update({ last_seen_at: now }).eq("id", row.id);
  }
}

/** True when the given token's session row has been revoked. */
export async function isSessionRevoked(userId: string, token: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("user_sessions")
    .select("revoked_at")
    .eq("user_id", userId)
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return Boolean((data as { revoked_at?: string | null } | null)?.revoked_at);
}

/** List the user's device sessions (newest activity first). */
export async function listUserSessions(
  userId: string,
  currentToken: string
): Promise<SecuritySession[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const currentHash = hashToken(currentToken);
  const { data: rows } = await supabase
    .from("user_sessions")
    .select(
      "id, token_hash, user_agent, ip_address, device_label, created_at, last_seen_at, revoked_at"
    )
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .limit(20);

  const typed = (rows ?? []) as unknown as Array<{
    id: string;
    token_hash: string;
    user_agent: string | null;
    ip_address: string | null;
    device_label: string | null;
    created_at: string;
    last_seen_at: string;
    revoked_at: string | null;
  }>;

  return typed.map((row) => ({
    id: row.id,
    device: row.device_label || describeUserAgent(row.user_agent),
    ip: row.ip_address,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    isCurrent: row.token_hash === currentHash,
    revoked: Boolean(row.revoked_at),
  }));
}

/** Revoke one session row ("sign out" a device). */
export async function revokeUserSession(userId: string, sessionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  await supabase
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId);
}

/** Revoke every session except the current device. Returns how many. */
export async function revokeAllOtherSessions(
  userId: string,
  currentToken: string
): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const currentHash = hashToken(currentToken);
  const { data } = await supabase
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .neq("token_hash", currentHash)
    .is("revoked_at", null)
    .select("id");
  return (data as unknown as { id: string }[] | null)?.length ?? 0;
}
