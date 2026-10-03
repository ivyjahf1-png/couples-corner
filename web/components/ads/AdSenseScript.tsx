import Script from "next/script";
import { ADSENSE_SCRIPT_SRC, ADS_ENABLED } from "@/lib/ads/adsense";

/**
 * Loads the AdSense loader script (adsbygoogle.js) exactly once for the app.
 *
 * MOUNTED IN THE ROOT LAYOUT, not per page. AdSense's own docs require the
 * loader on every page, and putting it in one root component is what guarantees
 * that: a route added later cannot forget it.
 *
 * `afterInteractive` rather than `beforeInteractive`/`lazyOnload`:
 *   • beforeInteractive would put a render-blocking third-party script in
 *     <head>, directly undermining the FOUC work in this layout - the critical
 *     CSS comment above explains how much that first paint matters here.
 *   • lazyOnload waits for window load, which starves ads on the fast navigations
 *     that dominate an SPA. afterInteractive is the documented default for
 *     third-party display scripts and keeps them off the critical path.
 *
 * `crossOrigin="anonymous"` is REQUIRED, not optional. AdSense serves its
 * creative from a different origin and the loader reads the response; without
 * this attribute the browser blocks the script and no ad ever fills.
 *
 * NOTE ON THE REWARD PATH: this is DISPLAY advertising. AdSense has no rewarded
 * format at all, and nothing here is wired to claim_ad_reward. The token grant
 * in WatchAdForTokens remains an engagement reward, unchanged.
 *
 * ── WHY THIS RENDERS NOTHING IN DEVELOPMENT ──────────────────────────────────
 * `ADS_ENABLED` is false in every `next dev` build, so no `<Script>` is emitted
 * at all. That is the whole fix for the local console noise: the
 * "No ad slot found for: ca-pub-…" errors are printed by GOOGLE's loader, and a
 * script that is never requested cannot print them. See the long note on
 * `ADS_ENABLED` for why this is gated on the ENVIRONMENT rather than on
 * `typeof window` — a browser-only check here would render the tag on the client
 * while the server rendered nothing, which is a textbook hydration mismatch.
 *
 * The gate is a constant, not a stateful `useEffect`, so the server and client
 * agree by construction and there is no first-paint flash where the script
 * appears a tick late.
 */
export function AdSenseScript() {
  if (!ADS_ENABLED) return null;

  return (
    <Script
      id="adsense-loader"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={ADSENSE_SCRIPT_SRC}
    />
  );
}