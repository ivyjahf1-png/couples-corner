"use server";

import "server-only";
import { requireUser } from "@/lib/auth/authorization";
import { finishCall, listCalls, startCall } from "@/lib/server/calls";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CallLogEntry } from "@/lib/feature/types";
import { revalidatePath } from "next/cache";

/**
 * Call-history actions.
 *
 * ── WHY `revalidatePath` IS SAFE HERE AND WAS NOT IN `markConversationRead` ────
 * These are invoked from event handlers and effects as MUTATIONS, which is the
 * only context Next.js permits revalidation in. The conversation page's
 * mark-read call used to fire from a Server Component RENDER, which throws
 * "used `revalidatePath` … during render which is unsupported" — see the note on
 * `markConversationReadAction` in `lib/actions/messaging.ts`.
 */

/** A conversation's call history. Returns [] until migration 048 is applied. */
export async function listCallLogAction(
  conversationId: string,
): Promise<CallLogEntry[]> {
  const user = await requireUser();
  return listCalls(conversationId, user.uid);
}

/**
 * Place a call and record it.
 *
 * Returns the call id so the caller can finalise the SAME row. Null means the
 * call could not be recorded — the surface still connects, because a working
 * call that leaves no trace is better than a call that refuses to place.
 */
export async function startCallAction(params: {
  conversationId: string;
  calleeId: string;
  mode: "audio" | "video";
}): Promise<string | null> {
  const user = await requireUser();
  const result = await startCall({
    conversationId: params.conversationId,
    callerId: user.uid,
    calleeId: params.calleeId,
    mode: params.mode,
  });
  return result.ok ? result.id : null;
}

/**
 * Finalise a call: `answered`, `missed`, `declined`, `cancelled` or `ended`.
 *
 * Revalidates the conversation so the thread picks up a new missed-call card on
 * the next render, and the inbox so its preview count updates.
 */
