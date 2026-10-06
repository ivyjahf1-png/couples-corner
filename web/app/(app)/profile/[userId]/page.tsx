import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/authorization";
import { getVisibleProfile, photoStoragePathToApiUrl } from "@/lib/server/profiles";
import { publicDisplayName } from "@/lib/utils/display-name";
import { getPresenceForUsers } from "@/lib/server/presence";
import { haversineKm } from "@/lib/server/nearby";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  UserProfileView,
  type PublicProfilePhoto,
  type PublicProfileView,
} from "@/components/profile/UserProfileView";
import type { ProfilePhoto } from "@/lib/models/user";

export const dynamic = "force-dynamic";

/**
 * THE EXTERNAL PROFILE PAGE — `/profile/[userId]`.
 *
 * This route was rewritten from scratch. The previous version rendered a column
 * of dark `<Card>` sections (identity, About, Interests, a media gallery, a
 * relationship block, and four inline action buttons) down an ordinary
 * scrolling document. It is replaced entirely by `UserProfileView`, a
 * dark immersive surface: full-bleed photo header, thumbnail switcher,
 * overlapping sheet, About/Honor/Relation tabs, hobby pills, and a pinned
 * Chat + Follow action bar. None of the old markup survives —
 * there is deliberately no "legacy" version left to fall back to.
 *
 * â”€â”€ THIS PAGE IS A SERVER COMPONENT, ON PURPOSE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * All reading happens here: the profile, its privacy and block checks,
 * presence, and the viewer's own coordinates. The client component receives a
 * flat, pre-derived `PublicProfileView` and fetches nothing on mount except
 * presence polling — the same split the rest of this app uses.
 *
 * â”€â”€ WHAT STOPPED BEING IMPORTED, AND WHY NOTHING WAS DELETED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * `PageHeader`, `Card`, `Chip`, `ProfilePresenceAvatar`, `PublicMediaGallery`,
 * `ProfileConnectionActions`, `MessageProfileButton`, `ReportDialog` and
 * `BlockDialog` are no longer used HERE. Every one of them is still used
 * elsewhere in the app — the discover deck's detail sheet and the own-profile
 * page — so no component was deleted, only this page's usage of them.
 */

/**
 * Age in whole years, derived from `date_of_birth`.
 *
 * DERIVED, NEVER STORED: computing it here means it can never go stale as a
 * member gets older, and there is no cache to invalidate.
 *
 * Guarded rather than assumed. An absent or unparseable date yields null, and so
 * does an age outside 18â€“120 — a child or an implausible year renders NOTHING
 * rather than a nonsensical number. The caller omits the whole pill in that case.
 */
function deriveAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  /* Subtract a year when this year's birthday has not happened yet. Comparing
     month-then-day (rather than a date string) keeps this correct across
     timezones and across leap days. */
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) years -= 1;

  return years >= 18 && years <= 120 ? years : null;
}

/** "< 0.1 km" under a tenth of a kilometre, "12 km" beyond it. */
function formatDistance(km: number): string {
  return km < 0.1 ? "< 0.1 km" : `${Math.round(km)} km`;
}

/**
 * Distance from the VIEWER to the member being viewed, in km.
 *
 * Reuses the same `user_locations` table and the same great-circle maths the
 * `/explore` "Near you" rail uses, so a member's distance reads identically in
 * both places rather than differing by a rounding convention.
 *
 * Returns null — and the UI omits the distance pill entirely — when either party
 * has no coordinates. That is the honest outcome: a member who did not share a
 * location cannot be given a distance, and inventing one would be worse than
 * showing nothing.
 */
