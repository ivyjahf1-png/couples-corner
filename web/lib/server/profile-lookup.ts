/**
 * Couples Corner — resolve author display data for rows that key on user_id.
 *
 * WHY THIS EXISTS RATHER THAN A POSTGREST EMBED:
 * PostgREST can only resolve an embedded resource through a DECLARED FOREIGN
 * KEY. The tables that carry a `user_id` here — `moments`, `moment_comments` —
 * declare `user_id uuid not null references auth.users(id)`, while
 * `profiles.user_id` is only UNIQUE (migration 005). There is therefore NO
 * foreign key between them, and writing
 *
 *   .select("..., profiles(display_name)")
 *
 * makes PostgREST reject the relationship and fail the ENTIRE query with
 * "Could not find a relationship between 'x' and 'profiles' in the schema
 * cache". The affected row set comes back null.
 *
 * This is not hypothetical: it made the home feed render "No moments yet" while
 * the very same rows were readable without the embed, and it broke posting and
 * listing comments.
 *
 * So the author data is fetched in its own query and stitched in JS. That is
 * robust whether or not the FK exists, and it keeps working if one is added
 * later.
 *
 * Deliberately fails soft: a missing author row yields nulls (the UI falls back
 * to "Member"), because a display-name lookup must never be able to empty a
 * feed or fail a comment post.
 */

import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";

export interface AuthorInfo {
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Look up display name (and first avatar) for a set of user ids.
 * Returns a Map keyed by `profiles.user_id`; ids with no profile are absent.
 */
export async function fetchAuthors(userIds: string[]): Promise<Map<string, AuthorInfo>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const empty = new Map<string, AuthorInfo>();
  if (ids.length === 0) return empty;

  const supabase = getSupabaseServerClient();
  if (!supabase) return empty;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, photos")
      .in("user_id", ids);
    if (error) throw error;

    const byId = new Map<string, AuthorInfo>();
    for (const raw of (data ?? []) as Array<{
      user_id?: string | null;
      display_name?: string | null;
      photos?: unknown;
    }>) {
      if (!raw.user_id) continue;
      const photos = Array.isArray(raw.photos) ? raw.photos : [];
      const first = photos[0] as { publicUrl?: string | null } | undefined;
      byId.set(raw.user_id, {
        displayName: raw.display_name ?? null,
        avatarUrl: first?.publicUrl ?? null,
      });
    }
    return byId;
  } catch (error) {
    // Logged, but never thrown: an author lookup is cosmetic, and failing the
    // caller here would turn "no avatar" into "no feed".
    console.error("[authors] profile lookup failed", supabaseErrorDetail(error));
    return empty;
  }
}

/** Display name for a single user, or null when unknown. */
export async function fetchAuthorName(userId: string): Promise<string | null> {
  const byId = await fetchAuthors([userId]);
  return byId.get(userId)?.displayName ?? null;
}