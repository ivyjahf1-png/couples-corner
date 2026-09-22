"use server";

import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { mapProfileRow, profileSelectList } from "@/lib/server/profiles";
import { getSessionUser } from "@/lib/auth/authorization";

/**
 * Comprehensive profile detail for the Discover "View full profile"
 * bottom sheet. Read-only, fail-soft (returns null rather than throwing
 * so a malformed row can never blank the deck).
 */
export interface ProfileDetailView {
  id: string;
  name: string;
  kind: "person" | "couple";
  bio: string | null;
  location: string;
  country: string | null;
  occupation: string | null;
  joinedAt: string | null;
  phoneStatus: "shared" | "not shared";
  photos: Array<{ id?: string; storagePath?: string; publicUrl?: string | null; isPrimary?: boolean }>;
}

export async function getProfileDetailAction(userId: string): Promise<ProfileDetailView | null> {
  const session = await getSessionUser();
  if (!session || !userId?.trim()) return null;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(profileSelectList())
      .eq("user_id", userId.trim())
      .maybeSingle();

    if (error) throw error;

    const profile = mapProfileRow(data as Record<string, unknown> | null);
    if (!profile) return null;

    return {
      id: profile.userId,
      name: profile.displayName?.trim() || "Community member",
      kind: profile.kind,
      bio: profile.bio ?? null,
      location: profile.location?.trim() || "Location not shared",
      country: profile.country ?? null,
      occupation: profile.occupation ?? null,
      joinedAt: profile.createdAt ?? null,
      // Phone numbers are never exposed in this build — status only.
      phoneStatus: "not shared",
      photos: (profile.photos ?? []).filter(
        (p): p is NonNullable<typeof p> => Boolean(p && typeof p === "object")
      ),
    };
  } catch (error) {
    console.error("[profile-detail] query failed", supabaseErrorDetail(error as never));
    return null;
  }
}
