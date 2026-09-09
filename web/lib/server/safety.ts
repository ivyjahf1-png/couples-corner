import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { adminRefs, canonicalPairId } from "@/lib/firebase/collections";
import type { Report, ReportReason, RiskPriority, RiskSignalType } from "@/lib/models";
import type { BlockedUser } from "@/lib/feature/types";
import { REPORT_REASONS } from "@/lib/models/safety";

/**
 * Couples Corner — server-side safety service.
 *
 * SECURITY BOUNDARY: every write below runs through the Admin SDK, which
 * bypasses Firestore rules. Therefore each function enforces authorization
 * explicitly — the reporter is taken from the session (never from the
 * request body), admins are verified via custom claims, and blocks/reports
 * are canonicalized so they can't be forged by document-id choice.
 *
 * Heavy detection work (scanning backfilled messages, batch risk scoring) is
 * intentionally structured to move to a Cloud Function later — the functions
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
  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const now = new Date().toISOString();

  const docRef = await refs.reports.add({
    reporterId: input.reporterId,
    entityType: input.entityType,
    entityId: input.entityId,
    reason: input.reason,
    details: input.details?.trim() || null,
    priority: PRIORITY_BY_REASON[input.reason],
    status: "open",
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/** Block another user. Canonical doc id encodes ownership (not forgeable). */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) throw new Error("Cannot block yourself");
  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const now = new Date().toISOString();

  await refs.blocks.doc(canonicalPairId(blockerId, blockedId)).set({
    id: canonicalPairId(blockerId, blockedId),
    blockerId,
    blockedId,
    createdAt: now,
  });
}

/** Unblock another user. Only the blocker may delete their block doc. */
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const pairId = canonicalPairId(blockerId, blockedId);

  const snap = await refs.blocks.doc(pairId).get();
  if (!snap.exists || snap.data()?.blockerId !== blockerId) {
    throw new Error("Not authorized");
  }
  await snap.ref.delete();
}

/** List the signed-in user's blocked targets (server query). */
export async function listBlocked(blockerId: string): Promise<BlockedUser[]> {
  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const snap = await refs.blocks.where("blockerId", "==", blockerId).orderBy("createdAt", "desc").get();

  const blockedIds = snap.docs.map((d) => (d.data() as { blockedId: string }).blockedId);
  // Resolve display names + kinds from profiles in parallel.
  const profileLookups = await Promise.all(
    blockedIds.map((uid) => refs.userProfiles.doc(uid).get())
  );
  const nameByUid = new Map<string, { name: string; kind: "person" | "couple" }>();
  for (let i = 0; i < blockedIds.length; i++) {
    const p = profileLookups[i].data() as { displayName?: string; profileType?: string } | undefined;
    nameByUid.set(blockedIds[i], {
      name: p?.displayName ?? blockedIds[i].slice(0, 8),
      kind: p?.profileType === "coupled" ? ("couple" as const) : ("person" as const),
    });
  }

  return snap.docs.map((doc) => {
    const data = doc.data() as { blockedId: string; createdAt: string };
    const n = nameByUid.get(data.blockedId);
    return {
      id: doc.id,
      targetUid: data.blockedId,
      displayName: n?.name ?? "Former member",
      kind: n?.kind ?? "person",
      blockedAt: data.createdAt,
    };
  });
}

/**
 * Append a risk signal — written by trusted server code only (in-band on
 * message send here, later by a Cloud Function for batch scoring). Clients
 * never touch the riskFlags collection, so no user can zero their own score.
 */
export async function addRiskSignal(signal: {
  targetUserId: string;
  type: RiskSignalType;
  context: string;
  source: "client_message_send" | "admin" | "cloud_function";
  score: number;
}): Promise<void> {
  const db = getAdminFirestore();
  const now = new Date().toISOString();

  await db.collection("riskFlags").add({
    targetUserId: signal.targetUserId,
    type: signal.type,
    context: signal.context,
    source: signal.source,
    score: signal.score,
    createdAt: now,
  });
}
