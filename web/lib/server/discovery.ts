import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/models/user";
import type { ConnectionRowView, ProfileCardView } from "@/lib/feature/types";
import { mapProfileCardRow, mapProfileRow, publicProfileSelectList, profilePhotoUrl } from "@/lib/server/profiles";
import { hydrateDiscoveryProfile, isDiscoveryUserId } from "@/lib/utils/discovery-profile";

// Keep discovery independent of unrelated profile-editing columns.
const DISCOVERY_PROFILE_FIELDS = "user_id, display_name, bio, interests, location, country, date_of_birth, relationship_status, profile_type, photos";

type DiscoveryDatabaseError = { code?: string; message: string; details?: string | null; hint?: string | null };

function assertDiscoveryQuery(stage: string, error: DiscoveryDatabaseError | null): void {
  if (!error) return;
  // Server logs only: no credentials, query parameters, or returned account records.
  console.error("[discover] Database query failed", {
    stage, code: error.code, message: error.message, details: error.details, hint: error.hint,
  });
  throw new Error(`Discover query failed: ${stage} (${error.code ?? "unknown"})`, { cause: error });
}


/**
 * Discovery + matches queries (server-side).
 *
 * STRATEGY: Supabase queries with proper indexing. We run narrow, indexed
 * queries (discoverable profiles, this user's requests/connections) and do
 * exclusion filtering (self, blocked, already-connected) server-side on small
 * bounded result sets. The full user collection is never downloaded to any client.
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

/** Convert snake_case DB row to camelCase UserProfile (delegates to shared safe mapper). */
function dbToUserProfile(row: unknown): UserProfile {
  const profile = mapProfileRow(row as Record<string, unknown> | null);
  if (!profile) {
    throw new Error("Profile record is missing — could not read profile id.");
  }
  return profile;
}

/**
 * Profiles eligible for discovery, filtered and shaped for ProfileCard.
 */
