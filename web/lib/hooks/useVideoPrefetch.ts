"use client";

import { useEffect } from "react";

/**
 * Register the offline-video service worker.
 *
 * WHY REGISTERED FROM A HOOK AND NOT AT BUILD TIME: a service worker must be
 * served from the origin root to control the whole scope, and it must be
 * registered only in a real browser — `navigator.serviceWorker` does not exist
 * during SSR, and referencing it in a server component would throw at build.
 *
 * `skipWaiting` + `clients.claim` (both in sw.js) mean a newly-deployed worker
 * takes over on the next navigation instead of waiting for every old tab to
 * close, which is the usual reason a service worker fix appears to "not work".
 *
 * FAILURE IS SILENT BY DESIGN. Private browsing, an enterprise policy, or a
 * non-secure origin all block registration. That is a degraded experience (no
 * offline video), never a broken one, so nothing here throws or warns.
 */
export function registerVideoCacheWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  // Service workers require a secure context. On plain http://<lan-ip> the API
  // is absent and the check above is enough, but guard the origin too so a
  // misconfigured preview build fails quietly rather than noisily.
  if (!window.isSecureContext) return;

  const register = () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* blocked by policy or offline — the feed works exactly as before */
    });
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

interface PrefetchTarget {
  momentId: string;
  url: string;
}

/** The active worker, or null when none is installed or controlling yet. */
async function activeWorker(): Promise<ServiceWorker | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/").catch(() => null);
  return navigator.serviceWorker.controller ?? registration?.active ?? null;
}

/**
 * Ask the worker to pre-cache a batch of videos.
 *
 * Resolves false when there is no worker yet — a very common first-load case,
 * because the worker is still installing when the feed mounts. The caller
 * simply does nothing that frame; the NEXT scroll re-runs this and the worker
 * exists by then. This is why the feed effect keys on the active index rather
 * than running once.
 */
export async function prefetchVideos(items: PrefetchTarget[]): Promise<boolean> {
  if (items.length === 0) return false;
  const worker = await activeWorker();
  if (!worker) return false;
  worker.postMessage({ type: "PREFETCH", items });
  return true;
}

/**
 * Drop every cached video AND its metadata.
 *
 * The existing Settings "Clear cache" button wipes Cache Storage directly,
 * which leaves this worker's IndexedDB rows behind — the next eviction pass
 * would then count bytes for entries that no longer exist and the cache would
 * appear permanently full. ClearingCacheButton is updated to call this instead.
 */
export async function clearVideoCache(): Promise<void> {
  const worker = await activeWorker();
  worker?.postMessage({ type: "CLEAR" });
}

/** Override the worker's byte budget at runtime. */
export async function setVideoCacheBudget(bytes: number): Promise<void> {
  const worker = await activeWorker();
  worker?.postMessage({ type: "SET_BUDGET", bytes });
}
/**
 * How many upcoming cards to pre-cache.
 *
 * FIVE is the balance between "probably watch it" and "don't waste the
 * member's data". Each is a full download — at roughly 3MB for a short clip
 * that is ~15MB per scroll-through, which is real money on a metered
 * connection. Five also stays comfortably inside the worker's own MAX_BATCH
 * guard, so client and worker agree on the ceiling.
 *
 * It is a constant rather than a prop because the value is a product decision
 * about mobile data use, not something a caller should tune per page.
 */
export const PREFETCH_AHEAD = 5;

/**
 * Data-usage and battery deference.
 *
 * Prefetching is the most abusive thing this app could do on a phone, so it
 * stands down in the two cases where it is genuinely unwelcome:
 *
 *   • `navigator.connection.saveData` — the member explicitly asked the OS to
 *     reduce data use. Ignoring that is the fastest way to get the app deleted.
 *   • `2g` / `slow-2g` effective types — a link where this would take minutes.
 *
 * The three vendor-prefixed shapes are read because the Network Information
 * API is still prefixed on Safari and absent on older iOS, where the whole
 * feature should degrade to doing nothing rather than erroring.
 */
function shouldPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;
  if (navigator.onLine === false) return false;

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    mozConnection?: { saveData?: boolean; effectiveType?: string };
    webkitConnection?: { saveData?: boolean; effectiveType?: string };
  };
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

  if (connection?.saveData === true) return false;
  const effective = connection?.effectiveType;
  if (effective === "2g" || effective === "slow-2g") return false;
  return true;
}

/**
 * Pre-cache the upcoming videos as the member scrolls the feed.
 *
 * `urls` must ALREADY be the next N items in queue order. The caller owns that
 * slice because only it knows the scroller's real position — this hook does not
 * track scroll, it reacts to a value the feed already computes for playback.
 * That split is deliberate: two independent notions of "current index" is how a
 * prefetcher ends up caching the video already on screen.
 *
 * The effect is keyed on the JOINED URL STRING, not on the array identity.
 * The parent builds this array with `useMemo`, and an identity key would
 * re-fire a full prefetch on every parent render. The joined key changes only
 * when the actual upcoming set changes, which is both cheaper and far less
 * wasteful. Joining is safe here because a URL cannot contain the separator.
 */
export function useVideoPrefetch(urls: string[]): void {
  const key = urls.join("|");

  useEffect(() => {
    registerVideoCacheWorker();
  }, []);

  useEffect(() => {
    if (!key) return;
    if (!shouldPrefetch()) return;

    const items = key
      .split("|")
      .filter(Boolean)
      .map((url) => ({ momentId: url, url }));

    void prefetchVideos(items);
  }, [key]);
}

/**
 * Re-register on reconnect.
 *
 * The effect above is keyed on the upcoming set, which does not change while a
 * member sits on a dead connection. Without this, anything that failed while
 * offline stays uncached even after signal returns — the worst case for the
 * exact feature being offline support. The retry itself is driven by the next
 * scroll effect, since only the feed knows the queue; this just restores the
 * worker, which the OS may have killed while the tab was backgrounded.
 */
export function useReconnectPrefetch(): void {
  useEffect(() => {
    const onOnline = () => {
      if (!shouldPrefetch()) return;
      registerVideoCacheWorker();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
}