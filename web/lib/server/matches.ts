import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";

/**
 * Matches service (server-side) — the canonical "can these two users chat for
 * free?" source (table created by migration 063).
 *
 * A match row exists when two users have mutually liked each other (both rows
 * in public.profile_likes) or have accepted a connection request (row in
 * public.connections). Rows are stored as an ORDERED PAIR (user1_id < user2_id)
 * so (A, B) and (B, A) can never produce two rows — every reader and writer in
 * the codebase must sort through `orderedPair` before touching the table.
 *
 * All writes go through the service-role client, which is the only role
 * granted more than SELECT (see the RLS policy in migration 063).
 */

/** Canonical ordered pair so (A, B) and (B, A) map to the same row. */
function orderedPair(userA: string, userB: string): { user1Id: string; user2Id: string } {
  return userA < userB
    ? { user1Id: userA, user2Id: userB }
    : { user1Id: userB, user2Id: userA };
}

/** True when a mutual match row already exists between the two users. */
export async function hasMatchBetween(userA: string, userB: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !userA || !userB || userA === userB) return false;

  const { user1Id, user2Id } = orderedPair(userA, userB);
  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle();
  if (error) {
    console.error("[matches] hasMatchBetween failed", {
      userA,
      userB,
      ...supabaseErrorDetail(error),
    });
    return false;
  }
  return Boolean(data);
}

/**
 * Materialise the match row for a pair. Idempotent — the (user1_id, user2_id)
 * unique constraint + `ignoreDuplicates` turns a repeat call into a no-op, so
 * it is safe to call from every path that can create a match (mutual like,
 * connection accept, backfill).
 *
 * Returns true when a row exists after the call.
 */
export async function ensureMatch(userA: string, userB: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !userA || !userB || userA === userB) return false;

  const { user1Id, user2Id } = orderedPair(userA, userB);
  const { error } = await supabase.from("matches").upsert(
    { user1_id: user1Id, user2_id: user2Id },
    { onConflict: "user1_id,user2_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("[matches] ensureMatch failed", {
      userA,
      userB,
      ...supabaseErrorDetail(error),
    });
    return false;
  }
  return true;
}

/**
 * Call after recording a like from `likerId` to `likedUserId`. When the
 * recipient has already liked the liker back, the pair is mutual — the
 * matches row is written (or confirmed) so chat between them becomes free.
 *
 * Fail-soft: a matches-table hiccup never fails the like itself; the pair
 * simply stays unmatched and messaging falls back to the paid intro.
 *
 * Returns true only when a mutual match exists after the call.
 */
export async function recordMatchIfMutual(
  likerId: string,
  likedUserId: string
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !likerId || !likedUserId || likerId === likedUserId) return false;

  try {
    // Reciprocal like already present? (Bot likes never form human matches.)
    const { data: reciprocal } = await supabase
      .from("profile_likes")
      .select("id")
      .eq("liker_id", likedUserId)
      .eq("liked_user_id", likerId)
      .eq("is_bot", false)
      .maybeSingle();
    if (!reciprocal) return false;

    return await ensureMatch(likerId, likedUserId);
  } catch (error) {
    console.error("[matches] recordMatchIfMutual failed", { likerId, likedUserId, error });
    return false;
  }
}
