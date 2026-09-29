"use client";

import { useState } from "react";
import { clearVideoCache } from "@/lib/hooks/useVideoPrefetch";

/**
 * Clear Cache — wipes local app caches (localStorage/sessionStorage/
 * caches API) for this device. Safe: no auth/session cookies touched.
 *
 * The video cache needs care here. The offline-video worker keeps its LRU
 * metadata in IndexedDB as well as its bytes in Cache Storage, and the generic
 * `caches.keys()` loop below deletes the bytes but NOT the metadata. Left
 * that way, the worker's next eviction pass counts bytes for entries that no
 * longer exist, concludes the cache is permanently over budget, and stops
 * caching anything for the rest of the device's life.
 *
 * So the worker is told to clear itself FIRST — it deletes both stores in one
 * transaction — and only then does the generic sweep run for anything else
 * (a future Workbox cache, say). Order matters: the generic sweep runs second so
 * that if the worker is mid-write, its own delete is the one that lands.
 */
export function ClearCacheButton() {
  const [done, setDone] = useState(false);

  async function clear() {
    try {
      await clearVideoCache();
      window.localStorage.clear();
      window.sessionStorage.clear();
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      setDone(true);
      window.setTimeout(() => setDone(false), 3000);
    } catch {
      setDone(false);
    }
  }

  return (
    <button
      type="button"
      onClick={clear}
      className="rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-sm font-medium text-white transition hover:border-orange-500/40 hover:bg-white/10"
    >
      {done ? "Cleared ✓" : "Clear"}
    </button>
  );
}
