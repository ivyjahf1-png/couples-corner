"use server";

import "server-only";

import { getSessionUser } from "@/lib/auth/authorization";
import {
  getPresenceForUsers,
  heartbeatPresence,
  type PresenceMap,
} from "@/lib/server/presence";

/**
 * Publish the signed-in member's activity.
 *
 * Uses `getSessionUser` (not `requireUser`) so an anonymous visitor on the
 * public home feed gets a no-op instead of a redirect thrown from a background
 * timer — a heartbeat that navigates would be very visible and very wrong.
 */
export async function heartbeatPresenceAction(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  return heartbeatPresence(user.uid);
}

/**
 * Presence for a set of members, keyed by user id. Members with no heartbeat
 * are simply absent from the map, which every caller reads as offline.
 */
export async function getPresenceAction(userIds: string[]): Promise<PresenceMap> {
  return getPresenceForUsers(userIds);
}