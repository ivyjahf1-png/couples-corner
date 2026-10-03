"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT_ID, ADS_ENABLED } from "@/lib/ads/adsense";

/**
 * AdSense's client queue. This is an ARRAY, not an object: the loader replaces
 * it with its own implementation and replays whatever was pushed while it was
 * loading, so a slot can enqueue before the library exists and still fill.
 */
type AdSenseQueue = Array<Record<string, unknown>>;

declare global {
  interface Window {
    adsbygoogle?: AdSenseQueue;
  }
}

export interface BannerAdProps {
  /**
   * Ad unit id from AdSense → Ad units. This is NOT the publisher id - mixing
   * the two yields a permanently empty slot and no console error to explain it.
   */
  slot: string;
  /** Width/height pair. Must match the size configured for the ad unit. */
  format?: "auto" | "rectangle" | "vertical" | "horizontal" | "fluid";
  className?: string;
  /**
   * Reserve height while no ad has filled. Without it the slot has zero height
   * until the creative arrives and the surrounding layout visibly jumps - the
   * classic CLS complaint. Ignored when `format="auto"`, which is fluid-height
   * by design and must size itself from the creative.
   */
  minHeight?: number;
  /** Accessible label for the ad region. */
  label?: string;
}

/**
 * A single AdSense display unit.
 *
 * ── HYDRATION, WHICH IS THE WHOLE POINT OF THIS COMPONENT ──────────────────
 * AdSense is a browser-side ad server: a unit only fills when the page pushes a
 * request onto the `adsbygoogle` queue AFTER the loader has run. That is
 * inherently a client-only, post-hydration side effect, and it is the classic
 * source of Next.js hydration mismatches. The rules this component follows:
 *
 *   1. NO `useId()` FOR THE SLOT ID. React's useId is hydration-safe, but its
 *      value contains colons (":R1:") and the id ends up in the DOM. It is
 *      unnecessary anyway: the ad unit id is a stable, known constant supplied
 *      as a prop, so the same value is produced on the server and the client.
 *      A random or Date.now() id would guarantee a mismatch and a fresh ad on
 *      every render.
 *
 *   2. THE PUSH HAPPENS IN AN EFFECT, NEVER DURING RENDER. Pushing to
 *      adsbygoogle while rendering is a side effect in the render phase: React
 *      may run it twice under StrictMode, and a re-render would enqueue a
 *      duplicate request. `useEffect` is the correct phase for it.
 *
 *   3. THE EFFECT IS IDEMPOTENT VIA A REF GUARD. StrictMode double-invokes
 *      effects in development, which would otherwise push the same unit twice
 *      and report inflated impressions. The ref makes the push happen once per
 *      mounted component.
 *
 *   4. THE MARKUP IS DETERMINISTIC. The container and the ins element render
 *      identical classNames and the identical slot on server and client, so the
 *      first client render matches the server HTML exactly. We never gate the
 *      markup behind a mounted flag, because a "render nothing until mounted"
 *      switch is itself a hydration mismatch - the server emitted an empty tree
 *      the client then contradicts.
 *
 *   5. THE QUEUE IS CREATED IF ABSENT. If this component mounts before the
 *      loader arrives (possible on a fast hydration with a slow CDN), we create
 *      the array. AdSense's own loader picks it up and replays it, so the ad
 *      still fills instead of throwing on an undefined global.
 *
 *   6. THE PUSH IS SKIPPED ENTIRELY WHERE ADS ARE OFF. `ADS_ENABLED` is a
 *      statically-inlined BUILD constant (see lib/ads/adsense), so it reads
 *      identically on the server and on the client. That is what makes it safe
 *      to branch on during render here, and it is the precise difference from the
 *      "render nothing until mounted" anti-pattern in rule 4: there is no window
 *      in which the two sides disagree, because neither side ever consults the
 *      clock or the DOM to decide.
 * ───────────────────────────────────────────────────────────────────────────
 */
export function BannerAd({
  slot,
  format = "auto",
  className = "",
  minHeight,
  label = "Advertisement",
}: BannerAdProps) {
  const pushed = useRef(false);

  useEffect(() => {
    /* Rule 6: no push, and no `adsbygoogle` global created, on a build where ads
       are switched off. This is the call that produces Google's
       "No ad slot found for: …" console error, so skipping it is what actually
       silences the local noise — the `try/catch` below could never, because that
       error is a `console.error`, not a thrown exception. */
    if (!ADS_ENABLED) return;
    if (pushed.current) return;
    pushed.current = true;

    try {
      // See rule 5: the loader may not have executed yet.
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // An ad failure must never break the page it sits on. Swallow it.
    }
  }, []);

  /* THE SLOT DOES NOT RENDER AT ALL WHEN ADS ARE OFF.

     Returning `null` here — rather than rendering an empty reserved box — is
     deliberate. A `min-height: 600px` hollow placeholder with no creative in it
     is 600px of dead space in the sidebar on every local page load, which is
     exactly the kind of noise this change exists to remove. In production
     `ADS_ENABLED` is true and this branch never evaluates.

     It is safe against hydration precisely because `ADS_ENABLED` is a build
     constant: the server and the client take this same branch, so there is no
     mismatch. A `useState(false) + useEffect` "mounted" flag would be the bug —
     that pattern is ruled out in rule 4 above. */
  if (!ADS_ENABLED) return null;

  return (
    <aside
      aria-label={label}
      // `overflow-hidden` clips creatives that overshoot their declared size, so
      // a mis-sized unit cannot burst out of a sidebar.
      className={`w-full overflow-hidden ${className}`}
      style={format !== "auto" && minHeight ? { minHeight } : undefined}
    >
      <ins
        className="adsbygoogle block w-full"
        style={
          format === "auto"
            ? { display: "block" }
            : { display: "block", width: "100%" }
        }
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={format === "auto" ? "true" : undefined}
      />
    </aside>
  );
}