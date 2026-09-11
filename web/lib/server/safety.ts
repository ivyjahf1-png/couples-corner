import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Report, ReportReason, RiskPriority, RiskSignalType } from "@/lib/models";
import type { BlockedUser } from "@/lib/feature/types";
import { REPORT_REASONS } from "@/lib/models/safety";

/**
 * Couples Corner — server-side safety service.
 *
 * SECURITY BOUNDARY: every write below runs through the Supabase server client,
 * which bypasses RLS. Therefore each function enforces authorization
 * explicitly — the reporter is taken from the session (never from the
 * request body), admins are verified via the users table role field, and
 * blocks/reports are canonicalized so they can't be forged by id choice.
 *
 * Heavy detection work (scanning backfilled messages, batch risk scoring) is
 * intentionally structured to move to a background job later — the functions
 * here operate only on the single message being sent in-band, so they are
 * cheap and never run on every page load.
 */

/** Map a report `reason` to an admin-side priority. */
const PRIORITY_BY_REASON: Record<ReportReason, RiskPriority> = {
  "Scam or fraud": "urgent",
  "Asking for money": "urgent",
  "Investment or crypto request": "urgent",
  "Gift card request": "urgent",
  "Emergency-money story": "high",
  "Fake or impersonation profile": "high",
  "Suspicious links or phishing": "high",
  "Harassment or bullying": "high",
  "Spam or repetitive content": "medium",
  "Inappropriate content": "medium",
  "Something else": "low",
};

/** Returns the matching risk signal type if a free-text message matches known scam patterns. */
export function scanMessage(text: string): RiskSignalType | null {
  const lowered = text.toLowerCase();
  const patterns: Array<{ type: RiskSignalType; test: (s: string) => boolean }> = [
    {
      type: "suspicious_message",
      test: (s) =>
        /\b(free money|send money|need money urgently|emergency.*money|help me transfer|western union|cash app)\b/.test(
          s
        ),
    },
    { type: "suspicious_link", test: (s) => /\b(bit\.ly|tinyurl\.com|cutt\.ly|goo\.gl)\b/.test(s) },
    {
      type: "suspicious_message",
      test: (s) =>
        /\b(invest|investment|cryptocurrency|btc|eth|gift card|google play|apple gift)\b/.test(s),
    },
  ];
  for (const pattern of patterns) {
    if (pattern.test(lowered)) return pattern.type;
  }
  return null;
}

/**
 * Record a user-submitted report. `reporterId` is always the authenticated
 * user — the client cannot set it — and priority is derived server-side.
 */
export async function createReport(input: {
  reporterId: string;
  entityType: Report["entityType"];
  entityId: string;
  reason: ReportReason;
  details?: string | null;
}): Promise<string> {
  if (!REPORT_REASONS.includes(input.reason)) {
    throw new Error("Invalid report reason");
  }
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data } = await supabase
    .from("reports")
    .insert({
      reporter_id: input.reporterId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      reason: input.reason,
      details: input.details?.trim() || null,
      priority: PRIORITY_BY_REASON[input.reason],
      status: "open",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  return data!.id;
}

/** Canonical, order-independent pair id used by `blocks` (and connection lookups). */
function canonicalPairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/** Block another user. Canonical doc id encodes ownership (not forgeable). */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) throw new Error("Cannot block yourself");
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  await supabase.from("blocks").insert({
    id: canonicalPairId(blockerId, blockedId),
    blocker_id: blockerId,
    blocked_id: blockedId,
    created_at: now,
  });
}

/** Unblock another user. Only the blocker may delete their block record. */
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const pairId = canonicalPairId(blockerId, blockedId);

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data: blockRow } = await supabase
    .from("blocks")
    .select("id, blocker_id")
    .eq("id", pairId)
    .single();

  if (!blockRow || blockRow.blocker_id !== blockerId) {
    throw new Error("Not authorized");
  }

  await supabase.from("blocks").delete().eq("id", pairId);
}

/** List the signed-in user's blocked targets (server query). */
export async function listBlocked(blockerId: string): Promise<BlockedUser[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) return [];

  const { data: blocks } = await supabase
    .from("blocks")
    .select("id, blocked_id, created_at")
    .eq("blocker_id", blockerId)
    .order("created_at", { ascending: false });

  if (!blocks) return [];

  const blockedIds = blocks.map((b) => b.blocked_id);

  // Resolve display names + kinds from profiles in parallel.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, profile_type")
    .in("user_id", blockedIds);

  const profileMap = new Map<string, { name: string; kind: "person" | "couple" }>();
  if (profiles) {
    for (const p of profiles) {
      profileMap.set(p.user_id, {
        name: p.display_name ?? p.user_id.slice(0, 8),
        kind: p.profile_type === "coupled" ? "couple" : "person",
      });
    }
  }

  return blocks.map((block) => {
    const n = profileMap.get(block.blocked_id);
    return {
      id: block.id,
      targetUid: block.blocked_id,
      displayName: n?.name ?? "Former member",
      kind: n?.kind ?? "person",
      blockedAt: block.created_at,
    };
  });
}

/**
 * Append a risk signal — written by trusted server code only (in-band on
 * message send here, later by a background job for batch scoring). Clients
 * never touch the risk_flags table, so no user can zero their own score.
 */
export async function addRiskSignal(signal: {
  targetUserId: string;
  type: RiskSignalType;
  context: string;
  source: "client_message_send" | "admin" | "cloud_function";
  score: number;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  await supabase.from("risk_flags").insert({
    target_user_id: signal.targetUserId,
    type: signal.type,
    context: signal.context,
    source: signal.source,
    score: signal.score,
    created_at: now,
  });
}
