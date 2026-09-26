"use client";

import { useEffect, useRef, useState } from "react";
import { heartbeatPresenceAction, getPresenceAction } from "@/lib/actions/presence";
import type { PresenceMap } from "@/lib/presence";

/** How often the signed-in member refreshes their own presence row. */
const HEARTBEAT_MS = 30_000;
/** How often presence for the people on screen is re-read. */
const POLL_MS = 20_000;

/**
 * Live presence for a set of members, plus this member's own heartbeat.
 *
 * Two halves, because neither alone is enough:
 *
 *   1. A heartbeat on an interval publishes THIS member's activity. Presence is
 *      a push model - a viewer cannot know about someone else's session until
 *      that session announces itself - so without the heartbeat nobody would
 *      ever be marked online.
 *   2. A poller re-reads the watched ids. A Supabase Realtime
 *      `postgres_changes` subscription on `user_presence` would be the tidier
 *      mechanism, but it delivers nothing at all on any project where the table
 *      was never added to the `supabase_realtime` publication, and that failure
 *      is indistinguishable from "nobody is online". Polling is the
 *      guaranteed-correct floor; realtime can be layered on top later without
 *      changing any caller.
 *
 * Both timers are suspended while the tab is hidden and fire immediately on
 * return to visibility, so a member who switches tabs for ten minutes is not
 * advertised as continuously online for the whole ten minutes.
 *
 * `enabled` exists so signed-out pages (the public home feed) can still render
 * a presence dot without ever firing a heartbeat that cannot succeed.
 */
export function usePresence(userIds: string[], enabled = true) {
  const [presence, setPresence] = useState<PresenceMap>({});

  // Held in a ref so the interval always reads the current id list without the
  // effect being torn down and rebuilt on every render of a growing feed.
  const idsRef = useRef(userIds);
  idsRef.current = userIds;

  // Stable across renders; reads the current ids through the ref. Kept in a
  // ref too so the "ids changed, fetch now" effect below can call it without
  // listing it as a dependency (which would loop, since it is new every render).
  const refreshRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function refresh() {
      const ids = Array.from(new Set(idsRef.current.filter(Boolean)));
      if (ids.length === 0) return;
      // A rejected action is swallowed: presence is decorative and must never
      // surface as an unhandled rejection that trips an error boundary.
      const result = await getPresenceAction(ids).catch(() => null);
      if (!cancelled && result) setPresence(result);
    }

    refreshRef.current = () => void refresh();

    function beat() {
      void heartbeatPresenceAction().catch(() => null);
    }

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      // Returning to the tab is itself proof of activity, so refresh instantly
      // rather than leaving a stale "offline" dot for up to POLL_MS.
      beat();
      void refresh();
    }

    beat();
    void refresh();

    const heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") beat();
    }, HEARTBEAT_MS);

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatTimer);
      window.clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  // Re-fetch as soon as the watched set changes. Without this, paging forward
  // in the moment feed would show an "offline" dot for any author not present
  // in the first poll's result, and the dot would stay wrong for up to POLL_MS.
  const idsKey = enabled ? Array.from(new Set(userIds.filter(Boolean))).sort().join(",") : "";
  useEffect(() => {
    if (!idsKey) return;
    refreshRef.current();
  }, [idsKey]);

  /** True when the given member's last heartbeat is inside the online window. */
  const isOnline = (userId: string | null | undefined) =>
    Boolean(userId && presence[userId]?.online);

  return { presence, isOnline };
}