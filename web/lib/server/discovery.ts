import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { adminRefs } from "@/lib/firebase/collections";
import type { UserProfile } from "@/lib/models/user";
import type { ConnectionRequest, Connection } from "@/lib/models/connections";
import type { ConnectionRowView, ProfileCardView } from "@/lib/feature/types";

/**
 * Discovery + matches queries (server-side).
 *
 * STRATEGY: Firestore cannot express "exclude these ids / OR across fields"
 * efficiently, so we run narrow, indexed queries (discoverable profiles,
 * this user's requests/connections) and do exclusion filtering (self,
 * blocked, already-connected) server-side on small bounded result sets.
 * The full user collection is never downloaded to any client.
 */

/** Maximum profiles returned per discovery page. */
const DISCOVERY_LIMIT = 24;

function pairIdOf(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export interface DiscoveryFiltersInput {
  location?: string;
  ageRange?: { min: number; max: number } | null;
  interests?: string[];
  profileType?: "all" | "people" | "couples";
  relationshipStatus?: "any" | "single" | "coupled";
}

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/** Connection state of other relative to viewer, from pre-fetched sets. */
function stateFor(
  other: string,
  viewer: string,
  connectedIds: Set<string>,
  outgoingIds: Set<string>,
  incomingIds: Set<string>
): ProfileCardView["connection"] {
  if (other === viewer) return "self";
  if (connectedIds.has(pairIdOf(other, viewer))) return "connected";
  if (outgoingIds.has(other)) return "outgoing_pending";
  if (incomingIds.has(other)) return "incoming_pending";
  return "none";
}

/* ------------------------------------------------------------------ */
/* Discovery query                                                     */
/* ------------------------------------------------------------------ */

/**
 * Profiles eligible for discovery, filtered and shaped for ProfileCard.
 */
export async function getDiscoverProfiles(
  viewerUid: string,
  filters: DiscoveryFiltersInput = {}
): Promise<ProfileCardView[]> {
  const db = getAdminFirestore();
  const refs = adminRefs(db);

  const viewerProfileSnap = await refs.userProfiles.doc(viewerUid).get();
  const viewerProfile = viewerProfileSnap.data() as UserProfile | undefined;
  const viewerInterests = viewerProfile?.interests ?? [];

  const [outgoingSnap, incomingSnap, conn1Snap, conn2Snap, blocksByMe, blocksOnMe] =
    await Promise.all([
      refs.connectionRequests
        .where("fromUserId", "==", viewerUid)
        .where("status", "==", "pending")
        .get(),
      refs.connectionRequests
        .where("toUserId", "==", viewerUid)
        .where("status", "==", "pending")
        .get(),
      refs.connections.where("user1Id", "==", viewerUid).get(),
      refs.connections.where("user2Id", "==", viewerUid).get(),
      refs.blocks.where("blockerId", "==", viewerUid).get(),
      refs.blocks.where("blockedId", "==", viewerUid).get(),
    ]);

  // Correctly declared Sets + Maps
  const outgoingIds = new Set<string>();
  const incomingIds = new Set<string>();
  const outgoingMap = new Map<string, string>(); // otherUid -> requestId
  const incomingMap = new Map<string, string>(); // otherUid -> requestId

  for (const doc of outgoingSnap.docs) {
    const r = doc.data() as ConnectionRequest;
    outgoingIds.add(r.toUserId);
    outgoingMap.set(r.toUserId, doc.id);
  }

  for (const doc of incomingSnap.docs) {
    const r = doc.data() as ConnectionRequest;
    incomingIds.add(r.fromUserId);
    incomingMap.set(r.fromUserId, doc.id);
  }

  const connectedIds = new Set<string>();
  for (const doc of [...conn1Snap.docs, ...conn2Snap.docs]) {
    const c = doc.data() as Connection;
    connectedIds.add(pairIdOf(c.user1Id, c.user2Id));
  }

  const blockedIds = new Set<string>([
    ...blocksByMe.docs.map((d) => (d.data() as { blockedId: string }).blockedId),
    ...blocksOnMe.docs.map((d) => (d.data() as { blockerId: string }).blockerId),
  ]);

  const blockedByMeSet = new Set(
    blocksByMe.docs.map((d) => (d.data() as { blockedId: string }).blockedId)
  );

  // Base discovery query
  const interestFilter = filters.interests?.[0];
  let base = refs.userProfiles
    .where("discoverable", "==", true)
    .where("visibility", "==", "public");

  if (interestFilter) {
    base = base.where("interests", "array-contains", interestFilter);
  }

  const snap = await base.limit(DISCOVERY_LIMIT).get();

  const results: ProfileCardView[] = [];

  for (const doc of snap.docs) {
    const profile = doc.data() as UserProfile;
    const uid = profile.userId ?? doc.id;

    if (uid === viewerUid || blockedIds.has(uid)) continue;
    if (connectedIds.has(pairIdOf(uid, viewerUid))) continue;

    const age = ageFromDob(profile.dateOfBirth);

    if (filters.ageRange) {
      if (age === null || age < filters.ageRange.min || age > filters.ageRange.max) {
        continue;
      }
    }

    if (
      filters.location &&
      !(profile.location ?? "").toLowerCase().includes(filters.location.toLowerCase())
    ) {
      continue;
    }

    if (filters.profileType === "people" && profile.profileType === "coupled") continue;
    if (filters.profileType === "couples" && profile.profileType !== "coupled") continue;
    if (filters.relationshipStatus === "single" && profile.profileType === "coupled") continue;
    if (filters.relationshipStatus === "coupled" && profile.profileType !== "coupled") continue;

    if (filters.interests && filters.interests.length > 1) {
      const has = filters.interests.some((i) => profile.interests.includes(i));
      if (!has) continue;
    }

    const state = stateFor(uid, viewerUid, connectedIds, outgoingIds, incomingIds);

    results.push({
      id: uid,
      name: profile.displayName,
      kind: profile.profileType === "coupled" ? "couple" : "person",
      location: profile.location ?? "",
      bio: profile.bio ?? "",
      interests: profile.interests,
      sharedInterests: profile.interests.filter((i) => viewerInterests.includes(i)).length,
      connection: state,
href: `/profile/${uid}`,      age: age ?? undefined,
      avatarUrl: profile.photos?.[0]?.storagePath ?? null,
      blockedByMe: blockedByMeSet.has(uid),
      ...(state === "outgoing_pending"
        ? { requestId: outgoingMap.get(uid) }
        : state === "incoming_pending"
          ? { requestId: incomingMap.get(uid) }
          : {}),
    });

    if (results.length >= DISCOVERY_LIMIT) break;
  }

  return results;
}

/* ------------------------------------------------------------------ */
/* Matches query                                                       */
/* ------------------------------------------------------------------ */

/** Display name fallback for profiles that may have been deleted. */
async function displayNamesFor(
  uids: string[]
): Promise<Map<string, { name: string; kind: "person" | "couple" }>> {
  const map = new Map<string, { name: string; kind: "person" | "couple" }>();

  await Promise.all(
    uids.map(async (uid) => {
      const snap = await adminRefs(getAdminFirestore()).userProfiles.doc(uid).get();
      const profile = snap.data() as UserProfile | undefined;
      map.set(uid, {
        name: profile?.displayName ?? "Former member",
        kind: profile?.profileType === "coupled" ? "couple" : "person",
      });
    })
  );

  return map;
}

export interface MatchesData {
  incoming: ConnectionRowView[];
  outgoing: ConnectionRowView[];
  connected: ConnectionRowView[];
}

/**
 * The signed-in user's request/connection buckets for /matches.
 */
export async function getMatchesData(uid: string): Promise<MatchesData> {
  const db = getAdminFirestore();
  const refs = adminRefs(db);

  const [incomingSnap, outgoingSnap, conn1Snap, conn2Snap] = await Promise.all([
    refs.connectionRequests
      .where("toUserId", "==", uid)
      .where("status", "==", "pending")
      .get(),
    refs.connectionRequests
      .where("fromUserId", "==", uid)
      .where("status", "==", "pending")
      .get(),
    refs.connections.where("user1Id", "==", uid).get(),
    refs.connections.where("user2Id", "==", uid).get(),
  ]);

  // Resolve every participant name once
  const participantIds = new Set<string>();

  for (const doc of incomingSnap.docs) {
    participantIds.add((doc.data() as ConnectionRequest).fromUserId);
  }
  for (const doc of outgoingSnap.docs) {
    participantIds.add((doc.data() as ConnectionRequest).toUserId);
  }
  for (const doc of [...conn1Snap.docs, ...conn2Snap.docs]) {
    const c = doc.data() as Connection;
    participantIds.add(c.user1Id === uid ? c.user2Id : c.user1Id);
  }

  const names = await displayNamesFor([...participantIds]);

  const incoming: ConnectionRowView[] = incomingSnap.docs.map((doc) => {
    const r = doc.data() as ConnectionRequest;
    const who = names.get(r.fromUserId);
    return {
      id: doc.id,
      name: who?.name ?? "Former member",
      kind: who?.kind ?? "person",
      location: "",
      at: r.createdAt,
      connection: "incoming_pending" as const,
    };
  });

  const outgoing: ConnectionRowView[] = outgoingSnap.docs.map((doc) => {
    const r = doc.data() as ConnectionRequest;
    const who = names.get(r.toUserId);
    return {
      id: doc.id,
      name: who?.name ?? "Former member",
      kind: who?.kind ?? "person",
      location: "",
      at: r.createdAt,
      connection: "outgoing_pending" as const,
    };
  });

  const connected: ConnectionRowView[] = [...conn1Snap.docs, ...conn2Snap.docs].map(
    (doc) => {
      const c = doc.data() as Connection;
      const other = c.user1Id === uid ? c.user2Id : c.user1Id;
      const who = names.get(other);
      return {
        id: doc.id,
        name: who?.name ?? "Former member",
        kind: who?.kind ?? "person",
        location: "",
        at: c.connectedAt,
        connection: "connected" as const,
        connectionId: doc.id,
      };
    }
  );

  return { incoming, outgoing, connected };
}