import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ConnectionRequest, Connection } from "@/lib/models/connections";
import { createNotification } from "./notifications";

/**
 * Connection request/response mutations.
 *
 * SECURITY BOUNDARY: all writes run through the Supabase server client (bypasses RLS),
 * so every function authorizes explicitly — actor uid comes from the server
 * session, never the client; duplicate requests, self-requests, and requests
 * involving a block in either direction are rejected here AND by RLS policies.
 */

/** Max connection requests one account may send per rolling hour. */
const REQUESTS_PER_HOUR = 20;

function pairIdOf(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

async function assertNotBlocked(a: string, b: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("id", pairIdOf(a, b))
    .single();
  if (data) throw new Error("You can't connect with this person");
}

async function assertUnderRateLimit(fromUid: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("connection_requests")
    .select("*", { count: "exact", head: true })
    .eq("from_user_id", fromUid)
    .gt("created_at", since);
  if (count && count >= REQUESTS_PER_HOUR) {
    throw new Error("You're sending requests too quickly — try again later");
  }
}

/** Send a connection request. Prevents self/duplicate/blocked/rate-limited sends. */
export async function sendConnectionRequest(fromUid: string, toUid: string): Promise<void> {
  if (fromUid === toUid) throw new Error("You can't connect with yourself");

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }
  const now = new Date().toISOString();

  await assertNotBlocked(fromUid, toUid);
  await assertUnderRateLimit(fromUid);

  // Duplicate guard: any pending request in either direction.
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from("connection_requests")
      .select("id")
      .eq("from_user_id", fromUid)
      .eq("to_user_id", toUid)
      .eq("status", "pending")
      .limit(1)
      .single(),
    supabase
      .from("connection_requests")
      .select("id")
      .eq("from_user_id", toUid)
      .eq("to_user_id", fromUid)
      .eq("status", "pending")
      .limit(1)
      .single(),
  ]);

  if (outgoing) throw new Error("Request already sent");
  if (incoming) throw new Error("This person already sent you a request — check Matches");

  const { data: existingConnection } = await supabase
    .from("connections")
    .select("id")
    .eq("id", pairIdOf(fromUid, toUid))
    .single();

  if (existingConnection) throw new Error("You're already connected");

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("user_id", toUid)
    .single();

  const targetData = targetProfile as { preferences?: { notify_on_connection?: boolean } } | null;

  const { data: created } = await supabase
    .from("connection_requests")
    .insert({
      from_user_id: fromUid,
      to_user_id: toUid,
      status: "pending",
      note: null,
      responded_at: null,
      connection_id: null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (targetData?.preferences?.notify_on_connection !== false) {
    await createNotification({
      recipientId: toUid,
      type: "connection_request",
      actorId: fromUid,
      entityType: "connectionRequest",
      entityId: created!.id,
      title: "New connection request",
      body: "Someone would like to connect with you.",
    });
  }
}

/** Cancel an outgoing pending request. Only the sender may cancel. */
export async function cancelConnectionRequest(uid: string, requestId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data: request } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) throw new Error("Request not found");
  if (request.from_user_id !== uid) throw new Error("Not authorized");
  if (request.status !== "pending") throw new Error("Request already handled");

  const now = new Date().toISOString();
  await supabase
    .from("connection_requests")
    .update({ status: "canceled", responded_at: now, updated_at: now })
    .eq("id", requestId);
}

/**
 * Accept or decline an incoming request. Only the recipient may respond.
 * Accepting creates the canonical Connection (id = ordered pair).
 */
export async function respondToConnectionRequest(
  uid: string,
  requestId: string,
  accept: boolean
): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  // Pre-read for authorization + notification targeting.
  const { data: pre } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!pre) throw new Error("Request not found");
  if (pre.to_user_id !== uid) throw new Error("Not authorized");
  if (pre.status !== "pending") throw new Error("Request already handled");
  await assertNotBlocked(pre.from_user_id, uid);
  const fromUserId = pre.from_user_id;

  const now = new Date().toISOString();
  if (!accept) {
    await supabase
      .from("connection_requests")
      .update({ status: "declined", responded_at: now, updated_at: now })
      .eq("id", requestId);
  } else {
    // Create connection and update request
    await supabase.from("connections").insert({
      id: pairIdOf(pre.from_user_id, pre.to_user_id),
      user1_id: pre.from_user_id < pre.to_user_id ? pre.from_user_id : pre.to_user_id,
      user2_id: pre.from_user_id < pre.to_user_id ? pre.to_user_id : pre.from_user_id,
      connected_at: now,
      source_request_id: requestId,
      created_at: now,
      updated_at: now,
    });

    await supabase
      .from("connection_requests")
      .update({
        status: "accepted",
        responded_at: now,
        connection_id: pairIdOf(pre.from_user_id, pre.to_user_id),
        updated_at: now,
      })
      .eq("id", requestId);
  }

  if (accept) {
    await createNotification({
      recipientId: fromUserId,
      type: "connection_accepted",
      actorId: uid,
      entityType: "connection",
      title: "Connection accepted",
      body: "You're now connected — say hello!",
    });
  } else {
    await createNotification({
      recipientId: fromUserId,
      type: "connection_declined",
      actorId: uid,
      entityType: "connection",
      title: "Connection request declined",
      body: "They're not interested right now — no hard feelings.",
    });
  }
}

/** Remove an accepted connection. Either participant may remove. */
export async function removeConnection(uid: string, connectionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data: connection } = await supabase
    .from("connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (!connection) throw new Error("Connection not found");
  if (connection.user1_id !== uid && connection.user2_id !== uid) throw new Error("Not authorized");

  await supabase.from("connections").delete().eq("id", connectionId);
}