export async function getDiscoverProfiles(
  viewerUid: string,
  filters: DiscoveryFiltersInput = {}
): Promise<ProfileCardView[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  if (!isDiscoveryUserId(viewerUid)) {
    console.error("[discover] Invalid authenticated viewer UUID");
    throw new Error("Invalid discovery viewer");
  }

  // Legacy profiles may have no owner. Never pass null IDs to users.id IN (...).
  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select(DISCOVERY_PROFILE_FIELDS)
    .not("user_id", "is", null)
    .neq("user_id", viewerUid)
    .eq("discoverable", true)
    .eq("visibility", "public")
    .limit(DISCOVERY_LIMIT);
  assertDiscoveryQuery("profiles.candidates", profilesError);
  const profileRowsTyped = (profileRows ?? []).filter(
    (row) => isDiscoveryUserId(row.user_id)
  );
  if (profileRowsTyped.length !== (profileRows?.length ?? 0)) {
    console.warn("[discover] Skipped profiles with invalid owner IDs");
  }
  if (!profileRowsTyped.length) return [];

  // A missing viewer profile is normal during onboarding; a DB error is not.
  const { data: viewerProfileRow, error: viewerError } = await supabase
    .from("profiles")
    .select("interests")
    .eq("user_id", viewerUid)
    .maybeSingle();
  assertDiscoveryQuery("profiles.viewer_interests", viewerError);
  const viewerInterests: string[] = Array.isArray(viewerProfileRow?.interests)
    ? viewerProfileRow.interests.filter((interest: unknown): interest is string => typeof interest === "string")
    : [];

  // Fetch connection/request/block data in parallel
  const [outgoingResult, incomingResult, conn1Result, conn2Result, blocksByMeResult, blocksOnMeResult] =
    await Promise.all([
      supabase
        .from("connection_requests")
        .select("id, to_user_id")
        .eq("from_user_id", viewerUid)
        .eq("status", "pending"),
      supabase
        .from("connection_requests")
        .select("id, from_user_id")
        .eq("to_user_id", viewerUid)
        .eq("status", "pending"),
      supabase.from("connections").select("id").eq("user1_id", viewerUid),
      supabase.from("connections").select("id").eq("user2_id", viewerUid),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", viewerUid),
      supabase.from("blocks").select("blocker_id").eq("blocked_id", viewerUid),
    ]);

  // Fail closed: silently treating a failed block query as empty is unsafe.
  const relatedQueries = [
    ["connection_requests.outgoing", outgoingResult],
    ["connection_requests.incoming", incomingResult],
    ["connections.user1", conn1Result],
    ["connections.user2", conn2Result],
    ["blocks.by_viewer", blocksByMeResult],
    ["blocks.on_viewer", blocksOnMeResult],
  ] as const;
  for (const [stage, result] of relatedQueries) {
    assertDiscoveryQuery(stage, result.error);
  }

  // Build Sets for filtering
  const outgoingIds = new Set<string>();
  const incomingIds = new Set<string>();
  const outgoingMap = new Map<string, string>();
  const incomingMap = new Map<string, string>();

  for (const r of outgoingResult.data ?? []) {
    outgoingIds.add(r.to_user_id);
    outgoingMap.set(r.to_user_id, r.id);
  }

  for (const r of incomingResult.data ?? []) {
    incomingIds.add(r.from_user_id);
    incomingMap.set(r.from_user_id, r.id);
  }

  const connectedIds = new Set<string>();
  for (const c of [...(conn1Result.data ?? []), ...(conn2Result.data ?? [])]) {
    connectedIds.add((c as { id: string }).id);
  }

  const blockedIds = new Set<string>([
    ...(blocksByMeResult.data ?? []).map((b: { blocked_id: string }) => b.blocked_id),
    ...(blocksOnMeResult.data ?? []).map((b: { blocker_id: string }) => b.blocker_id),
  ]);

  // Account display fields are provisioned separately from profile details.
  // Only fetch public display fields for this bounded set of candidates.
  const { data: accounts, error: accountsError } = await supabase
    .from("users")
    .select("id, display_name, username, avatar_url, country, status")
    .in("id", profileRowsTyped.map((row) => row.user_id))
    .eq("status", "active");
  assertDiscoveryQuery("users.public_display_fields", accountsError);
  const accountsById = new Map((accounts ?? []).map((account) => [account.id, account]));
  const profiles = profileRowsTyped.flatMap((row) => {
    const hydrated = hydrateDiscoveryProfile(row, accountsById.get(row.user_id));
    return hydrated ? [dbToUserProfile(hydrated)] : [];
  });

  // Apply filters
  const filtered = profiles.filter((p) => {
    // Exclude self, blocked, already connected, pending
    if (p.userId === viewerUid) return false;
    if (blockedIds.has(p.userId)) return false;
    if (connectedIds.has(pairIdOf(p.userId, viewerUid))) return false;

    // Age filter
    if (filters.ageRange) {
      const age = ageFromDob(p.dateOfBirth);
      if (age === null || age < filters.ageRange.min || age > filters.ageRange.max) {
        return false;
      }
    }

    // Location filter (fuzzy match)
    if (filters.location && p.location) {
      if (!p.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    // Profile type filter
    if (filters.profileType && filters.profileType !== "all") {
      if (filters.profileType === "people" && p.profileType === "coupled") return false;
      if (filters.profileType === "couples" && p.profileType !== "coupled") return false;
    }

    // Relationship status filter
    if (filters.relationshipStatus && filters.relationshipStatus !== "any") {
      if (p.relationshipStatus !== filters.relationshipStatus) return false;
    }

    return true;
  });

  // Sort by interest overlap (descending), then by creation date (newest first)
  const scored = filtered
    .map((p) => ({
      profile: p,
      overlap: p.interests.filter((i: string) => viewerInterests.includes(i)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap);

  return scored.map(({ profile: p }) => ({
    id: p.userId,
    name: p.displayName,
    kind: p.profileType === "coupled" ? "couple" : "person",
    location: p.location ?? "",
    bio: p.bio ?? "",
    interests: p.interests,
    sharedInterests: p.interests.filter((i: string) => viewerInterests.includes(i)).length,
    connection: stateFor(p.userId, viewerUid, connectedIds, outgoingIds, incomingIds),
    ...(outgoingMap.has(p.userId) && { requestId: outgoingMap.get(p.userId) }),
    ...(incomingMap.has(p.userId) && { requestId: incomingMap.get(p.userId) }),
    href: `/profile/${p.userId}`,
    age: ageFromDob(p.dateOfBirth) ?? undefined,
    avatarUrl: profilePhotoUrl(p),
  }));
}

/* ------------------------------------------------------------------ */
/* Matches query                                                       */
/* ------------------------------------------------------------------ */

/** Display name fallback for profiles that may have been deleted. */
async function displayNamesFor(
  uids: string[]
): Promise<Map<string, { name: string; kind: "person" | "couple" }>> {
  const map = new Map<string, { name: string; kind: "person" | "couple" }>();

  if (uids.length === 0) return map;

  const supabase = getSupabaseServerClient();
  if (!supabase) return map;

  const { data: profileRows } = await supabase
    .from("profiles")
    .select(publicProfileSelectList())
    .in("user_id", uids);

  for (const row of profileRows ?? []) {
    const card = mapProfileCardRow(row);
    if (!card) continue;
    map.set(card.id, { name: card.name, kind: card.kind });
  }

  return map;
}

/**
 * Public profile summary used by leaderboards and discovery cards.
 */
export interface TopProfile {
  id: string;
  name: string;
  kind: "person" | "couple";
  location: string | null;
}

/**
 * Top profiles for community leaderboard display.
 *
 * Fetches the most recently active discoverable profiles from the `profiles`
 * table. Works without a viewer session — no self/blocked filtering needed
 * since this is a public leaderboard.
 */
export async function getTopProfiles(limit = 10): Promise<TopProfile[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, profile_type, location")
    .eq("discoverable", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.user_id as string,
    name: (row.display_name as string) ?? "Member",
    kind: (row.profile_type as string) === "coupled" ? "couple" as const : "person" as const,
    location: row.location as string | null,
  }));
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
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const [incomingResult, outgoingResult, conn1Result, conn2Result] = await Promise.all([
    supabase
      .from("connection_requests")
      .select("*")
      .eq("to_user_id", uid)
      .eq("status", "pending"),
    supabase
      .from("connection_requests")
      .select("*")
      .eq("from_user_id", uid)
      .eq("status", "pending"),
    supabase.from("connections").select("*").eq("user1_id", uid),
    supabase.from("connections").select("*").eq("user2_id", uid),
  ]);

  // Resolve every participant name once
  const participantIds = new Set<string>();

  for (const r of incomingResult.data ?? []) {
    participantIds.add((r as { from_user_id: string }).from_user_id);
  }
  for (const r of outgoingResult.data ?? []) {
    participantIds.add((r as { to_user_id: string }).to_user_id);
  }
  for (const c of [...(conn1Result.data ?? []), ...(conn2Result.data ?? [])]) {
    const conn = c as { user1_id: string; user2_id: string };
    participantIds.add(conn.user1_id === uid ? conn.user2_id : conn.user1_id);
  }

  const names = await displayNamesFor([...participantIds]);

  const incoming: ConnectionRowView[] = (incomingResult.data ?? []).map(
    (r) => {
      const req = r as { id: string; from_user_id: string; created_at: string };
      const who = names.get(req.from_user_id);
      return {
        id: req.id,
        name: who?.name ?? "Former member",
        kind: who?.kind ?? "person",
        location: "",
        at: req.created_at,
        connection: "incoming_pending" as const,
      };
    }
  );

  const outgoing: ConnectionRowView[] = (outgoingResult.data ?? []).map(
    (r) => {
      const req = r as { id: string; to_user_id: string; created_at: string };
      const who = names.get(req.to_user_id);
      return {
        id: req.id,
        name: who?.name ?? "Former member",
        kind: who?.kind ?? "person",
        location: "",
        at: req.created_at,
        connection: "outgoing_pending" as const,
      };
    }
  );

  const connected: ConnectionRowView[] = [
    ...(conn1Result.data ?? []),
    ...(conn2Result.data ?? []),
  ].map((c) => {
    const conn = c as { id: string; user1_id: string; user2_id: string; connected_at: string };
    const other = conn.user1_id === uid ? conn.user2_id : conn.user1_id;
    const who = names.get(other);
    return {
      id: conn.id,
      name: who?.name ?? "Former member",
      kind: who?.kind ?? "person",
      location: "",
      at: conn.connected_at,
      connection: "connected" as const,
      connectionId: conn.id,
    };
  });

  return { incoming, outgoing, connected };
}