import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/server/audit";
import type { Report, ReportStatus } from "@/lib/models";
import type { AppRole, UserStatus } from "@/lib/models/common";
import {
  isSubscriptionTierName,
  type SubscriptionTierName,
} from "@/lib/models/wallet";

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
  uid: string;
  email: string;
  displayName: string;
  status: UserStatus;
  role: AppRole;
  createdAt: string;
  openReportCount: number;
  riskScore: number;
  /** Canonical subscription tier (free | premium | vip) from public.users. */
  subscriptionTier: SubscriptionTierName;
  /** Coin balance from public.user_wallets / game_wallets. */
  coinBalance: number;
}

const STATUSES: ReportStatus[] = ["open", "reviewed", "resolved", "dismissed"];

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

export async function listUsersForModeration(): Promise<ModerationUserRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, email, display_name, status, role, created_at, subscription_tier")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!users) return [];

  const userIds = users.map((u) => u.id as string);
  const openReportCounts = await getOpenReportCounts(userIds);
  const riskScores = await getRiskScores(userIds);
  const coinBalances = await getCoinBalances(userIds);

  return users.map((u) => ({
    uid: (u.id as string) ?? "",
    email: u.email ?? "",
    displayName: u.display_name ?? "Unknown",
    status: (u.status as UserStatus) ?? "active",
    role: (u.role as AppRole) ?? "user",
    createdAt: u.created_at ?? new Date().toISOString(),
    openReportCount: openReportCounts.get(u.id as string) ?? 0,
    riskScore: riskScores.get(u.id as string) ?? 0,
    subscriptionTier: isSubscriptionTierName(u.subscription_tier)
      ? (u.subscription_tier as SubscriptionTierName)
      : "free",
    coinBalance: coinBalances.get(u.id as string) ?? 0,
  }));
}

/** Coin balances for a set of users (from the shared user_wallets view). */
async function getCoinBalances(userIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;

  const supabase = getSupabaseServerClient();
  if (!supabase) return map;

  const { data } = await supabase
    .from("user_wallets")
    .select("user_id, coin_balance")
    .in("user_id", userIds);

  if (data) {
    for (const row of data) {
      map.set(row.user_id as string, (row.coin_balance as number) ?? 0);
    }
  }

  return map;
}

/**
 * Manually set a user's subscription tier (admin override, e.g. Free → VIP).
 * Also credits the wallet ledger so the change is traceable.
 */
export async function setUserSubscriptionTier(
  uid: string,
  tier: SubscriptionTierName,
  adminUid: string,
  reason?: string
): Promise<void> {
  if (!isSubscriptionTierName(tier)) throw new Error("Invalid subscription tier");

  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({ subscription_tier: tier, updated_at: now })
    .eq("id", uid);
  if (error) throw new Error("Failed to update subscription tier");

  await supabase.from("game_ledger").insert({
    user_id: uid,
    kind: "purchase",
    reward_id: `admin_tier_${tier}`,
    amount: 0,
  });

  await recordAudit({
    adminUserId: adminUid,
    action: "user.set_tier",
    targetRef: { type: "user", id: uid },
    reason: reason?.trim() || `Tier set to ${tier}`,
  });
}

/** Manually adjust a user's coin balance to an exact (non-negative) value. */
export async function setUserCoinBalance(
  uid: string,
  coinBalance: number,
  adminUid: string,
  reason?: string
): Promise<void> {
  if (!Number.isInteger(coinBalance) || coinBalance < 0) {
    throw new Error("Coin balance must be a non-negative integer");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  // Lazily provision the wallet row, then set the exact balance.
  const { data: existing } = await supabase
    .from("game_wallets")
    .select("total_earned")
    .eq("user_id", uid)
    .single();

  const previousTotal = existing ? ((existing.total_earned as number) ?? 0) : 0;

  if (!existing) {
    const { error } = await supabase
      .from("game_wallets")
      .insert({ user_id: uid, coin_balance: coinBalance, total_earned: coinBalance });
    if (error) throw new Error("Failed to create wallet");
  } else {
    const { error } = await supabase
      .from("game_wallets")
      .update({ coin_balance: coinBalance, updated_at: new Date().toISOString() })
      .eq("user_id", uid);
    if (error) throw new Error("Failed to update coin balance");
  }

  await supabase.from("game_ledger").insert({
    user_id: uid,
    kind: "purchase",
    reward_id: "admin_balance_adjustment",
    amount: coinBalance - previousTotal,
  });

  await recordAudit({
    adminUserId: adminUid,
    action: "user.set_balance",
    targetRef: { type: "user", id: uid },
    reason: reason?.trim() || `Balance set to ${coinBalance}`,
  });
}

export async function setUserStatus(
  uid: string,
  status: "active" | "suspended",
  adminUid: string,
  reason?: string
): Promise<void> {
  if (!["active", "suspended"].includes(status)) {
    throw new Error("Invalid user status");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const now = new Date().toISOString();
  await supabase
    .from("users")
    .update({ status, updated_at: now })
    .eq("id", uid);

  await recordAudit({
    adminUserId: adminUid,
    action: status === "suspended" ? "user.suspend" : "user.reactivate",
    targetRef: { type: "user", id: uid },
    reason: reason?.trim() || "Manual moderation action",
  });
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

  if (data) {
    for (const row of data) {
      map.set(row.id as string, (row.display_name as string) ?? "Unknown");
    }
  }

  return map;
}

async function getOpenReportCounts(userIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;

  const supabase = getSupabaseServerClient();
  if (!supabase) return map;

  const { data } = await supabase
    .from("reports")
    .select("entity_id")
    .in("entity_id", userIds)
    .eq("entity_type", "user")
    .eq("status", "open");

  if (data) {
    for (const row of data) {
      const prev = map.get(row.entity_id as string) ?? 0;
      map.set(row.entity_id as string, prev + 1);
    }
  }

  return map;
}

async function getRiskScores(userIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;

  const supabase = getSupabaseServerClient();
  if (!supabase) return map;

  const { data } = await supabase
    .from("risk_flags")
    .select("target_user_id, score")
    .in("target_user_id", userIds);

  if (data) {
    for (const row of data) {
      const prev = map.get(row.target_user_id as string) ?? 0;
      map.set(row.target_user_id as string, prev + (row.score as number));
    }
  }

  return map;
}
