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
