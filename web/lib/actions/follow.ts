"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/lib/server/session";
import { setFollow } from "@/lib/server/follows";
import { rethrowIfNavigation } from "@/lib/utils/errors";

/**
 * Follow or unfollow a member from a moment card.
 *
 * `targetUserId` comes from the client, so it is NOT trusted: the action always
 * writes `follower_id = <the session user>`, never a value from the payload.
 * Passing someone else's id as the follower is therefore not expressible here —
 * which is the point, since the service-role client bypasses RLS and the
 * database policy is not the only thing being relied on.
 */
export async function setFollowAction(params: {
  targetUserId: string;
  follow: boolean;
}): Promise<
  { ok: true; following: boolean; followerCount: number } | { ok: false; error: string }
> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to follow" };

    const targetUserId = (params.targetUserId ?? "").trim();
    if (!targetUserId) return { ok: false, error: "Unknown member" };

    const result = await setFollow(user.uid, targetUserId, Boolean(params.follow));
    if (result.ok) {
      // The feed and the member's profile both render follower counts, so both
      // need to pick the new number up on the next visit.
      revalidatePath("/");
      revalidatePath(`/profile/${targetUserId}`);
      revalidatePath("/profile");
    }
    return result;
  } catch (err) {
    rethrowIfNavigation(err);
    console.error("[follows] action failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't update follow",
    };
  }
}