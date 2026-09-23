"use client";

import { useState } from "react";

/**
 * Clear Cache — wipes local app caches (localStorage/sessionStorage/
 * caches API) for this device. Safe: no auth/session cookies touched.
 */
export function ClearCacheButton() {
  const [done, setDone] = useState(false);

  async function clear() {
    try {
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
