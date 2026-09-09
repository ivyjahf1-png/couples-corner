/**
 * Couples Corner — Firestore collection registry & typed data access.
 *
 * Single source of truth for collection names and typed references for both
 * the client SDK (rule-limited) and the Admin SDK (server-only, rule-bypassing).
 * Doc shapes come from `lib/models` so the schema stays consistent everywhere.
 *
 * SECURITY NOTE: clients may only reach data through Firestore Security Rules
 * (`firestore.rules`). Anything that must bypass rules (notifications fan-out,
 * status changes, audit logs) must use the Admin SDK on the server.
 */

import { collection, doc } from "firebase/firestore";
import type { Firestore as AdminFirestore } from "firebase-admin/firestore";

export const COLLECTIONS = {
  users: "users",
  userProfiles: "profiles",
  coupleProfiles: "coupleProfiles",
  coupleMembers: "coupleMembers",
  connectionRequests: "connectionRequests",
  connections: "connections",
  conversations: "conversations",
  messages: "messages", // subcollection of conversations/{id}
  posts: "posts",
  postMedia: "postMedia", // subcollection of posts/{id}
  likes: "likes", // subcollection of posts/{id}; doc id = liker uid
  comments: "comments", // subcollection of posts/{id}
  notifications: "notifications",
    blocks: "blocks", // doc id: blockerId_blockedId (canonical order)
  reports: "reports",
  riskFlags: "riskFlags", // server-written only; clients can never touch this
  auditLogs: "auditLogs",
  usernames: "usernames", // username -> uid uniqueness reservations
  content: "content", // promotional content & advertisements (admin-managed)
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/** Client-side typed collection refs (call inside "use client" code only). */
export function clientRefs(firestore: Parameters<typeof collection>[0]) {
  return {
    users: collection(firestore, COLLECTIONS.users),
    userProfiles: collection(firestore, COLLECTIONS.userProfiles),
    coupleProfiles: collection(firestore, COLLECTIONS.coupleProfiles),
    coupleMembers: collection(firestore, COLLECTIONS.coupleMembers),
    connectionRequests: collection(firestore, COLLECTIONS.connectionRequests),
    connections: collection(firestore, COLLECTIONS.connections),
    conversations: collection(firestore, COLLECTIONS.conversations),
    notifications: collection(firestore, COLLECTIONS.notifications),
    blocks: collection(firestore, COLLECTIONS.blocks),
    reports: collection(firestore, COLLECTIONS.reports),
  };
}

/** Server-side (Admin SDK) typed collection refs. */
export function adminRefs(db: AdminFirestore) {
  return {
    users: db.collection(COLLECTIONS.users),
    userProfiles: db.collection(COLLECTIONS.userProfiles),
    coupleProfiles: db.collection(COLLECTIONS.coupleProfiles),
    coupleMembers: db.collection(COLLECTIONS.coupleMembers),
    connectionRequests: db.collection(COLLECTIONS.connectionRequests),
    connections: db.collection(COLLECTIONS.connections),
    conversations: db.collection(COLLECTIONS.conversations),
    messages: (conversationId: string) =>
      db.collection(COLLECTIONS.conversations).doc(conversationId).collection(COLLECTIONS.messages),
    posts: db.collection(COLLECTIONS.posts),
    postMedia: (postId: string) =>
      db.collection(COLLECTIONS.posts).doc(postId).collection(COLLECTIONS.postMedia),
    likes: (postId: string) =>
      db.collection(COLLECTIONS.posts).doc(postId).collection(COLLECTIONS.likes),
    comments: (postId: string) =>
      db.collection(COLLECTIONS.posts).doc(postId).collection(COLLECTIONS.comments),
    notifications: db.collection(COLLECTIONS.notifications),
        blocks: db.collection(COLLECTIONS.blocks),
    reports: db.collection(COLLECTIONS.reports),
    riskFlags: db.collection(COLLECTIONS.riskFlags),
    auditLogs: db.collection(COLLECTIONS.auditLogs),
    usernames: db.collection(COLLECTIONS.usernames),
    content: db.collection(COLLECTIONS.content),
  };
}

/** Canonical, order-independent pair id used by `blocks` (and connection lookups). */
export function canonicalPairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export { doc };
