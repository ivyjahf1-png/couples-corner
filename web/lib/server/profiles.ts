import "server-only";

import { getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import { adminRefs } from "@/lib/firebase/collections";
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


/** Get a user's own profile + user doc. */
export async function getOwnProfile(uid: string): Promise<{
  user: User | null;
  profile: UserProfile | null;
}> {
  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const [userSnap, profileSnap] = await Promise.all([
    refs.users.doc(uid).get(),
    refs.userProfiles.doc(uid).get(),
  ]);
  return {
    user: (userSnap.data() as User | undefined) ?? null,
    profile: (profileSnap.data() as UserProfile | undefined) ?? null,
  };
}

/** Get a profile visible to another user (respects privacy + blocks). */
export async function getVisibleProfile(
  targetUid: string,
  viewerUid: string | null
): Promise<UserProfile | null> {
  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const profileSnap = await refs.userProfiles.doc(targetUid).get();
  const profile = (profileSnap.data() as UserProfile | undefined) ?? null;
  if (!profile) return null;
  if (profile.visibility === "private" && viewerUid !== targetUid) return null;
  if (viewerUid && viewerUid !== targetUid) {
    const pairId = viewerUid < targetUid ? `${viewerUid}_${targetUid}` : `${targetUid}_${viewerUid}`;
    const blockSnap = await refs.blocks.doc(pairId).get();
    if (blockSnap.exists) return null;
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
  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const now = new Date().toISOString();

  const profile: UserProfile = {
    id: refs.userProfiles.doc(uid).id,
    userId: uid,
    displayName: input.displayName?.trim() || "",
    bio: input.bio?.trim() || null,
    interests: input.interests ?? [],
    photos: [],
    visibility: input.visibility ?? "public",
    discoverable: input.discoverable ?? true,
    lookingFor: input.lookingFor ?? null,
    location: input.location?.trim() || null,
    gender: input.gender ?? null,
    orientation: input.orientation ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
    relationshipStatus: input.relationshipStatus ?? null,
    profileType: input.profileType ?? null,
    preferences: {
      notifyOnConnection: true,
      notifyOnMessages: true,
      showOnlineStatus: true,
    },
    createdAt: now,
    updatedAt: now,
  };

  await refs.userProfiles.doc(uid).set(profile, { merge: true });

  await recordAudit({
    adminUserId: uid,
    action: "create",
    targetRef: { type: "profile", id: uid },
    reason: "profile creation",
    after: { visibility: profile.visibility, discoverable: profile.discoverable },
  });

  await scanProfileForRisk(uid, input);

  return profile;
}

/**
 * Update the calling user's own profile. Ownership enforced by the caller
 * passing their own uid â€” the API route asserts session.uid === uid.
 */
export async function updateOwnProfile(
  uid: string,
  input: ProfileUpdateInput
): Promise<UserProfile> {
  const db = getAdminFirestore();
  const refs = adminRefs(db);
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updatedAt: now };
  if (input.displayName !== undefined) updates.displayName = input.displayName.trim();
  if (input.bio !== undefined) updates.bio = input.bio?.trim() || null;
  if (input.interests !== undefined) updates.interests = input.interests;
  if (input.location !== undefined) updates.location = input.location?.trim() || null;
  if (input.gender !== undefined) updates.gender = input.gender?.trim() || null;
  if (input.orientation !== undefined) updates.orientation = input.orientation?.trim() || null;
  if (input.dateOfBirth !== undefined) updates.dateOfBirth = input.dateOfBirth;
  if (input.relationshipStatus !== undefined) updates.relationshipStatus = input.relationshipStatus;
  if (input.profileType !== undefined) updates.profileType = input.profileType;
  if (input.visibility !== undefined) updates.visibility = input.visibility;
  if (input.discoverable !== undefined) updates.discoverable = input.discoverable;

  const ref = refs.userProfiles.doc(uid);
  const beforeSnap = await ref.get();
  const before = beforeSnap.exists ? beforeSnap.data() : undefined;

  await ref.set(updates, { merge: true });

  await recordAudit({
    adminUserId: uid,
    action: "update",
    targetRef: { type: "profile", id: uid },
    reason: "profile edit",
    before,
    after: { ...before, ...updates, id: uid, userId: uid },
  });

    await scanProfileForRisk(uid, input);

  return (await ref.get()).data() as UserProfile;
}

/**
 * Upload a profile photo via the Admin SDK.
 * Only the owner's uid may write to their folder (Storage rules + server check).
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

  const bucket = getAdminStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileRef = bucket.file(path);
  await fileRef.save(buffer, { metadata: { contentType: file.type } });

  await adminRefs(getAdminFirestore()).userProfiles.doc(uid).set(
    { photos: [{ id: path, storagePath: path, isPrimary: true }] },
    { merge: true }
  );

  await recordAudit({
    adminUserId: uid,
    action: "upload",
    targetRef: { type: "profilePhoto", id: path },
    reason: "profile photo upload",
  });

  return { url: `/api/photos/${uid}/${fileRef.name.split("/").pop()}`, path };
}