export async function finishCallAction(params: {
  callId: string;
  status: "answered" | "missed" | "declined" | "cancelled" | "ended";
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await finishCall({ ...params, userId: user.uid });
  if (result.ok) {
    revalidatePath("/messages");
  }
  return result;
}

/**
 * Mark a call this member RECEIVED as missed.
 *
 * Separate from `finishCallAction` because the caller writes `missed` when the
 * ring-out timer expires, while the callee never does — a phone that was never
 * picked up is a fact about the caller's experience, and letting the callee set
 * it would let someone erase the record that they were ignored.
 */
export async function markCallMissedAction(
  callId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Calling is not available." };

  // Read first: only the CALLEE may mark a received call as missed, and RLS
  // deliberately allows both participants to update — so the asymmetry has to be
  // enforced here or it is not enforced at all.
  const { data } = await supabase
    .from("calls")
    .select("id, callee_id, status")
    .eq("id", callId)
    .maybeSingle();

  if (!data) return { ok: false, error: "That call no longer exists." };
  if (data.callee_id !== user.uid) {
    return { ok: false, error: "Only the recipient can mark a call missed." };
  }

  const { error } = await supabase
    .from("calls")
    .update({ status: "missed", ended_at: new Date().toISOString() })
    .eq("id", callId);

  if (error) return { ok: false, error: "Couldn't update the call." };
  revalidatePath("/messages");
  return { ok: true };
}

/** Place a LIVE call session. Writes one row to `public.active_calls` and returns
 * the row id the caller keeps in memory so it can be moved to `ended` on hang-up.
 * The `channel_name` is the Agora room id the two clients derive from the
 * conversation; it is passed through verbatim so both sides join the same room. */

export async function startActiveCallAction(params: {
  conversationId: string;
  callerId: string;
  receiverId: string;
  channelName: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await requireUser();
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
    return { ok: false, error: error?.message ?? "Couldn't place the call." };
  }

  return { ok: true, id: data.id as string };
}

/** Terminate a live call session. Only the caller or the receiver may write;
 * anything else returns a legible error. Revalidates the conversation and the
 * inbox so the UI reflects the finished state. */

export async function endActiveCallAction(params: {
  callId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Calling is not available." };

  const { data: existing } = await supabase
    .from("active_calls")
    .select("id, caller_id, receiver_id, status")
    .eq("id", params.callId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "That call no longer exists." };
  if (existing.caller_id !== user.uid && existing.receiver_id !== user.uid) {
    return { ok: false, error: "That call is not yours." };
  }
  if (existing.status === "ended") {
    return { ok: false, error: "That call has already ended." };
  }

  const { error } = await supabase
    .from("active_calls")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", params.callId);

  if (error) {
    if (/violates row-level security|check constraint/i.test(error.message)) {
      return { ok: false, error: "That call is already in a final state." };
    }
    if (!/does not exist/i.test(error.message ?? "")) {
      console.error("[active_calls] endFailed", error.message);
    }
    return { ok: false, error: "Couldn't end the call." };
  }

  revalidatePath("/messages");
  return { ok: true };
}

/** Live session row shape returned to the incoming-call modal. */
export interface IncomingCallView {
  id: string;
  callerId: string;
  receiverId: string;
  channelName: string;
  status: string;
  mode: "audio" | "video";
}

/** Coerce a raw row into an IncomingCallView; mode falls back to video. */
function toIncomingCallView(row: {
  id: string;
  caller_id: string;
  receiver_id: string;
  channel_name: string;
  status: string;
  mode?: string | null;
}): IncomingCallView {
  return {
    id: row.id,
    callerId: row.caller_id,
    receiverId: row.receiver_id,
    channelName: row.channel_name,
    status: row.status,
    mode: row.mode === "audio" ? "audio" : "video",
  };
}

const INCOMING_SELECT = "id, caller_id, receiver_id, channel_name, status, mode";

/**
 * Polling fallback for the global listener: live `ringing` rows addressed to
 * the current member, newest first.
 *
 * WHY A POLL EXISTS ALONGSIDE REALTIME: the provider subscribes to
 * `active_calls` over Supabase Realtime, but that socket is the first thing
 * an ad-blocker, VPN, or flaky mobile radio kills — and a missed INSERT is
 * silent, so the phone never rings. A cheap 10s poll (`receiver_id` is
 * indexed) covers the gap with no extra infrastructure.
 */
export async function getIncomingCallsAction(): Promise<IncomingCallView[]> {
  const user = await requireUser();
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("active_calls")
    .select(INCOMING_SELECT)
    .eq("receiver_id", user.uid)
    .eq("status", "ringing")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) {
    if (!/does not exist/i.test(error.message ?? "")) {
      console.error("[active_calls] incoming poll failed", error.message);
    }
    return [];
  }
  return ((data ?? []) as {
    id: string;
    caller_id: string;
    receiver_id: string;
    channel_name: string;
    status: string;
    mode?: string | null;
  }[]).map(toIncomingCallView);
}


/**
 * Accept a ringing call. RECEIVER-ONLY: the caller never accepts their own
 * row, and a stranger's row is rejected — RLS enforces the same, but the
 * explicit check is what turns a tap into a legible error.
 *
 * Moves `ringing` → `connected` and returns the row so the client can route
 * both parties into the same `/call/<conversationId>/<mode>` room. Rows
 * already past `ringing` (answered elsewhere, ended) resolve `ok: false`
 * rather than throwing, so a double-tap degrades to a toast, not a crash.
 */
export async function acceptActiveCallAction(params: {
  callId: string;
}): Promise<{ ok: boolean; error?: string; call?: IncomingCallView }> {
  const user = await requireUser();
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Calling is not available." };

  const { data: existing } = await supabase
    .from("active_calls")
    .select(INCOMING_SELECT)
    .eq("id", params.callId)
    .maybeSingle();

  const row = existing as {
    id: string;
    caller_id: string;
    receiver_id: string;
    channel_name: string;
    status: string;
    mode?: string | null;
  } | null;
  if (!row) return { ok: false, error: "That call no longer exists." };
  if (row.receiver_id !== user.uid) {
    return { ok: false, error: "That call is not for you." };
  }
  if (row.status !== "ringing") {
    return { ok: false, error: "That call has already been answered." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("active_calls")
    .update({ status: "connected", answered_at: now })
    .eq("id", params.callId);

  if (error) {
    if (!/does not exist/i.test(error.message ?? "")) {
      console.error("[active_calls] accept failed", error.message);
    }
    return { ok: false, error: "Couldn't answer the call." };
  }

  revalidatePath("/messages");
  return { ok: true, call: toIncomingCallView({ ...row, status: "connected" }) };
}

/**
 * Decline a ringing call. Either participant may write it (caller cancelling
 * from their own screen, receiver declining from the popup) — the RLS update
 * policy allows both, and this mirrors it.
 *
 * Moves the row → `ended` with `ended_at` stamped. Idempotent: declining an
 * already-ended row succeeds silently so both sides hanging up at once never
 * errors.
 */
export async function declineActiveCallAction(params: {
  callId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Calling is not available." };

  const { data: existing } = await supabase
    .from("active_calls")
    .select("id, caller_id, receiver_id, status")
    .eq("id", params.callId)
    .maybeSingle();

  if (!existing) return { ok: true };
  if (existing.caller_id !== user.uid && existing.receiver_id !== user.uid) {
    return { ok: false, error: "That call is not yours." };
  }
  if (existing.status === "ended") return { ok: true };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("active_calls")
    .update({ status: "ended", ended_at: now })
    .eq("id", params.callId);

  if (error) {
    if (!/does not exist/i.test(error.message ?? "")) {
      console.error("[active_calls] decline failed", error.message);
    }
    return { ok: false, error: "Couldn't decline the call." };
  }

  revalidatePath("/messages");
  return { ok: true };
}


/**
 * Resolve a caller's display name for the incoming-call popup.
 *
 * Reads `profiles.display_name` for `callerId` — no membership check, because
 * a caller name is the least surprising thing a ringing phone can show, and
 * RLS on `profiles` already bounds what is visible. Falls back to "Someone"
 * (never an id, never an email prefix) so the popup always reads human.
 */
export async function getCallerNameAction(params: {
  callerId: string;
}): Promise<string> {
  await requireUser();
  const supabase = getSupabaseServerClient();
  if (!supabase) return "Someone";
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", params.callerId)
    .limit(1)
    .maybeSingle();
  const row = data as { display_name?: string | null } | null;
  const name = (row?.display_name ?? "").trim();
  return name || "Someone";
}

