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
}

/** Create users/{uid} + profiles/{uid} idempotently (safe to retry). */
export async function provisionUser(
  { uid, email, displayName }: ProvisionUserInput
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

  // Insert user record
  await supabase.from("users").insert({
    id: uid,
    email,
    display_name: displayName?.trim() || email.split("@")[0],
    role: "user",
    status: "active",
    email_verified: false,
    onboarding_completed: false,
    created_at: now,
    last_active_at: now,
  });

  // Insert profile record
  await supabase.from("profiles").insert({
    user_id: uid,
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
  });
}

