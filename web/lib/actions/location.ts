"use server";

import "server-only";
import { requireUser } from "@/lib/auth/authorization";
import { getNearbyProfiles, saveUserLocation, type NearbyProfileView } from "@/lib/server/nearby";

export interface LocationResult {
  ok: boolean;
  error?: string;
}

/** Persist the signed-in user's browser-geolocation coordinates. */
export async function saveUserLocationAction(params: {
  latitude: number;
  longitude: number;
}): Promise<LocationResult> {
  const user = await requireUser();
  const { latitude, longitude } = params;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { ok: false, error: "Those coordinates don't look valid." };
  }
  const saved = await saveUserLocation(user.uid, latitude, longitude);
  return saved ? { ok: true } : { ok: false, error: "Couldn't save your location right now." };
}

/**
 * People "near me". Coordinates come from the browser when the user shares
 * them, otherwise the server falls back to the last saved location or a
 * worldwide list — worldwide users always get results.
 */
export async function getNearbyProfilesAction(coords?: {
  latitude: number;
  longitude: number;
} | null): Promise<NearbyProfileView[]> {
  const user = await requireUser();
  return getNearbyProfiles(user.uid, coords ?? null);
}
