import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit, recordAuditBestEffort } from "./audit";
import { validateMediaFile } from "@/lib/utils/media-upload";
import { scanMessage, addRiskSignal } from "./safety";
import type { ProfilePhoto, UserProfile, User } from "@/lib/models/user";
import type { ProfileVisibility } from "@/lib/models";
import { computeProfileCompletion, type ProfileCompletion } from "@/lib/utils/profile-completion";

export interface ProfileUpdateInput {
  displayName?: string;
  bio?: string | null;
  interests?: string[];
  location?: string | null;
  country?: string | null;
  gender?: string | null;
  orientation?: string | null;
  dateOfBirth?: string | null;
  relationshipStatus?: string | null;
  occupation?: string | null;
  genotype?: string | null;
  profileType?: "single" | "coupled" | "open" | null;
  lookingFor?: string | null;
  visibility?: ProfileVisibility;
  discoverable?: boolean;
}

export const PROFILE_DB_FIELDS = [
  "user_id",
  "display_name",
  "bio",
  "interests",
  "location",
  "country",
  "gender",
  "orientation",
  "date_of_birth",
  "relationship_status",
  "occupation",
  "genotype",
  "profile_type",
  "looking_for",
  "visibility",
  "discoverable",
  "preferences",
  "photos",
  "created_at",
  "updated_at",
] as const;

export type ProfileDbField = (typeof PROFILE_DB_FIELDS)[number];

/** Supabase Storage bucket that holds profile photos at `profiles/{uid}/{file}`. */
export const PROFILE_PHOTOS_BUCKET = "photos";

export function profileSelectList(): string {
  return PROFILE_DB_FIELDS.join(", ");
}

export function publicProfileSelectList(): string {
  return profileSelectList();
}

export function mapProfileRow(row: Record<string, unknown> | null): UserProfile | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    id: r.user_id as string,
    userId: r.user_id as string,
    userCode: typeof r.user_code === "string" ? r.user_code : null,
    displayName: (r.display_name as string) ?? "",
    visibility: (r.visibility as ProfileVisibility) ?? "public",
    discoverable: r.discoverable == null ? true : Boolean(r.discoverable),
    photos: (r.photos as UserProfile["photos"]) ?? [],
    lookingFor: r.looking_for as string | null,
    interests: Array.isArray(r.interests) ? r.interests : [],
    bio: r.bio as string | null,
    location: r.location as string | null,
    country: r.country as string | null,
    gender: r.gender as string | null,
    orientation: r.orientation as string | null,
    dateOfBirth: r.date_of_birth as string | null,
    relationshipStatus: r.relationship_status as string | null,
    occupation: r.occupation as string | null,
    genotype: r.genotype as string | null,
    profileType: (r.profile_type as UserProfile["profileType"]) ?? null,
    preferences: (r.preferences as UserProfile["preferences"]) ?? {
      notifyOnConnection: true,
      notifyOnMessages: true,
      showOnlineStatus: true,
    },
    name: (r.display_name as string) ?? "",
    kind: (r.profile_type as string) === "coupled" ? "couple" : "person",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function mapProfileCardRow(row: unknown): {
  id: string;
  displayName: string;
  profileType: "single" | "coupled" | "open" | null;
  bio: string | null;
  interests: string[];
  location: string | null;
  gender: string | null;
  orientation: string | null;
  occupation: string | null;
  genotype: string | null;
  country: string | null;
  photos: ProfilePhoto[];
  name: string;
  kind: "person" | "couple";
} | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    id: r.user_id as string,
    displayName: (r.display_name as string) ?? "",
    profileType: (r.profile_type as "single" | "coupled" | "open" | null) ?? null,
    bio: r.bio as string | null,
    interests: Array.isArray(r.interests) ? r.interests : [],
    location: r.location as string | null,
    gender: r.gender as string | null,
    orientation: r.orientation as string | null,
    occupation: r.occupation as string | null,
    genotype: r.genotype as string | null,
    country: r.country as string | null,
    photos: Array.isArray(r.photos) ? (r.photos as ProfilePhoto[]) : [],
    name: (r.display_name as string) ?? "",
    kind: r.profile_type === "coupled" ? "couple" : "person",
  };
}
export function profileUpdateFromInput(input: ProfileUpdateInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (input.displayName !== undefined) updates.display_name = input.displayName.trim();
  if (input.bio !== undefined) updates.bio = input.bio?.trim() || null;
  if (input.interests !== undefined) updates.interests = input.interests;
  if (input.location !== undefined) updates.location = input.location?.trim() || null;
  if (input.country !== undefined) updates.country = input.country?.trim() || null;
  if (input.gender !== undefined) updates.gender = input.gender?.trim() || null;
  if (input.orientation !== undefined) updates.orientation = input.orientation?.trim() || null;
  if (input.dateOfBirth !== undefined) updates.date_of_birth = input.dateOfBirth;
  if (input.relationshipStatus !== undefined)
    updates.relationship_status = input.relationshipStatus?.trim() ?? null;
  if (input.occupation !== undefined) updates.occupation = input.occupation?.trim() || null;
  if (input.genotype !== undefined) updates.genotype = input.genotype?.trim() || null;
  if (input.profileType !== undefined) updates.profile_type = input.profileType;
  if (input.lookingFor !== undefined) updates.looking_for = input.lookingFor?.trim() || null;
  if (input.visibility !== undefined) updates.visibility = input.visibility;
  if (input.discoverable !== undefined) updates.discoverable = input.discoverable;
  return updates;
}

