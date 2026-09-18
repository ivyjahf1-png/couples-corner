import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ConnectionRequest, Connection } from "@/lib/models/connections";
import type { ConnectionState } from "@/lib/feature/types";
import { createNotification } from "./notifications";
import { profileSelectList } from "./profiles";

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

/**
 * Resolve the connection UI state between the signed-in viewer and a profile.
 * Returns the ConnectionState plus the request/connection ids needed to act.
 */
export async function getConnectionState(
  viewerUid: string | null,
  profileUid: string
): Promise<{ state: ConnectionState; requestId: string | null; connectionId: string | null }> {
  if (!viewerUid || viewerUid === profileUid) {
    return { state: viewerUid === profileUid ? "self" : "none", requestId: null, connectionId: null };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const [{ data: outgoing }, { data: incoming }, { data: connection }] = await Promise.all([
    supabase
      .from("connection_requests")
      .select("id, status")
      .eq("from_user_id", viewerUid)
      .eq("to_user_id", profileUid)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("connection_requests")
      .select("id, status")
      .eq("from_user_id", profileUid)
      .eq("to_user_id", viewerUid)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("connections")
      .select("id")
      .eq("id", pairIdOf(viewerUid, profileUid))
      .limit(1)
      .maybeSingle(),
  ]);

  if (connection) return { state: "connected", requestId: null, connectionId: connection.id as string };
  if (incoming) return { state: "incoming_pending", requestId: incoming.id as string, connectionId: null };
  if (outgoing) return { state: "outgoing_pending", requestId: outgoing.id as string, connectionId: null };
  return { state: "none", requestId: null, connectionId: null };
}

/** Send a connection request. Prevents self/duplicate/blocked/rate-limited sends. */
export async function sendConnectionRequest(fromUid: string, toUid: string): Promise<void> {
  if (fromUid === toUid) throw new Error("You can't connect with yourself");

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }
  const now = new Date().toISOString();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // All guard reads are independent — run them concurrently so the request
  // insert isn't serialized behind six round-trips on slow mobile networks.
  const [
    { data: blockedRow },
    { count: recentCount },
    { data: outgoing },
    { data: incoming },
    { data: existingConnection },
    { data: targetProfile },
  ] = await Promise.all([
    supabase.from("blocks").select("id").eq("id", pairIdOf(fromUid, toUid)).limit(1).maybeSingle(),
    supabase
      .from("connection_requests")
      .select("*", { count: "exact", head: true })
      .eq("from_user_id", fromUid)
      .gt("created_at", since),
    supabase
      .from("connection_requests")
      .select("id")
      .eq("from_user_id", fromUid)
      .eq("to_user_id", toUid)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("connection_requests")
      .select("id")
      .eq("from_user_id", toUid)
      .eq("to_user_id", fromUid)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),
    supabase.from("connections").select("id").eq("id", pairIdOf(fromUid, toUid)).limit(1).maybeSingle(),
    supabase.from("profiles").select(profileSelectList()).eq("user_id", toUid).limit(1).maybeSingle(),
  ]);

  if (blockedRow) throw new Error("You can't connect with this person");
  if (recentCount && recentCount >= REQUESTS_PER_HOUR) {
    throw new Error("You're sending requests too quickly — try again later");
  }
  if (outgoing) throw new Error("Request already sent");
  if (incoming) throw new Error("This person already sent you a request — check Matches");
  if (existingConnection) throw new Error("You're already connected");

  const targetData = targetProfile as Record<string, unknown> | null;
  const notifyOnConnection = (
    targetData?.preferences as { notify_on_connection?: boolean } | undefined
  )?.notify_on_connection;

  const { data: created, error: insertError } = await supabase
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

  // `created` is null whenever the insert fails (RLS, constraint, rate limit
  // trigger, connectivity) — `created!.id` then crashed with
  // "Cannot read properties of null (reading 'id')". Surface the real reason.
  if (insertError) {
    throw new Error(insertError.message || "Couldn't send your request. Please try again.");
  }
  if (!created?.id) {
    throw new Error("Couldn't send your request. Please try again.");
  }

  if (notifyOnConnection !== false) {
    await createNotification({
      recipientId: toUid,
      type: "connection_request",
      actorId: fromUid,
      entityType: "connectionRequest",
      entityId: created.id,
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
    const pairId = pairIdOf(pre.from_user_id, pre.to_user_id);
    await supabase.from("connections").insert({
      id: pairId,
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
        connection_id: pairId,
        updated_at: now,
      })
      .eq("id", requestId);

    // Initialize the 1:1 chat room immediately so both users see an active
    // conversation on /messages and the matches page. Idempotent: skip if a
    // direct conversation between the pair already exists.
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("type", "direct")
      .contains("participant_user_ids", [pre.from_user_id, pre.to_user_id])
      .limit(1)
      .maybeSingle();
    if (!existing) {
      await supabase.from("conversations").insert({
        type: "direct",
        participant_user_ids: [pre.from_user_id, pre.to_user_id],
        created_by_id: uid,
        created_at: now,
        updated_at: now,
      });
    }
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
