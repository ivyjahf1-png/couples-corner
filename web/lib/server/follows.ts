/**
 * Couples Corner — follow graph (server side).
 *
 * A "follow" is one-directional: `follower_id` is the member doing the
 * following, `following_id` the member being followed. It is deliberately NOT
 * the same thing as a connection — `public.friends` (migration 008) is the
 * mutual graph behind Matches, and following must never imply one.
 *
 * Every function fails soft to "not following / zero" so a database without
 * migration 041 applied degrades the Follow control to a harmless no-op instead
 * of breaking the feed card it sits on.
 */

import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";

export interface FollowState {
  following: boolean;
  followerCount: number;
}

/**
 * Follow state for a set of target members, in TWO batched queries.
 *
 * Batched deliberately: a feed of 12 cards can show up to 12 distinct authors,
 * and one count query per author would be 12 round trips on every feed render.
 * Reading the (small) follow rows and grouping in memory is one round trip each
 * and the row count is bounded by the number of authors on screen.
 */
export async function getFollowStates(
  viewerId: string | null,
  targetIds: string[]
): Promise<Map<string, FollowState>> {
  const ids = Array.from(new Set(targetIds.filter(Boolean))).filter((id) => id !== viewerId);
  const result = new Map<string, FollowState>();
  if (ids.length === 0) return result;

  const supabase = getSupabaseServerClient();
  if (!supabase) return result;

  // Everyone who follows any of these authors -> their counts.
  const { data: incoming, error: incomingError } = await supabase
    .from("user_follows")
    .select("following_id")
    .in("following_id", ids);
  if (incomingError) {
    console.error("[follows] follower count query failed", supabaseErrorDetail(incomingError));
  }

  const counts = new Map<string, number>();
  for (const row of (incoming ?? []) as Array<{ following_id?: string | null }>) {
    if (!row.following_id) continue;
    counts.set(row.following_id, (counts.get(row.following_id) ?? 0) + 1);
  }

  // Which of them the viewer already follows.
  const followed = new Set<string>();
  if (viewerId) {
    const { data: mine, error: mineError } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", viewerId)
      .in("following_id", ids);
    if (mineError) {
      console.error("[follows] viewer lookup failed", supabaseErrorDetail(mineError));
    }
    for (const row of (mine ?? []) as Array<{ following_id?: string | null }>) {
      if (row.following_id) followed.add(row.following_id);
    }
  }

  for (const id of ids) {
    result.set(id, { following: followed.has(id), followerCount: counts.get(id) ?? 0 });
  }
  return result;
}

/**
 * Follow or unfollow a member.
 *
 * Self-follow is rejected in the application as well as by a CHECK constraint:
 * the UI hides the control on your own posts, but the action is reachable
 * directly and must not depend on that.
 */
export async function setFollow(
  viewerId: string,
  targetId: string,
  follow: boolean
): Promise<{ ok: true; following: boolean; followerCount: number } | { ok: false; error: string }> {
  if (!viewerId || !targetId) return { ok: false, error: "Not signed in" };
  if (viewerId === targetId) return { ok: false, error: "You cannot follow yourself" };

  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  if (follow) {
    // Upsert on the (follower_id, following_id) unique key, so a double-tap
    // cannot create a second row.
    const { error } = await supabase
      .from("user_follows")
      .upsert(
        { follower_id: viewerId, following_id: targetId },
        { onConflict: "follower_id,following_id" }
      );
    if (error) {
      console.error("[follows] follow failed", supabaseErrorDetail(error));
      return { ok: false, error: "Couldn't follow that member. Please try again." };
    }
  } else {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", viewerId)
      .eq("following_id", targetId);
    if (error) {
      console.error("[follows] unfollow failed", supabaseErrorDetail(error));
      return { ok: false, error: "Couldn't unfollow that member. Please try again." };
    }
  }

  // Return the authoritative count so the button's number is server truth
  // rather than a local guess that drifts.
  const { count } = await supabase
    .from("user_follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", targetId);

  return { ok: true, following: follow, followerCount: count ?? 0 };
}