import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "./audit";
import { scanMessage, addRiskSignal } from "./safety";
import type { UserProfile, User } from "@/lib/models/user";
import type { ProfileVisibility } from "@/lib/models";

export interface ProfileUpdateInput {
  displayName?: string;
  bio?: string | null;
  interests?: string[];
  location?: string | null;
  gender?: string | null;
  orientation?: string | null;
  dateOfBirth?: string | null;
  relationshipStatus?: string | null;
  profileType?: "single" | "coupled" | "open" | null;
  lookingFor?: string | null;
  visibility?: ProfileVisibility;
  discoverable?: boolean;
}

import { computeProfileCompletion } from "@/lib/utils/profile-completion";

export type { ProfileCompletion } from "@/lib/utils/profile-completion";
export { computeProfileCompletion };

/** Convert snake_case DB row to camelCase UserProfile */
function dbToUserProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    displayName: row.display_name as string,
    visibility: row.visibility as ProfileVisibility,
    discoverable: row.discoverable as boolean,
    photos: (row.photos as UserProfile["photos"]) ?? [],
    lookingFor: row.looking_for as string | null,
    interests: (row.interests as string[]) ?? [],
    bio: row.bio as string | null,
    location: row.location as string | null,
    gender: row.gender as string | null,
    orientation: row.orientation as string | null,
    dateOfBirth: row.date_of_birth as string | null,
    relationshipStatus: row.relationship_status as string | null,
    profileType: row.profile_type as UserProfile["profileType"],
    preferences: row.preferences as UserProfile["preferences"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Convert snake_case DB row to camelCase User */
function dbToUser(row: Record<string, unknown>): User {
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

/** Get a user's own profile + user doc. */
export async function getOwnProfile(uid: string): Promise<{
  user: User | null;
  profile: UserProfile | null;
}> {
  const supabase = getSupabaseServerClient();

  const [{ data: userRow }, { data: profileRow }] = await Promise.all([
    supabase.from("users").select("*").eq("id", uid).single(),
    supabase.from("profiles").select("*").eq("user_id", uid).single(),
  ]);

  return {
    user: userRow ? dbToUser(userRow) : null,
    profile: profileRow ? dbToUserProfile(profileRow) : null,
  };
}

/** Get a profile visible to another user (respects privacy + blocks). */
export async function getVisibleProfile(
  targetUid: string,
  viewerUid: string | null
): Promise<UserProfile | null> {
  const supabase = getSupabaseServerClient();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
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
      .single();
    if (blockRow) return null;
  }

  return profile;
}

/**
 * Scan profile free-text for scam signals. Never bans â€” it only writes a
 * server-side risk flag for later moderation, and never exposes the score.
 * The check runs on potentially-spammy fields (bio, display name, location).
 */
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

/**
 * Create a profile for the calling user. Only callable by the authenticated
 * owner â€” the server asserts uid === session.uid.
 */
export async function createProfile(
  uid: string,
  input: ProfileUpdateInput
): Promise<UserProfile> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const profileData = {
    user_id: uid,
    display_name: input.displayName?.trim() || "",
    bio: input.bio?.trim() || null,
    interests: input.interests ?? [],
    location: input.location?.trim() || null,
    gender: input.gender?.trim() || null,
    orientation: input.orientation?.trim() || null,
    date_of_birth: input.dateOfBirth || null,
    relationship_status: input.relationshipStatus || null,
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

  const { data: profileRow } = await supabase
    .from("profiles")
    .insert(profileData)
    .select()
    .single();

  await recordAudit({
    adminUserId: uid,
    action: "create",
    targetRef: { type: "profile", id: uid },
    reason: "profile creation",
    after: { visibility: profileData.visibility, discoverable: profileData.discoverable },
  });

  await scanProfileForRisk(uid, input);

  return dbToUserProfile(profileRow);
}

/**
 * Update the calling user's own profile. Ownership enforced by the caller
 * passing their own uid â€” the API route asserts session.uid === uid.
 */
export async function updateOwnProfile(
  uid: string,
  input: ProfileUpdateInput
): Promise<UserProfile> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };
  if (input.displayName !== undefined) updates.display_name = input.displayName.trim();
  if (input.bio !== undefined) updates.bio = input.bio?.trim() || null;
  if (input.interests !== undefined) updates.interests = input.interests;
  if (input.location !== undefined) updates.location = input.location?.trim() || null;
  if (input.gender !== undefined) updates.gender = input.gender?.trim() || null;
  if (input.orientation !== undefined) updates.orientation = input.orientation?.trim() || null;
  if (input.dateOfBirth !== undefined) updates.date_of_birth = input.dateOfBirth;
  if (input.relationshipStatus !== undefined) updates.relationship_status = input.relationshipStatus;
  if (input.profileType !== undefined) updates.profile_type = input.profileType;
  if (input.visibility !== undefined) updates.visibility = input.visibility;
  if (input.discoverable !== undefined) updates.discoverable = input.discoverable;

  // Get before state for audit
  const { data: beforeRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", uid)
    .single();

  const { data: updatedRow } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", uid)
    .select()
    .single();

  await recordAudit({
    adminUserId: uid,
    action: "update",
    targetRef: { type: "profile", id: uid },
    reason: "profile edit",
    before: beforeRow,
    after: { ...beforeRow, ...updates, id: uid, user_id: uid },
  });

  await scanProfileForRisk(uid, input);

  return dbToUserProfile(updatedRow);
}

/**
 * Upload a profile photo via Supabase Storage.
 * Only the owner's uid may write to their folder (RLS + server check).
 */
export async function uploadProfilePhoto(
  uid: string,
  file: File
): Promise<{ url: string; path: string }> {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Unsupported file type. Use JPG, PNG, or WebP.");
  }
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Photo too large. Maximum size is 5 MB.");
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `profiles/${uid}/${timestamp}_${safeName}`;

  const supabase = getSupabaseServerClient();

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload photo: ${uploadError.message}`);
  }

  // Update profile with new photo
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("photos")
    .eq("user_id", uid)
    .single();

  const photos = (profileRow?.photos as UserProfile["photos"]) ?? [];
  photos.push({ id: path, storagePath: path, isPrimary: photos.length === 0 });

  await supabase
    .from("profiles")
    .update({ photos, updated_at: new Date().toISOString() })
    .eq("user_id", uid);

  await recordAudit({
    adminUserId: uid,
    action: "upload",
    targetRef: { type: "profilePhoto", id: path },
    reason: "profile photo upload",
  });

  return { url: `/api/photos/${uid}/${safeName}`, path };
}




