import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EntityId } from "@/lib/models/common";

/**
 * Couples Corner — admin-side security service (SERVER ONLY).
 *
 * Lets an administrator inspect and manage another user's security state:
 *   - password resets (force-set, email the user a reset link, or set a temp)
 *   - MFA factors (list / unenroll a verified TOTP factor)
 *   - active device sessions (list / revoke)
 *
 * SECURITY BOUNDARY:
 *   - All writes go through the Supabase service-role client (bypasses RLS).
 *   - Callers are verified as admin via `requireAdmin()` in the action layer.
 *   - Every action records an audit entry.
 */

/** View model for MFA factors owned by a target user. */
export interface UserMfaFactor {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
  createdAt: string;
  lastChallengedAt: string | null;
}

/** View model for a target user's active device sessions. */
export interface UserSession {
  id: string;
  device: string;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  revoked: boolean;
  isCurrent: boolean;
  userAgent: string | null;
}

/**
 * List all MFA factors for a target user (via Auth Admin API).
 */
export async function listUserMfaFactors(targetUid: string): Promise<UserMfaFactor[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.auth.admin.mfa.listFactors({
    userId: targetUid,
  });

  if (error) {
    console.error(`[security] Failed to list MFA factors for ${targetUid}:`, error.message);
    return [];
  }

  const factors = (data?.factors ?? []) as Array<Record<string, unknown>>;
  return factors.map((f) => ({
    id: String(f.id ?? ""),
    friendlyName: (f.friendly_name as string) ?? null,
    status: f.status === "verified" ? "verified" : "unverified",
    createdAt: (f.created_at as string) ?? new Date().toISOString(),
    lastChallengedAt: (f.last_challenged_at as string | null) ?? null,
  }));
}

/** Unenroll (delete) a single MFA factor for a target user. */
export async function unenrollUserMfaFactor(targetUid: string, factorId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.auth.admin.mfa.deleteFactor({
    userId: targetUid,
    id: factorId,
  });

  if (error) throw new Error(error.message);
}


/** List active sessions for a target user. */
export async function listUserSessions(targetUid: string): Promise<UserSession[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("user_sessions")
    .select("id, token_hash, user_agent, ip_address, device_label, created_at, last_seen_at, revoked_at")
    .eq("user_id", targetUid)
    .order("last_seen_at", { ascending: false })
    .limit(50);

  if (error || !rows) return [];

  const typed = rows as unknown as Array<{
    id: string;
    token_hash: string;
    user_agent: string | null;
    ip_address: string | null;
    device_label: string | null;
    created_at: string;
    last_seen_at: string;
    revoked_at: string | null;
  }>;

  function describeDevice(ua: string | null, label: string | null): string {
    if (label) return label;
    if (!ua) return "Unknown device";
    if (/mobile|android|iphone/i.test(ua)) return "Mobile device";
    if (/tablet|ipad/i.test(ua)) return "Tablet";
    return "Desktop";
  }

  return typed.map((row) => ({
    id: row.id,
    device: describeDevice(row.user_agent, row.device_label),
    ip: row.ip_address,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    revoked: Boolean(row.revoked_at),
    isCurrent: false,
    userAgent: row.user_agent,
  }));
}

/** Revoke a single device session for a target user. */
export async function revokeUserSession(targetUid: string, sessionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", targetUid);

  if (error) throw new Error(error.message);
}

/** Revoke all sessions for a target user except optionally one. */
export async function revokeAllUserSessions(
  targetUid: string,
  keepSessionId: string | null = null
): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");

  let query = supabase
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", targetUid)
    .is("revoked_at", null);

  if (keepSessionId) {
    query = query.neq("id", keepSessionId);
  }

  const { data, error } = await query.select("id");

  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

/** Send a password reset email to the target user. */
export async function sendPasswordResetEmail(targetUid: string, targetEmail: string): Promise<void> {
  void targetUid;
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: "/",
  });

  if (error) throw new Error(error.message);
}

/** Update a user's password directly (admin-initiated, no verification). */
export async function adminUpdatePassword(
  targetUid: string,
  newPassword: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.auth.admin.updateUserById(targetUid, {
    password: newPassword,
  });

  if (error) throw new Error(error.message);
}

/** List users with blocked accounts (suspended) for the security panel. */
export async function listBlockedUsers(): Promise<Array<{
  uid: EntityId;
  email: string;
  displayName: string | null;
  status: string;
  createdAt: string;
}>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("users")
    .select("id, email, display_name, status, created_at")
    .eq("status", "suspended")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((u) => ({
    uid: String(u.id),
    email: String(u.email ?? ""),
    displayName: (u.display_name as string) ?? null,
    status: String(u.status ?? "unknown"),
    createdAt: String(u.created_at ?? new Date().toISOString()),
  }));
}

/** Unblock (reactivate) a user account. */
export async function unblockUser(targetUid: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({ status: "active", updated_at: now })
    .eq("id", targetUid);

  if (error) throw new Error(error.message);
}
