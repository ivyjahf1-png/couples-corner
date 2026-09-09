import "server-only";

/**
 * Couples Corner — audit logging for sensitive server-side operations.
 *
 * SECURITY BOUNDARY: writes only through the Admin SDK; the `auditLogs`
 * collection is unwritable by clients (see `firestore.rules`). Sensitive admin
 * actions must call `recordAudit` in the SAME transaction/batch as the action
 * itself so an admin mutation cannot commit without its audit record.
 */

import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { adminRefs } from "@/lib/firebase/collections";

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
  await adminRefs(getAdminFirestore()).auditLogs.add({
    ...entry,
    at: entry.at ?? new Date().toISOString(),
  });
}


