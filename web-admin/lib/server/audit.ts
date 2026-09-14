import "server-only";

/**
 * Couples Corner — audit logging for sensitive server-side operations.
 *
 * SECURITY BOUNDARY: writes only through the Supabase server client;
 * the audit_logs table is unwritable by clients (see RLS policies).
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface AuditEntry {
  adminUserId: string;
  action: string;
  targetRef: { type: string; id: string };
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  at?: string;
}

/** Append an audit entry (server-side only). */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }
  await supabase.from("audit_logs").insert({
    admin_user_id: entry.adminUserId,
    action: entry.action,
    target_ref: entry.targetRef,
    reason: entry.reason,
    before: entry.before,
    after: entry.after,
    created_at: entry.at ?? new Date().toISOString(),
  });
}

/** Best-effort audit wrapper. Audit must NEVER break a user-facing write. */
export async function recordAuditBestEffort(entry: AuditEntry): Promise<void> {
  try {
    await recordAudit(entry);
  } catch (error) {
    console.warn("[audit] non-fatal audit write failed:", {
      action: entry.action,
      targetRef: entry.targetRef,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Assert that the caller owns the profile being mutated. */
export function assertOwnProfile(
  requestedUid: string,
  sessionUid?: string | null
): string {
  if (!sessionUid) {
    throw new Error("Authentication required. Please sign in again, then retry.");
  }
  if (requestedUid && requestedUid !== sessionUid) {
    throw new Error("Not authorized to modify this profile.");
  }
  return sessionUid;
}
