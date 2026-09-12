"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getOwnProfile, createProfile, updateOwnProfile } from "@/lib/server/profiles";
import type { ProfileUpdateInput } from "@/lib/server/profiles";

/**
 * Server actions for profile management.
 *
 * SECURITY: these run only on the server (Admin SDK). The caller's uid is
 * passed from the authenticated session in the page component — never trusted
 * from the client. Users can only act on their own profile.
 */

/**
 * Get the calling user's own profile + user doc (read from Admin SDK).
 * Called in page/server components to hydrate forms.
 */
export async function getOwnProfileAction(uid: string) {
  return getOwnProfile(uid);
}

/**
 * Create the calling user's profile. The uid is taken from the session —
 * the client cannot specify whose profile to create.
 */
export async function createProfileAction(uid: string, input: ProfileUpdateInput) {
  const profile = await createProfile(uid, input);
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  return profile;
}

/**
 * Update the calling user's own profile. Ownership is enforced server-side —
 * a user can only pass their own uid (asserted by the calling page from the
 * session), and Supabase RLS denies any write where auth.uid() != uid.
 */
export async function updateOwnProfileAction(uid: string, input: ProfileUpdateInput) {
  const profile = await updateOwnProfile(uid, input);
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  return profile;
}

/**
 * Complete the onboarding flow for a user.
 * Updates the profile with collected data and marks onboarding_completed in
 * the users table, so the user is redirected to the main app on next visit.
 */
export async function completeOnboardingAction(uid: string, input: ProfileUpdateInput) {
  const { completeOnboarding } = await import("@/lib/server/profiles");
  await completeOnboarding(uid, input);
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/onboarding");
}
