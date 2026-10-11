import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CallLogEntry, CallStatus } from "@/lib/feature/types";

/**
 * Call-history reads and writes.
 *
 * The realtime call surface is peer-to-peer; nothing here carries media. These
 * functions exist purely so a call leaves a trace — see the header note on
 * migration 048 for why a call is not modelled as a message.
 *
 * RLS is the authority on who may read or write a row. Every function here also
 * re-checks membership, because a function that trusts its caller's arguments and
 * is protected only by RLS will still leak a row to whoever finds a gap in a
 * policy.
 */

const SELECT =
  "id, conversation_id, caller_id, callee_id, mode, status, started_at, answered_at, ended_at";

interface CallRow {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  mode: string;
  status: string;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
}

function toEntry(row: CallRow): CallLogEntry {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    callerId: row.caller_id,
    calleeId: row.callee_id,
    // Coerced rather than cast: the column has a CHECK, but a CHECK is not a
    // type, and a row written before the constraint existed would otherwise
    // render as "Missed undefined Call".
    mode: row.mode === "video" ? "video" : "audio",
    status: (row.status as CallStatus) ?? "ringing",
    startedAt: row.started_at,
    answeredAt: row.answered_at,
    endedAt: row.ended_at,
  };
}

/** True when `userId` is one of the two people on this conversation. */
async function isParticipant(conversationId: string, userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("conversations")
    .select("participant_user_ids")
    .eq("id", conversationId)
    .maybeSingle();
  const ids = (data?.participant_user_ids as string[] | undefined) ?? [];
  return ids.includes(userId);
}

/** True for the "migration has not been applied yet" class of error. */
function isMissingTable(message: string | undefined): boolean {
  return /does not exist|schema cache/i.test(message ?? "");
}

/**
 * A conversation's call history, newest first.
 *
 * Returns `[]` rather than throwing when the table is missing. Migration 048 has
 * to be applied before this works, and a chat thread that hard-fails because a
 * migration has not been run yet is a far worse outcome than a thread with no
 * call history in it.
 */
export async function listCalls(
  conversationId: string,
  userId: string,
): Promise<CallLogEntry[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  if (!(await isParticipant(conversationId, userId))) return [];

  const { data, error } = await supabase
    .from("calls")
    .select(SELECT)
    .eq("conversation_id", conversationId)
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    // Missing table is the expected pre-migration case; log the rest, because a
    // permissions error means the RLS policies are wrong and that is a bug.
    if (!isMissingTable(error.message)) {
      console.error("[calls] list failed", error.message);
    }
    return [];
  }
  return ((data ?? []) as CallRow[]).map(toEntry);
}

/** Everything involving this member, for a calls log. */
export async function listCallsForUser(userId: string): Promise<CallLogEntry[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("calls")
    .select(SELECT)
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) {
    if (!isMissingTable(error.message)) {
      console.error("[calls] list-for-user failed", error.message);
    }
    return [];
  }
  return ((data ?? []) as CallRow[]).map(toEntry);
}

/**
 * Record a call that is ringing.
 *
 * Returns the new row's id so the caller can move the SAME row to a terminal
 * state on hang-up. Inserting a fresh row per state change would produce three
 * records for one call.
 */