export type { ProfileCompletion };
export { computeProfileCompletion };

export async function ensureStorageBucket(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  bucket: string
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  // Check if the bucket exists
  const { error: getError } = await supabase.storage.getBucket(bucket);

  // If no error, bucket exists — we're done.
  if (!getError) return;

  // Bucket doesn't exist — attempt to create it.
  // This requires the service_role key to have storage.admin privileges.
  const { error: createError } = await supabase.storage.createBucket(bucket, { public: true });

  if (!createError) return;

  // Determine the type of error and provide a helpful message.
  const errMsg = createError.message ?? "";
  const isBucketAlreadyExists =
    errMsg.toLowerCase().includes("already exists") ||
    errMsg.toLowerCase().includes("bucket already exists");

  if (isBucketAlreadyExists) {
    // Race condition: another request created the bucket between our check and create.
    // This is fine — the bucket exists, so we can proceed.
    return;
  }

  // Check if it's a permissions error (common when service_role key lacks storage.admin)
  const isPermissionsError =
    errMsg.toLowerCase().includes("permission") ||
    errMsg.toLowerCase().includes("forbidden") ||
    errMsg.toLowerCase().includes("unauthorized");

  if (isPermissionsError) {
    throw new Error(
      `Could not create storage bucket "${bucket}": ${createError.message}. ` +
      `This usually means the SUPABASE_SERVICE_ROLE_KEY doesn't have storage.admin privileges. ` +
      `Ensure you're using the service_role key (not the anon key) from Supabase Dashboard → Settings → API.`
    );
  }

  // Other errors (network, Supabase API issues, etc.)
  throw new Error(
    `Could not create storage bucket "${bucket}": ${createError.message}. ` +
    `If the bucket exists but creation failed, verify the bucket name and try again.`
  );
}

export function photoStoragePathToApiUrl(storagePath: string): string {
  const segments = storagePath.split("/");
  const fileName = segments.pop();
  const uid = segments.pop();
  return `/api/photos/${uid}/${fileName}`;
}

export function profilePhotoUrl(
  profile: Pick<UserProfile, "userId" | "photos"> | null | undefined
): string | null {
  if (!profile || profile.photos.length === 0) return null;
  const primary = profile.photos.find((p: ProfilePhoto) => p.isPrimary) ?? profile.photos[0];
  return primary.publicUrl || photoStoragePathToApiUrl(primary.storagePath);
}

export function dbToUserProfile(row: unknown): UserProfile {
  const profile = mapProfileRow(row as Record<string, unknown> | null);
  if (!profile) {
    throw new Error("Profile record is missing — could not read profile id.");
  }
  return profile;
}

