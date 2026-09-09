import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { adminRefs } from "@/lib/firebase/collections";
import type { ConnectionRequest, Connection } from "@/lib/models/connections";
import { createNotification } from "./notifications";

/**
 * Connection request/response mutations.
 *
 * SECURITY BOUNDARY: all writes run through the Admin SDK (rules-bypassing),
 * so every function authorizes explicitly — actor uid comes from the server
 * session, never the client; duplicate requests, self-requests, and requests
 * involving a block in either direction are rejected here AND by firestore.rules.
 */

/** Max connection requests one account may send per rolling hour. */
const REQUESTS_PER_HOUR = 20;

function pairIdOf(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

async function assertNotBlocked(a: string, b: string): Promise<void> {
  const snap = await adminRefs(getAdminFirestore()).blocks.doc(pairIdOf(a, b)).get();
  if (snap.exists) throw new Error("You can't connect with this person");
}

async function assertUnderRateLimit(fromUid: string): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const snap = await adminRefs(getAdminFirestore())
    .connectionRequests.where("fromUserId", "==", fromUid)
    .where("createdAt", ">", since)
    .limit(REQUESTS_PER_HOUR + 1)
    .get();
  if (snap.size >= REQUESTS_PER_HOUR) {
    throw new Error("You're sending requests too quickly — try again later");
  }
}

/** Send a connection request. Prevents self/duplicate/blocked/rate-limited sends. */
export async function sendConnectionRequest(fromUid: string, toUid: string): Promise<void> {
  if (fromUid === toUid) throw new Error("You can't connect with yourself");

  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const now = new Date().toISOString();

  await assertNotBlocked(fromUid, toUid);
  await assertUnderRateLimit(fromUid);

  // Duplicate guard: any pending request in either direction.
  const [outgoing, incoming] = await Promise.all([
    refs.connectionRequests
      .where("fromUserId", "==", fromUid)
      .where("toUserId", "==", toUid)
      .where("status", "==", "pending")
      .limit(1)
      .get(),
    refs.connectionRequests
      .where("fromUserId", "==", toUid)
      .where("toUserId", "==", fromUid)
      .where("status", "==", "pending")
      .limit(1)
      .get(),
  ]);
  if (!outgoing.empty) throw new Error("Request already sent");
  if (!incoming.empty) throw new Error("This person already sent you a request — check Matches");

  const existingConnection = await refs.connections.doc(pairIdOf(fromUid, toUid)).get();
  if (existingConnection.exists) throw new Error("You're already connected");

  const targetProfile = await refs.userProfiles.doc(toUid).get();
  const targetData = targetProfile.data() as
    | { preferences?: { notifyOnConnection?: boolean } }
    | undefined;

  const requestRef = await refs.connectionRequests.add({
    fromUserId: fromUid,
    toUserId: toUid,
    status: "pending",
    note: null,
    respondedAt: null,
    connectionId: null,
    createdAt: now,
    updatedAt: now,
  } satisfies Omit<ConnectionRequest, "id">);

  if (targetData?.preferences?.notifyOnConnection !== false) {
    await createNotification({
      recipientId: toUid,
      type: "connection_request",
      actorId: fromUid,
      entityType: "connectionRequest",
      entityId: requestRef.id,
      title: "New connection request",
      body: "Someone would like to connect with you.",
    });
  }
}

/** Cancel an outgoing pending request. Only the sender may cancel. */
export async function cancelConnectionRequest(uid: string, requestId: string): Promise<void> {
  const ref = adminRefs(getAdminFirestore()).connectionRequests.doc(requestId);
  const snap = await ref.get();
  const data = snap.data() as ConnectionRequest | undefined;
  if (!data) throw new Error("Request not found");
  if (data.fromUserId !== uid) throw new Error("Not authorized");
  if (data.status !== "pending") throw new Error("Request already handled");

  const now = new Date().toISOString();
  await ref.update({ status: "canceled", respondedAt: now, updatedAt: now });
}

/**
 * Accept or decline an incoming request. Only the recipient may respond.
 * Accepting creates the canonical Connection (doc id = ordered pair) in the
 * same transaction as the status change, so no fake connections can exist.
 */
export async function respondToConnectionRequest(
  uid: string,
  requestId: string,
  accept: boolean
): Promise<void> {
  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const ref = refs.connectionRequests.doc(requestId);

  // Pre-read for authorization + notification targeting (re-validated in tx).
  const pre = await ref.get();
  const preData = pre.data() as ConnectionRequest | undefined;
  if (!preData) throw new Error("Request not found");
  if (preData.toUserId !== uid) throw new Error("Not authorized");
  if (preData.status !== "pending") throw new Error("Request already handled");
  await assertNotBlocked(preData.fromUserId, uid);
  const fromUserId = preData.fromUserId;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as ConnectionRequest | undefined;
    if (!data) throw new Error("Request not found");
    if (data.toUserId !== uid) throw new Error("Not authorized");
    if (data.status !== "pending") throw new Error("Request already handled");

    const now = new Date().toISOString();
    if (!accept) {
      tx.update(ref, { status: "declined", respondedAt: now, updatedAt: now });
      return;
    }

    tx.set(refs.connections.doc(pairIdOf(data.fromUserId, data.toUserId)), {
      id: pairIdOf(data.fromUserId, data.toUserId),
      user1Id: data.fromUserId < data.toUserId ? data.fromUserId : data.toUserId,
      user2Id: data.fromUserId < data.toUserId ? data.toUserId : data.fromUserId,
      connectedAt: now,
      sourceRequestId: requestId,
      createdAt: now,
      updatedAt: now,
    } satisfies Connection);
    tx.update(ref, {
      status: "accepted",
      respondedAt: now,
      connectionId: pairIdOf(data.fromUserId, data.toUserId),
      updatedAt: now,
    });
  });

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
  const ref = adminRefs(getAdminFirestore()).connections.doc(connectionId);
  const snap = await ref.get();
  const data = snap.data() as Connection | undefined;
  if (!data) throw new Error("Connection not found");
  if (data.user1Id !== uid && data.user2Id !== uid) throw new Error("Not authorized");
  await ref.delete();
}
