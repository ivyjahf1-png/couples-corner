/**
 * Server-side user provisioning.
 *
 * SECURITY BOUNDARY: `users/{uid}` and `profiles/{uid}` are unwritable by
 * clients (see RLS policies), so account documents are created here with
 * the Supabase server client after the caller's session has been verified.
 * Passwords and any credentials NEVER touch the users table — Supabase Auth
 * owns credentials.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface ProvisionUserInput {
  uid: string;
  email: string;
  displayName?: string;
  /** uid of the member whose invite code referred this signup, if any. */
  referredBy?: string | null;
}

/** Create users/{uid} + profiles/{uid} idempotently (safe to retry). */
export async function provisionUser(
  { uid, email, displayName, referredBy }: ProvisionUserInput
): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const now = new Date().toISOString();

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", uid)
    .single();

  if (existingUser) return;

  // Insert user record. `referred_by` only exists once migration 035 has been
  // applied, so a failure here is retried without the referral column rather
  // than losing the whole account row.
  const userRow: Record<string, unknown> = {
    id: uid,
    email,
    display_name: displayName?.trim() || email.split("@")[0],
    role: "user",
    status: "active",
    email_verified: false,
    onboarding_completed: false,
    created_at: now,
    last_active_at: now,
  };
  if (referredBy) userRow.referred_by = referredBy;

  const { error: userInsertError } = await supabase.from("users").insert(userRow);
  if (userInsertError && referredBy) {
    const { referred_by: _omitted, ...retryRow } = userRow;
    const { error: retryError } = await supabase.from("users").insert(retryRow);
    if (retryError) throw retryError;
  } else if (userInsertError) {
    throw userInsertError;
  }

  // Insert profile record — strip any keys the DB might not have yet.
  const profilePayload: Record<string, unknown> = {
    id: uid,
    user_id: uid,
    user_code: null,
    display_name: displayName?.trim() || email.split("@")[0],
    bio: null,
    interests: [],
    photos: [],
    visibility: "public",
    discoverable: true,
    looking_for: null,
    location: null,
    gender: null,
    orientation: null,
    date_of_birth: null,
    relationship_status: null,
    profile_type: null,
    preferences: {
      notify_on_connection: true,
      notify_on_messages: true,
      show_online_status: true,
    },
    created_at: now,
    updated_at: now,
  };
  const KNOWN_PROFILE_COLUMNS = new Set([
    "id",
    "user_id",
    "user_code",
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
  ]);
  for (const key of Object.keys(profilePayload)) {
    if (!KNOWN_PROFILE_COLUMNS.has(key)) delete profilePayload[key];
  }
  await supabase.from("profiles").insert(profilePayload);
}