export async function startCall(params: {
  conversationId: string;
  callerId: string;
  calleeId: string;
  mode: "audio" | "video";
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Calling is not available." };
  if (params.callerId === params.calleeId) {
    return { ok: false, error: "You cannot call yourself." };
  }
  if (!(await isParticipant(params.conversationId, params.callerId))) {
    return { ok: false, error: "You are not in this conversation." };
  }

  const { data, error } = await supabase
    .from("calls")
    .insert({
      conversation_id: params.conversationId,
      caller_id: params.callerId,
      callee_id: params.calleeId,
      mode: params.mode,
      status: "ringing",
    })
    .select("id")
    .single();

  if (error || !data) {
    if (isMissingTable(error?.message)) {
      return { ok: false, error: "Calling is not enabled on this deployment yet." };
    }
    return { ok: false, error: error?.message ?? "Couldn't start the call." };
  }
  return { ok: true, id: data.id as string };
}

/**
 * Move a ringing call to a terminal state.
 *
 * `answered` stamps `answered_at`; `missed` deliberately does not, and the
 * table's CHECK rejects the combination — so a late answer write cannot quietly
 * rewrite a missed call into a connected one.
 */
export async function finishCall(params: {
  callId: string;
  userId: string;
  status: Extract<
    CallStatus,
    "answered" | "missed" | "declined" | "cancelled" | "ended"
  >;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Calling is not available." };

  // Read first so the write cannot be aimed at a conversation this member is not
  // part of. RLS would block it anyway; this makes the refusal legible.
  const { data: existing } = await supabase
    .from("calls")
    .select("id, caller_id, callee_id")
    .eq("id", params.callId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "That call no longer exists." };
  if (existing.caller_id !== params.userId && existing.callee_id !== params.userId) {
    return { ok: false, error: "That call is not yours." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("calls")
    .update({
      status: params.status,
      answered_at: params.status === "answered" ? now : null,
      ended_at: now,
    })
    .eq("id", params.callId);

  if (error) {
    if (/violates row-level security|check constraint/i.test(error.message)) {
      return { ok: false, error: "That call is already in a final state." };
    }
    if (!isMissingTable(error.message)) {
      console.error("[calls] finish failed", error.message);
    }
    return { ok: false, error: "Couldn't update the call." };
  }
  return { ok: true };
}

/** Active call session types ***************************************************

 * `public.active_calls` is the LIVE call surface. It is a single row per open
 * call session: the caller pushes `start()`, the receiver is woken by a realtime
 * subscription on `receiver_id`, and the row reaches `ended` when either party
 * terminates. It is not an audit trail and never records a decline. See the
 * header comment on migration 056 for the full rationale.

 */

/** Insert a fresh active call row. The `channel_name` is the caller's derived
 * Agora room id; it is unique so two open sessions can never share a room. */

export async function startActiveCall(params: {
  callerId: string;
  receiverId: string;
  channelName: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Calling is not available." };

  const { data, error } = await supabase
    .from("active_calls")
    .insert({
      caller_id: params.callerId,
      receiver_id: params.receiverId,
      channel_name: params.channelName,
      status: "ringing",
    })
    .select("id")
    .single();

  if (error || !data) {
    if (/does not exist/i.test(error?.message ?? "")) {
      return { ok: false, error: "Calling is not enabled on this deployment yet." };
    }
    return { ok: false, error: error?.message ?? "Couldn't start the call." };
  }

  return { ok: true, id: data.id as string };
}

/** Finalise an active call. Only the caller or the receiver may write; a late
 * write to a row that has already reached `ended` is rejected by the CHECK
 * constraint, so a hang-up can never silently resurrect a finished call. */

export async function endActiveCall(params: {
  callId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Calling is not available." };

  // Read first so the write can't be aimed at a row this member has no business
  // touching. RLS blocks the write anyway, but the error leg is what makes the
  // caller's button tap produce a legible result.
  const { data: existing } = await supabase
    .from("active_calls")
    .select("id, caller_id, receiver_id, status")
    .eq("id", params.callId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "That call no longer exists." };
  if (existing.caller_id !== params.userId && existing.receiver_id !== params.userId) {
    return { ok: false, error: "That call is not yours." };
  }
  if (existing.status === "ended") {
    return { ok: false, error: "That call has already ended." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("active_calls")
    .update({ status: "ended", ended_at: now })
    .eq("id", params.callId);

  if (error) {
    if (/violates row-level security|check constraint/i.test(error.message)) {
      return { ok: false, error: "That call is already in a final state." };
    }
    if (!/does not exist/i.test(error.message ?? "")) {
      console.error("[active_calls] end failed", error.message);
    }
    return { ok: false, error: "Couldn't end the call." };
  }

  return { ok: true };
}

/** Read the live row for a given Agora channel id (the caller). Returns the full
 * row so the caller can re-check whether the conversation is already live. */

export async function getActiveCallByChannelName(
  channelName: string,
): Promise<{ id: string; caller_id: string; receiver_id: string; status: string } | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("active_calls")
    .select("id, caller_id, receiver_id, status")
    .eq("channel_name", channelName)
    .maybeSingle();

  if (error) {
    if (!/does not exist/i.test(error.message ?? "")) {
      console.error("[active_calls] read failed", error.message);
    }
    return null;
  }

  return data ?? null;
}

/** Read the live row for a receiver. This is the query shape the receiver uses
 * to decide "is something ringing for me right now". The index on `receiver_id`
 * keeps this cheap. */

export async function getActiveCallForReceiver(
  receiverId: string,
): Promise<{ id: string; caller_id: string; channel_name: string; status: string }[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("active_calls")
    .select("id, caller_id, channel_name, status")
    .eq("receiver_id", receiverId)
    .eq("status", "ringing")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    if (!/does not exist/i.test(error.message ?? "")) {
      console.error("[active_calls] read-for-receiver failed", error.message);
    }
    return [];
  }

  return ((data ?? []) as { id: string; caller_id: string; channel_name: string; status: string }[]).map((row) => ({
    id: row.id,
    caller_id: row.caller_id,
    channel_name: row.channel_name,
    status: row.status,
  }));
}
