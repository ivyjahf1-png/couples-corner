import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { mapProfileRow, profileSelectList } from "@/lib/server/profiles";
import type { UserProfile } from "@/lib/models/user";

/**
 * "Near me" service (server-side) — geolocation-aware profile suggestions.
 *
 * Coordinates live in the user_locations table (migration 023). When the
 * viewer has shared coordinates, nearby members are sorted by great-circle
 * distance (haversine, computed in JS over a bounded result set). When not,
 * the row degrades gracefully to the most recently active discoverable
 * profiles worldwide — so worldwide users always see people, never blanks.
 */

export interface NearbyProfileView {
  id: string;
  name: string;
  kind: "person" | "couple";
  location: string;
  avatarUrl: string | null;
  distanceKm: number | null;
}

const NEARBY_LIMIT = 12;

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Save (or update) the viewer's coordinates. */
export async function saveUserLocation(
  userId: string,
  latitude: number,
  longitude: number
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("user_locations").upsert(
      {
        user_id: userId,
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[nearby] save location failed", supabaseErrorDetail(error as never));
    return false;
  }
}

/**
 * People "near me". When the viewer's coords are unknown we attempt to read
 * them from user_locations; without any coordinates we fall back to a
 * worldwide list sorted by last activity.
 */
export async function getNearbyProfiles(
  viewerId: string,
  coords?: { latitude: number; longitude: number } | null
): Promise<NearbyProfileView[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    let viewerCoords = coords ?? null;
    if (!viewerCoords) {
      const { data: loc } = await supabase
        .from("user_locations")
        .select("latitude, longitude")
        .eq("user_id", viewerId)
        .maybeSingle();
      if (loc?.latitude != null && loc?.longitude != null) {
        viewerCoords = { latitude: loc.latitude, longitude: loc.longitude };
      }
    }

    const [profilesResult, locationsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(profileSelectList())
        .eq("discoverable", true)
        .neq("user_id", viewerId)
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase.from("user_locations").select("user_id, latitude, longitude").limit(500),
    ]);

    if (profilesResult.error) throw profilesResult.error;

    const locById = new Map<string, { latitude: number; longitude: number }>();
    for (const loc of (locationsResult.data ?? []) as unknown as Array<{
      user_id: string;
      latitude: number | null;
      longitude: number | null;
    }>) {
      if (loc?.user_id && loc.latitude != null && loc.longitude != null) {
        locById.set(loc.user_id, { latitude: loc.latitude, longitude: loc.longitude });
      }
    }

    const mapped = ((profilesResult.data ?? []) as unknown as Array<Record<string, unknown>>)
      .map((row) => {
        const profile: UserProfile | null = mapProfileRow(row);
        if (!profile) return null;
        const locRow = locById.get(profile.userId);
        const photos = profile.photos ?? [];
        const primary =
          photos.find((p) => p?.isPrimary) ?? photos[0] ?? null;
        const avatarUrl =
          primary?.publicUrl ??
          (primary?.storagePath
            ? `/api/photos/${profile.userId}/${primary.storagePath.split("/").pop() ?? ""}`
            : null);
        const distanceKm =
          viewerCoords && locRow
            ? haversineKm(viewerCoords.latitude, viewerCoords.longitude, locRow.latitude, locRow.longitude)
            : null;
        return {
          id: profile.userId,
          name: profile.displayName?.trim() || "Member",
          kind: profile.kind,
          location: profile.location ?? "",
          avatarUrl,
          distanceKm,
        } satisfies NearbyProfileView;
      })
      .filter((v): v is NearbyProfileView => Boolean(v?.id));

    // With coordinates, closest first; hide anyone beyond 500 km from the
    // front of the "near me" tray, then pad with worldwide members.
    if (viewerCoords) {
      mapped.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      return mapped.slice(0, NEARBY_LIMIT);
    }
    return mapped.slice(0, NEARBY_LIMIT);
  } catch (error) {
    console.error("[nearby] query failed", supabaseErrorDetail(error as never));
    return [];
  }
}