async function deriveDistanceKm(
  viewerUid: string | null,
  targetUid: string
): Promise<number | null> {
  if (!viewerUid || viewerUid === targetUid) return null;
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("user_locations")
      .select("user_id, latitude, longitude")
      .in("user_id", [viewerUid, targetUid]);
    if (!data || data.length < 2) return null;

    const byId = new Map<string, { latitude: number; longitude: number }>();
    for (const row of data as unknown as Array<{
      user_id: string;
      latitude: number | null;
      longitude: number | null;
    }>) {
      if (row.user_id && row.latitude != null && row.longitude != null) {
        byId.set(row.user_id, { latitude: row.latitude, longitude: row.longitude });
      }
    }

    const a = byId.get(viewerUid);
    const b = byId.get(targetUid);
    if (!a || !b) return null;
    return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
  } catch {
    /* Presence and distance are both decorative. A failure here must not take
       the whole profile screen down, so it degrades to "distance unavailable". */
    return null;
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await getSessionUser();

  /* getVisibleProfile enforces BOTH privacy (a `private` profile is invisible to
     anyone but its owner) and blocking, server-side. Returning null for a blocked
     member means the route 404s rather than rendering an empty shell that
     confirms the account exists. */
  const profile = await getVisibleProfile(userId, session?.uid ?? null);
  if (!profile) notFound();

  const isSelf = session?.uid === userId;

  /* Presence and distance are independent reads, so they run in parallel rather
     than serialising two round trips. On the self view there is nothing to read:
     an empty object typed as a lookup map, so the read below stays narrow
     instead of widening to `any`. */
  const [presence, distanceKm] = await Promise.all([
    isSelf
      ? Promise.resolve({} as Record<string, { online: boolean }>)
      : getPresenceForUsers([userId]),
    deriveDistanceKm(session?.uid ?? null, userId),
  ]);

  /* PRIMARY PHOTO FIRST. The header is the first thing a member sees, so the
     photo flagged `isPrimary` leads the carousel; the rest follow in their stored
     order. Rows that resolve to no URL are dropped, so the carousel can never
     select a frame that renders as a broken image.

     `key` falls back through id â†’ storagePath â†’ index. A stable, unique key is
     what lets React move the active border between thumbnails correctly; an
     index-only key would make every dot and thumbnail look "changed" when the
     list is reordered. */
  const usable = profile.photos.filter((photo) => resolvePhoto(photo) !== null);
  const ordered = [
    ...usable.filter((photo) => photo.isPrimary),
    ...usable.filter((photo) => !photo.isPrimary),
  ];
  const photos: PublicProfilePhoto[] = ordered.map((photo, index) => ({
    key: photo.id ?? photo.storagePath ?? `photo-${index}`,
    src: resolvePhoto(photo),
  }));

  const age = deriveAge(profile.dateOfBirth);

  /* HONOR / RELATION are pre-filtered here rather than in the component, so the
     client receives only rows that have a real value. A label with an empty
     value is a row that renders as a blank line, which reads as a bug. */
  const honor = [
    { label: "Education", value: profile.education?.trim() ?? "" },
    { label: "Occupation", value: profile.occupation?.trim() ?? "" },
    { label: "Height", value: profile.heightCm ? `${profile.heightCm} cm` : "" },
    { label: "Genotype", value: profile.genotype?.trim() ?? "" },
  ].filter((row) => row.value !== "");

  const relation = [
    { label: "Relationship status", value: profile.relationshipStatus?.trim() ?? "" },
    { label: "Looking for", value: profile.lookingFor?.trim() ?? "" },
    { label: "Orientation", value: profile.orientation?.trim() ?? "" },
    { label: "Profile type", value: profile.profileType?.trim() ?? "" },
  ].filter((row) => row.value !== "");

  const view: PublicProfileView = {
    uid: userId,
    /* Prefix only: this is the PUBLIC profile's displayed name. An
       address-shaped display_name renders as its local part ("ivyjahf1"), never
       the full address — /settings is the only surface that shows that. */
    name: publicDisplayName(profile.displayName) || "Member",
    photos,
    age,
    gender: profile.gender?.trim() || null,
    distanceLabel: distanceKm !== null ? formatDistance(distanceKm) : null,
    country: profile.country?.trim() || null,
    /* There is no dedicated free-text status column. The member's own bio IS
       their status line, which is why the Status section can otherwise read
       "No status yet." — and why nothing is duplicated into a fake field. */
    status: profile.bio?.trim() || null,
    initialOnline: presence[userId]?.online ?? false,
    isSelf,
    viewerUid: session?.uid ?? null,
    /* The status chip beside the name. Derived from the same columns the old
       screen showed as separate cards, so the relationship information is not
       lost in the redesign — it is simply carried by the name row instead. */
    statusBadge:
      profile.profileType === "coupled"
        ? "Couple"
        : profile.relationshipStatus?.trim() || null,
    bio: profile.bio?.trim() || null,
    interests: profile.interests.map((interest) => interest.trim()).filter(Boolean),
    lifestyle: (profile.lifestyle ?? []).map((tag) => tag.trim()).filter(Boolean),
    honor,
    relation,
  };

  return <UserProfileView view={view} />;
}

/**
 * Resolve a photo row to a displayable URL, or null when it cannot be shown.
 *
 * `photos` rows are frequently persisted with a `storagePath` and no
 * `publicUrl`, so the fallback through the authenticated `/api/photos` proxy is
 * the common path rather than the exception. The primary photo is ordered first
 * by the caller.
 */
function resolvePhoto(photo: ProfilePhoto): string | null {
  if (photo.publicUrl) return photo.publicUrl;
  if (photo.storagePath) return photoStoragePathToApiUrl(photo.storagePath);
  return null;
}
