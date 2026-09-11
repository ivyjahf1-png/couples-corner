"use server";

import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  // Block check: sender must not be blocked by recipient.
  const pairId = senderId < recipientId ? `${senderId}_${recipientId}` : `${recipientId}_${senderId}`;
  const { data: blockRow } = await supabase
    .from("blocks")
    .select("blocked_id, blocker_id")
    .eq("id", pairId)
    .single();

  const isBlocked = !!(
    blockRow &&
    ((blockRow.blocker_id === recipientId && blockRow.blocked_id === senderId) ||
      (blockRow.blocker_id === senderId && blockRow.blocked_id === recipientId))
  );
  if (isBlocked) throw new Error("Cannot message a blocked user");

  const now = new Date().toISOString();
  const signal = scanMessage(body);

  // Insert message
  const { data: messageRow } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
      created_at: now,
      status: "sent",
    })
    .select("id")
    .single();

  // Update conversation
  await supabase
    .from("conversations")
    .update({
      last_message_at: now,
      last_message_id: messageRow!.id,
      updated_at: now,
    })
    .eq("id", conversationId);

  // Risk signal is written separately; a future background job will aggregate.
  if (signal) {
    void addRiskSignal({
      targetUserId: senderId,
      type: signal,
      context: `message:${messageRow!.id}`,
      source: "client_message_send",
      score: signalScore(signal),
    });
  }

  return { id: messageRow!.id };
}

/**
 * Connection-request gate: enforces re-request prevention and block checks.
 * Rate limiting is the background job's responsibility — this guard keeps the data honest.
 */
export async function canSendConnectionRequest(fromUid: string, toUid: string): Promise<boolean> {
  if (fromUid === toUid) return false;

  const supabase = getSupabaseServerClient();

  if (!supabase) return false;

  const [{ data: existing }, { data: blockRow }] = await Promise.all([
    supabase
      .from("connection_requests")
      .select("id")
      .eq("from_user_id", fromUid)
      .eq("to_user_id", toUid)
      .limit(1)
      .single(),
    supabase
      .from("blocks")
      .select("id")
      .eq("id", fromUid < toUid ? `${fromUid}_${toUid}` : `${toUid}_${fromUid}`)
      .single(),
  ]);

  const blocked = !!blockRow;
  const alreadyRequested = !!existing;
  return !blocked && !alreadyRequested;
}

/** Per-signal risk scores (additive; capped server-side by RLS). */
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

