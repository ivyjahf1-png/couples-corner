/**
 * Couples Corner - shared presence types and constants (isomorphic).
 *
 * Split out from `lib/server/presence.ts` because that module is `server-only`,
 * and the client hook that renders the dots (`lib/hooks/usePresence.ts`) has to
 * be able to name `PresenceMap`. Importing a `server-only` module from a
 * `"use client"` file fails the build outright, so the shared pieces live here
 * and the server module re-exports them for server-side callers.
 *
 * Isomorphic on purpose: never add a `server-only` import to this file.
 */

/** Presence for a set of members, keyed by user id. */
export type PresenceMap = Record<string, { online: boolean; lastSeenAt: string | null }>;

/**
 * How recently a heartbeat must have landed for a member to count as online.
 *
 * The client heartbeats every 30s (see `usePresence`), so a 90s window tolerates
 * one dropped tick - flaky mobile data, a throttled background tab - before a
 * member flips to offline. The inbox list historically used 5 minutes, which is
 * far too coarse for a live chat header: "Online" would persist long after the
 * tab closed.
 */
export const ONLINE_WINDOW_MS = 90_000;

/**
 * True when `lastSeenAt` is recent enough to count as online.
 *
 * Lives here rather than in the server module so the client can re-derive the
 * same verdict from a timestamp it already holds, without another round trip.
 */
export function isPresenceOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const at = new Date(lastSeenAt).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at <= ONLINE_WINDOW_MS;
}