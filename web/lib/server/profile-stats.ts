import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getMatchesData } from "@/lib/server/discovery";

/**
 * Profile-page social stats (server-side, fail-soft).
 *
 * Friends come from the real connections graph. Following / Followers /
 * Visitors read their dedicated tables when they exist; any missing table
 * or query error degrades to 0 so the stats bar can never break the page.
 */
export interface ProfileStats {
  friends: number;
  following: number;
  followers: number;
  visitors: number;
}

async function countRows(
  table: string,
  column: string,
  userId: string
): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(column, userId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getProfileStats(uid: string): Promise<ProfileStats> {
  let friends = 0;
  try {
    const matches = await getMatchesData(uid);
    friends = matches.connected.length;
  } catch {
    friends = 0;
  }
  const [following, followers, visitors] = await Promise.all([
    countRows("user_follows", "follower_id", uid),
    countRows("user_follows", "following_id", uid),
    countRows("profile_visitors", "profile_user_id", uid),
  ]);
  return { friends, following, followers, visitors };
}
