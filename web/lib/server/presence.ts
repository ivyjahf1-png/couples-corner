
/**
 * Couples Corner — presence service (server side).
 *
 * Presence answers "is this member active right now" for the online/offline
 * dots in the moment feed, on profiles and in the chat header.
 *
 * MODEL: one row per member in `public.user_presence` (migration 039). The
 * signed-in member's client heartbeats on an interval; a member counts as
 * online while their last heartbeat is inside the online window. There is no
 * explicit "went offline" write — a stale heartbeat IS the offline signal,
 * which means a member who closes their laptop or loses signal still shows as
 * offline without the server needing to observe a disconnect.
 *
 * Everything here fails soft and reports "offline", because a missing presence
 * dot is a cosmetic problem while a thrown error in a feed render is a broken
 * page.
 */

/**
 * Couples Corner - presence service (server side).
 *
 * Presence answers "is this member active right now" for the online/offline
 * dots in the moment feed, on profiles and in the chat header.
 *
 * MODEL: one row per member in `public.user_presence` (migration 039). The
 * signed-in member's client heartbeats on an interval (see
 * `lib/hooks/usePresence.ts`); a member counts as online while their last
 * heartbeat is inside the online window. There is no explicit "went offline"
 * write - a stale heartbeat IS the offline signal, which means a member who
 * closes their laptop or loses signal still shows as offline without the server
 * needing to observe a disconnect.
 *
 * Everything here fails soft and reports "offline", because a missing presence
 * dot is a cosmetic problem while a thrown error during a feed render is a
 * broken page.
 *
 * Shared types/constants live in the isomorphic `@/lib/presence` module and are
 * re-exported below: this file is `server-only`, and the client hook rendering
 * the dots must not be able to import from it.
 */

import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { isPresenceOnline, type PresenceMap } from "@/lib/presence";

export { ONLINE_WINDOW_MS, isPresenceOnline } from "@/lib/presence";
export type { PresenceMap } from "@/lib/presence";

/**
 * Record that the given member is active right now.
 *
 * Called on an interval by the client heartbeat via `heartbeatPresenceAction`.
 * Uses the service-role client, so it keeps working before migration 039 has
 * been applied - in which case the upsert errors and is logged rather than
 * thrown, because a failed heartbeat must never break the page that triggered
 * it.
 */
export async function heartbeatPresence(uid: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !uid) return false;

  const { error } = await supabase
    .from("user_presence")
    .upsert(
      { user_id: uid, last_seen_at: new Date().toISOString(), is_online: true },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[presence] heartbeat failed", supabaseErrorDetail(error));
    return false;
  }
  return true;
}

/**
 * Resolve online/offline for a set of members in ONE query.
 *
 * A member is online when their row is flagged online AND their heartbeat landed
 * inside the online window. Both conditions matter: the timestamp is the real
 * signal, and `is_online` gives us an explicit opt-out hook if presence is ever
 * turned off in settings.
 *
 * Ids with no row are simply absent from the returned map, which the UI reads as
 * offline - the correct default for someone who has never opened the app.
 */
export async function getPresenceForUsers(userIds: string[]): Promise<PresenceMap> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const supabase = getSupabaseServerClient();
  if (!supabase) return {};

  try {
    const { data, error } = await supabase
      .from("user_presence")
      .select("user_id, last_seen_at, is_online")
      .in("user_id", ids);
    if (error) throw error;

    const map: PresenceMap = {};
    for (const row of (data ?? []) as Array<{
      user_id: string;
      last_seen_at: string | null;
      is_online: boolean;
    }>) {
      const online = row.is_online !== false && isPresenceOnline(row.last_seen_at);
      map[row.user_id] = { online, lastSeenAt: row.last_seen_at ?? null };
    }
    return map;
  } catch (error) {
    console.error("[presence] lookup failed", supabaseErrorDetail(error));
    return {};
  }
}
