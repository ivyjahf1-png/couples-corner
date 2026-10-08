"use server";

import "server-only";
import { getSessionUser } from "@/lib/auth/authorization";
import { buildPublicProfileView } from "@/lib/server/public-profile";
import type { PublicProfileView } from "@/components/profile/PublicProfileScreen";

/**
 * Full public-profile payload for the GLOBAL PROFILE MODAL.
 *
 * The modal can be opened from any surface — Explore, Moment, the chat header,
 * the Feed, the inbox — so it cannot be a Server Component's prop; it fetches
 * through this action when it opens instead.
 *
 * One builder (`buildPublicProfileView`) backs both this action and the
 * `/profile/[userId]` page, so the modal and the full page can never disagree
 * about photos, age, distance or the Honor/Relation rows.
 *
 * READ-ONLY AND FAIL-SOFT: privacy and block checks run inside the builder; any
 * error resolves to `null`, which the modal renders as an honest "not
 * available" state rather than an unhandled rejection.
 */
export async function getPublicProfileViewAction(
  userId: string
): Promise<PublicProfileView | null> {
  const trimmed = userId?.trim();
  if (!trimmed) return null;
  try {
    const session = await getSessionUser();
    if (!session) return null;
    return await buildPublicProfileView(trimmed, session.uid);
  } catch (error) {
    console.error("[public-profile] view fetch failed", error);
    return null;
  }
}
