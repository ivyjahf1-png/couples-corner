import "server-only";

/**
 * Couples Corner — audit logging for sensitive server-side operations.
 *
 * SECURITY BOUNDARY: writes only through the Supabase server client;
 * the `audit_logs` table is unwritable by clients (see RLS policies). Sensitive admin
 * actions must call `recordAudit` in the SAME transaction/batch as the action
 * itself so an admin mutation cannot commit without its audit record.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface AuditEntry {
  adminUserId: string;
  /** Any sensitive action string (report entity, profile op, content op, ...). */
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