function dbToUser(row: Record<string, unknown> | null): User {
  if (!row) {
    throw new Error("User record is missing — could not read user id.");
  }
  return {
    id: row.id as string,
    authUid: row.id as string,
    email: row.email as string,
    emailVerified: row.email_verified as boolean,
    username: row.username as string,
    displayName: row.display_name as string,
    avatarUrl: row.avatar_url as string | null,
    dateOfBirth: row.date_of_birth as string | null,
    gender: row.gender as string | null,
    orientation: row.orientation as string | null,
    bio: row.bio as string | null,
    location: row.location as string | null,
    country: row.country as string | null,
    occupation: row.occupation as string | null,
    locationPoint: row.location_point as User["locationPoint"],
    interests: (row.interests as string[]) ?? [],
    relationshipStatus: row.relationship_status as string | null,
    profileType: row.profile_type as User["profileType"],
    onboardingCompleted: row.onboarding_completed as boolean,
    role: row.role as User["role"],
    status: row.status as User["status"],
    lastActiveAt: row.last_active_at as string | null,
    photos: (row.photos as User["photos"]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
export async function getOwnProfile(uid: string): Promise<{
  user: User | null;
  profile: UserProfile | null;
}> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const [{ data: userRow }, { data: profileRow }] = await Promise.all([
    supabase.from("users").select("*").eq("id", uid).single(),
    supabase.from("profiles").select(profileSelectList()).eq("user_id", uid).single(),
  ]);

  return {
    user: userRow ? dbToUser(userRow) : null,
    profile: profileRow ? dbToUserProfile(profileRow) : null,
  };
}

/** Look up a public profile by its exact five-character public code. */
export async function getProfileByUserCode(
  code: string,
  viewerUid: string | null
): Promise<UserProfile | null> {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(normalized)) return null;
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  // Some deployed databases predate the public user_code column. Keep this
  // lookup compatible with that schema; the profile UI owns the persistent
  // client code and the profile ID remains available from `user_id`.
  const { data } = await supabase
    .from("profiles")
    .select(profileSelectList())
    .eq("user_id", normalized)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const profile = dbToUserProfile(data);
  if (profile.visibility === "private" && viewerUid !== profile.userId) return null;
  return profile;
}

/**
 * Look up a profile by its exact public code (two digits + four letters).
 *
 * IMPORTANT: this queries the `user_code` column. `getProfileByUserCode` in
 * this same file still resolves against `user_id` with a five-character
 * pattern, which never matches the codes minted by migration 032. Invite
 * attribution must use this function, not that one.
 */
export async function resolveUserCode(
  rawCode: string
): Promise<{ userId: string; displayName: string | null } | null> {
  const normalized = rawCode.trim().toUpperCase();
  if (!/^\d{2}[A-Z]{4}$/.test(normalized)) return null;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("user_code", normalized)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as { user_id?: string | null; display_name?: string | null };
  if (!row.user_id) return null;
  return { userId: row.user_id, displayName: row.display_name ?? null };
}

export type MemberSearchResult =
  | { kind: "exact"; userId: string }
  | { kind: "results"; users: { userId: string; displayName: string; userCode: string | null }[] }
  | { kind: "none" };

/**
 * Search members by public 6-character code OR display name.
 *
 * Two ordered strategies, because a code and a name live in different columns:
 *   1. Exact `user_code` match -> a single deterministic hit.
 *   2. Case-insensitive `display_name` prefix/substring match -> up to 12
 *      candidates for the caller to choose from.
 *
 * Only public, non-private profiles are returned. RLS on `profiles` already
 * restricts what the server client can read; the visibility filter here is a
 * second, explicit guard so a private profile never appears in search results.
 */
export async function searchMembers(rawQuery: string): Promise<MemberSearchResult> {
  const query = rawQuery.trim();
  if (query.length < 2) return { kind: "none" };

  const supabase = getSupabaseServerClient();
  if (!supabase) return { kind: "none" };

  // Strategy 1: exact public code.
  const code = query.toUpperCase();
  if (/^\d{2}[A-Z]{4}$/.test(code)) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, visibility")
      .eq("user_code", code)
      .limit(1)
      .maybeSingle();
    const row = data as { user_id?: string | null; visibility?: string | null } | null;
    if (row?.user_id) {
      return { kind: "exact", userId: row.user_id };
    }
  }

  // Strategy 2: display name. ilike() is a literal match (no wildcard
  // interpretation of user input), so a stray % cannot widen the query.
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, user_code, visibility")
    .ilike("display_name", `%${query}%`)
    .neq("visibility", "private")
    .order("display_name", { ascending: true })
    .limit(12);

  const users = (data ?? [])
    .map((raw) => {
      const row = raw as {
        user_id?: string | null;
        display_name?: string | null;
        user_code?: string | null;
      };
      if (!row.user_id) return null;
      return {
        userId: row.user_id,
        displayName: row.display_name ?? "Member",
        userCode: row.user_code ?? null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return users.length > 0 ? { kind: "results", users } : { kind: "none" };
}

export async function getVisibleProfile(
  targetUid: string,
  viewerUid: string | null
): Promise<UserProfile | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(profileSelectList())
    .eq("user_id", targetUid)
    .single();

  if (!profileRow) return null;

  const profile = dbToUserProfile(profileRow);

  if (profile.visibility === "private" && viewerUid !== targetUid) return null;

  if (viewerUid && viewerUid !== targetUid) {
    const pairId = viewerUid < targetUid ? `${viewerUid}_${targetUid}` : `${targetUid}_${viewerUid}`;
    const { data: blockRow } = await supabase
      .from("blocks")
      .select("id")
      .eq("id", pairId)
      .maybeSingle();
    if (blockRow) return null;
  }

  return profile;
}

export async function scanProfileForRisk(uid: string, input: ProfileUpdateInput): Promise<void> {
  const fields = [input.bio, input.displayName, input.location].filter(Boolean).join(" \n ");
  const signal = scanMessage(fields);
  if (!signal) return;

  await addRiskSignal({
    targetUserId: uid,
    type: signal,
    context: "profile:created-or-edited",
    source: "admin",
    score: signal === "suspicious_link" ? 30 : 20,
  });
}

export async function createProfile(
  uid: string,
  input: ProfileUpdateInput
): Promise<UserProfile> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const profilePayload: Record<string, unknown> = {
    id: uid,
    user_id: uid,
    display_name: input.displayName?.trim() || "",
    bio: input.bio?.trim() || null,
    interests: input.interests ?? [],
    looking_for: input.lookingFor?.trim() || null,
    location: input.location?.trim() || null,
    country: input.country?.trim() || null,
    gender: input.gender?.trim() || null,
    orientation: input.orientation?.trim() || null,
    date_of_birth: input.dateOfBirth || null,
    relationship_status: input.relationshipStatus?.trim() || null,
    occupation: input.occupation?.trim() || null,
    genotype: input.genotype?.trim() || null,
    profile_type: input.profileType || null,
    visibility: input.visibility ?? "public",
    discoverable: input.discoverable ?? true,
    preferences: {
      notify_on_connection: true,
      notify_on_messages: true,
      show_online_status: true,
    },
    photos: [],
    created_at: now,
    updated_at: now,
  };

  const KNOWN_PROFILE_COLUMNS = new Set<string>([...PROFILE_DB_FIELDS, "id"]);
  for (const key of Object.keys(profilePayload)) {
    if (!KNOWN_PROFILE_COLUMNS.has(key)) delete profilePayload[key];
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .insert(profilePayload)
    .select(profileSelectList())
    .single();

  if (!profileRow) {
    throw new Error(
      "Could not create profile — no profile record was returned. Check the profiles table schema and RLS policies."
    );
  }

  await recordAudit({
    adminUserId: uid,
    action: "create",
    targetRef: { type: "profile", id: uid },
    reason: "profile creation",
  });
  await scanProfileForRisk(uid, input);

  return dbToUserProfile(profileRow);
}

export async function updateOwnProfile(
  uid: string,
  input: ProfileUpdateInput
): Promise<UserProfile> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const updates = profileUpdateFromInput(input);
  updates.updated_at = now;

  const KNOWN_PROFILE_COLUMNS = new Set<string>([...PROFILE_DB_FIELDS, "id"]);
  for (const key of Object.keys(updates)) {
    if (!KNOWN_PROFILE_COLUMNS.has(key)) delete updates[key];
  }

  const { data: beforeRow } = await supabase
    .from("profiles")
    .select(profileSelectList())
    .eq("user_id", uid)
    .single();

  const base: Record<string, unknown> = (beforeRow as unknown as Record<string, unknown>) ?? {
    id: uid,
    user_id: uid,
    display_name: input.displayName?.trim() || "",
    bio: input.bio?.trim() || null,
    interests: input.interests ?? [],
    location: input.location?.trim() || null,
    country: input.country?.trim() || null,
    gender: input.gender?.trim() || null,
    orientation: input.orientation?.trim() || null,
    date_of_birth: input.dateOfBirth || null,
    relationship_status: input.relationshipStatus?.trim() || null,
    occupation: input.occupation?.trim() || null,
    genotype: input.genotype?.trim() || null,
    profile_type: input.profileType || null,
    looking_for: input.lookingFor?.trim() || null,
    visibility: input.visibility ?? "public",
    discoverable: input.discoverable ?? true,
    preferences: {
      notify_on_connection: true,
      notify_on_messages: true,
      show_online_status: true,
    },
    photos: [],
    created_at: now,
    updated_at: now,
  };

  const upsertPayload: Record<string, unknown> = {
    ...base,
    ...updates,
    updated_at: now,
  };
  for (const key of Object.keys(upsertPayload)) {
    if (!KNOWN_PROFILE_COLUMNS.has(key)) delete upsertPayload[key];
  }

  const { data: savedRow, error: upsertError } = await supabase
    .from("profiles")
    .upsert(upsertPayload, {
      onConflict: "user_id",
    })
    .select(profileSelectList())
    .single();

  if (upsertError || !savedRow) {
    throw new Error(
      upsertError?.message ??
        "Could not save your profile. Check RLS policies or the profiles table schema."
    );
  }

  await recordAudit({
    adminUserId: uid,
    action: "update",
    targetRef: { type: "profile", id: uid },
    reason: "profile edit",
    before: beforeRow as unknown as Record<string, unknown> | undefined,
    after: savedRow as unknown as Record<string, unknown>,
  });

  await scanProfileForRisk(uid, input);

  return dbToUserProfile(savedRow);
}
export async function completeOnboarding(uid: string, input: ProfileUpdateInput): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const updates = profileUpdateFromInput(input);
  updates.updated_at = new Date().toISOString();

  const KNOWN_PROFILE_COLUMNS = new Set<string>([...PROFILE_DB_FIELDS, "id"]);
  for (const key of Object.keys(updates)) {
    if (!KNOWN_PROFILE_COLUMNS.has(key)) delete updates[key];
  }

  await supabase.from("profiles").update(updates).eq("user_id", uid);

  await supabase
    .from("users")
    .update({ onboarding_completed: true, display_name: input.displayName?.trim() ?? null, gender: input.gender?.trim() ?? null, date_of_birth: input.dateOfBirth ?? null, updated_at: new Date().toISOString() })
    .eq("id", uid);

  await recordAudit({ adminUserId: uid, action: "update", targetRef: { type: "onboarding", id: uid }, reason: "onboarding completed" });
}
export async function uploadProfilePhoto(uid: string, file: File): Promise<{ url: string; path: string }> {
  const validationError = validateMediaFile(file, true);
  if (validationError) throw new Error(validationError);

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "");
  const path = `profiles/${uid}/${timestamp}_${safeName}`;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles").select("photos").eq("user_id", uid).single();
  if (profileError || !profileRow) {
    console.error("[profile-photo] profile lookup failed", profileError);
    throw new Error("Could not load your profile. Save your profile details first, then retry.");
  }
  const existing = profileRow.photos as ProfilePhoto[] | null;
  if (existing !== null && (!Array.isArray(existing) || existing.some(
    (photo) => !photo || typeof photo !== "object" || typeof photo.storagePath !== "string"
  ))) {
    console.error("[profile-photo] incompatible photos data; apply migration 015_profile_photos_jsonb_repair.sql");
    throw new Error("Profile photo storage needs a database repair. Please contact support.");
  }

  await ensureStorageBucket(supabase, PROFILE_PHOTOS_BUCKET);

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error(`Failed to upload photo: ${uploadError.message}`);
  }

  const photos: ProfilePhoto[] = [
    { id: path, storagePath: path, isPrimary: true },
    ...(existing ?? []).map((photo) => ({ ...photo, isPrimary: false })),
  ];
  // Compare-and-swap prevents concurrent uploads from losing existing photos.
  let save = supabase.from("profiles")
    .update({ photos, updated_at: new Date().toISOString() }).eq("user_id", uid);
  save = existing === null ? save.is("photos", null) : save.eq("photos", JSON.stringify(existing));
  const { data: saved, error: saveError } = await save.select("user_id").single();
  if (saveError || !saved) {
    console.error("[profile-photo] save failed", saveError);
    const { error: cleanupError } = await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([path]);
    if (cleanupError) console.error("[profile-photo] cleanup failed", cleanupError);
    if (saveError?.code === "22P02" || saveError?.code === "42883") {
      console.error("[profile-photo] check photos column type; apply migration 015_profile_photos_jsonb_repair.sql");
      throw new Error("Profile photo storage needs a database repair. Please contact support.");
    }
    throw new Error("Photo could not be linked to your profile. Please retry.");
  }

  await recordAuditBestEffort({ adminUserId: uid, action: "upload", targetRef: { type: "profilePhoto", id: path }, reason: "profile photo upload" });

  return { url: photoStoragePathToApiUrl(path), path };
}
