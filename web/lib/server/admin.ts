import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/server/audit";
import type { Report, RiskFlag, ReportStatus } from "@/lib/models";
import type { AppRole, UserStatus } from "@/lib/models/common";

/**
 * Couples Corner — server-side admin / moderation service.
 *
 * SECURITY BOUNDARY: every write runs through the Supabase server client
 * (bypasses RLS). All callers must be verified admins BEFORE invoking these —
 * enforcement lives in `lib/auth/authorization.ts` (`requireAdmin`). Every
 * sensitive mutation is paired with an audit-log entry.
 */

export interface AdminReportRow {
  id: string;
  reporterId: string;
  reporterName: string;
  entityType: Report["entityType"];
  entityId: string;
  reason: string;
  details?: string | null;
  priority: Report["priority"];
  status: ReportStatus;
  createdAt: string;
}

export interface ModerationUserRow {
  /** users.id (== auth uid) */
  uid: string;
  email: string;
  displayName: string;
  status: UserStatus;
  role: AppRole;
  createdAt: string;
  openReportCount: number;
  riskScore: number;
}

const STATUSES: ReportStatus[] = ["open", "reviewed", "resolved", "dismissed"];

/** List reports for the moderation queue, optionally filtered by status. */
export async function listReports(status?: ReportStatus): Promise<AdminReportRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("reports")
    .select("id, reporter_id, entity_type, entity_id, reason, details, priority, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data } = await query;
  if (!data) return [];

  // Resolve reporter display names in one pass.
  const reporterIds = [...new Set(data.map((r) => r.reporter_id as string))];
  const nameMap = await displayNamesFor(reporterIds);

  return data.map((r) => ({
    id: r.id as string,
    reporterId: r.reporter_id as string,
    reporterName: nameMap.get(r.reporter_id as string) ?? "Former member",
    entityType: r.entity_type as AdminReportRow["entityType"],
    entityId: r.entity_id as string,
    reason: r.reason as string,
    details: (r.details as string | null) ?? null,
    priority: r.priority as AdminReportRow["priority"],
    status: r.status as ReportStatus,
    createdAt: r.created_at as string,
  }));
}
/** Update a report's status (resolve/dismiss/reopen). Writes an audit entry. */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminUid: string,
  note?: string
): Promise<void> {
  if (!STATUSES.includes(status)) throw new Error("Invalid report status");
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const now = new Date().toISOString();
  await supabase
    .from("reports")
    .update({
      status,
      handled_by_admin_id: adminUid,
      resolution_note: note?.trim() || null,
      updated_at: now,
    })
    .eq("id", reportId);

  await recordAudit({
    adminUserId: adminUid,
    action: `report.${status}`,
    targetRef: { type: "report", id: reportId },
    reason: note?.trim() || undefined,
  });
}

/** List users with moderation context (open reports + risk score) for the center. */
export async function listUsersForModeration(): Promise<ModerationUserRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, email, display_name, status, role, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (!users) return [];

  // Report counts and risk scores per user.
  const { data: reports } = await supabase
    .from("reports")
    .select("entity_id, status")
    .eq("entity_type", "user");
  const { data: flags } = await supabase
    .from("risk_flags")
    .select("target_user_id, score");

  const reportCounts = new Map<string, number>();
  for (const r of reports ?? []) {
    if (r.status === "open") {
      reportCounts.set(r.entity_id as string, (reportCounts.get(r.entity_id as string) ?? 0) + 1);
    }
  }
  const riskScores = new Map<string, number>();
  for (const f of flags ?? []) {
    riskScores.set(
      f.target_user_id as string,
      (riskScores.get(f.target_user_id as string) ?? 0) + (f.score as number)
    );
  }

  return users.map((u) => ({
    uid: u.id as string,
    email: u.email as string,
    displayName: (u.display_name as string) ?? (u.email as string)?.split("@")[0] ?? "Anonymous",
    status: u.status as UserStatus,
    role: u.role as AppRole,
    createdAt: u.created_at as string,
    openReportCount: reportCounts.get(u.id as string) ?? 0,
    riskScore: riskScores.get(u.id as string) ?? 0,
  }));
}
/** Set a user's status (active / suspended — a "ban" maps to `suspended`). Writes an audit entry. */
export async function setUserStatus(
  uid: string,
  status: Exclude<UserStatus, "deactivated">,
  adminUid: string,
  reason?: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const now = new Date().toISOString();
  await supabase.from("users").update({ status, updated_at: now }).eq("id", uid);

  await recordAudit({
    adminUserId: adminUid,
    action: `user.${status}`,
    targetRef: { type: "user", id: uid },
    reason: reason?.trim() || undefined,
  });
}

/** List risk flags for a given user (safety signals). */
export async function listRiskFlags(userId: string): Promise<RiskFlag[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("risk_flags")
    .select("*")
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data) return [];
  return data.map((f) => ({
    id: f.id as string,
    targetUserId: f.target_user_id as string,
    type: f.type as RiskFlag["type"],
    context: f.context as string,
    source: f.source as RiskFlag["source"],
    score: f.score as number,
    createdAt: f.created_at as string,
  }));
}

async function displayNamesFor(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const supabase = getSupabaseServerClient();
  if (!supabase) return map;

  const { data } = await supabase
    .from("users")
    .select("id, display_name")
    .in("id", ids);
  for (const row of data ?? []) {
    map.set(row.id as string, (row.display_name as string) ?? "Member");
  }
  return map;
}