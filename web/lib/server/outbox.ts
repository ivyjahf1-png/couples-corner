"use server";

import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { adminRefs, canonicalPairId } from "@/lib/firebase/collections";
import type { RiskSignalType } from "@/lib/models";
import { scanMessage, addRiskSignal } from "@/lib/server/safety";

/**
 * Connection-request rate-limit thresholds (central configuration, not inlined
 * in UI). Newly created accounts get tighter limits via `newAccountAgeMs`.
 */
export const RATE_LIMITS = {
  connectionRequestsPerHour: 20,
  connectionRequestsPerHourNewAccount: 5,
  /** Accounts younger than this are treated as "new" for safety monitoring. */
  newAccountAgeMs: 24 * 60 * 60 * 1000, // 24h
} as const;

/**
 * Send a message + run scam-pattern detection (a risk *signal*, never an
 * autonomous ban). Detection runs only on the single message being sent, so it
 * is cheap and never triggers a full user-history scan.
 */
export async function sendMessageWithScan(args: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  body: string;
}): Promise<{ id: string }> {
  const { conversationId, senderId, recipientId, body } = args;
  const db = getAdminFirestore();
  const refs = adminRefs(db);

  // Block check: sender must not be blocked by recipient.
  const pairId = canonicalPairId(senderId, recipientId);
  const [blockSnap] = await Promise.all([refs.blocks.doc(pairId).get()]);
  const blockData = blockSnap.exists
    ? (blockSnap.data() as { blockedId: string; blockerId: string })
    : null;
  const isBlocked = !!(
    blockData &&
    ((blockData.blockerId === recipientId && blockData.blockedId === senderId) ||
      (blockData.blockerId === senderId && blockData.blockedId === recipientId))
  );
  if (isBlocked) throw new Error("Cannot message a blocked user");

  const now = new Date().toISOString();
  const messageRef = refs.messages(conversationId).doc();
  const signal = scanMessage(body);
  const batch = db.batch();

  batch.set(messageRef, {
    id: messageRef.id,
    conversationId,
    senderId,
    body,
    createdAt: now,
    status: "sent",
  });

  batch.update(refs.conversations.doc(conversationId), {
    lastMessageAt: now,
    lastMessageId: messageRef.id,
    updatedAt: now,
  });

  // Risk signal is written separately; a future Cloud Function will aggregate.
  if (signal) {
    void addRiskSignal({
      targetUserId: senderId,
      type: signal,
      context: `message:${messageRef.id}`,
      source: "client_message_send",
      score: signalScore(signal),
    });
  }

  await batch.commit();
  return { id: messageRef.id };
}

/**
 * Connection-request gate: enforces re-request prevention and block checks.
 * Rate limiting is the Cloud Function's job — this guard keeps the data honest.
 */
export async function canSendConnectionRequest(fromUid: string, toUid: string): Promise<boolean> {
  if (fromUid === toUid) return false;

  const db = getAdminFirestore();
  const refs = adminRefs(db);

  const [existing, blockSnap] = await Promise.all([
    refs
      .connectionRequests.where("fromUserId", "==", fromUid)
      .where("toUserId", "==", toUid)
      .limit(1)
      .get(),
    refs.blocks.doc(canonicalPairId(fromUid, toUid)).get(),
  ]);

  const blocked = blockSnap.exists;
  const alreadyRequested = !existing.empty;
  return !blocked && !alreadyRequested;
}

/** Per-signal risk scores (additive; capped server-side by rules). */
function signalScore(type: RiskSignalType): number {
  switch (type) {
    case "suspicious_link":
      return 30;
    case "suspicious_message":
      return 25;
    default:
      return 10;
  }
}
