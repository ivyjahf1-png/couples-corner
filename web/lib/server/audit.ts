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
import { resolveActorUuid } from "@/lib/server/actor";

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

/**
 * Append an audit entry (server-side only).
 *
 * `audit_logs.admin_user_id` is a `uuid` column: forwarding a blank value (an
 * unresolved session uid) or a non-uuid pseudo id would be rejected by Postgres
 * with `invalid input syntax for type uuid: ""`. The actor is therefore resolved
 * to a real UUID first; when none can be established the entry is skipped with a
 * warning instead of writing a corrupt row.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const actorUid = await resolveActorUuid(entry.adminUserId);
  if (!actorUid) {
    console.warn("[audit] skipped — no resolvable admin uuid:", {
      action: entry.action,
      targetRef: entry.targetRef,
    });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_user_id: actorUid,
    action: entry.action,
    target_ref: entry.targetRef,
    reason: entry.reason,
    before: entry.before,
    after: entry.after,
    created_at: entry.at ?? new Date().toISOString(),
  });
}

/**
 * Best-effort audit wrapper. Audit must NEVER break a user-facing write:
 * if `audit_logs` is missing/mis-shaped (schema-cache / RLS errors), the
 * profile save or photo upload still succeeds — the failure is logged
 * server-side for operators to investigate.
 */
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

/**
 * Assert that the caller owns the profile being mutated. Callers pass the
 * already-verified session uid plus the requested uid; throws when they
 * differ (or when there is no session). The session must always be resolved
 * server-side via `getCurrentSessionUser()` — never trust a client uid alone.
 */
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



