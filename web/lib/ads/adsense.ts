/**
 * AdSense publisher id, shared by the loader and every ad unit.
 *
 * Lives in its own module so the `data-ad-client` attribute and the loader's
 * `?client=` query can never drift apart - a mismatch there fails silently, with
 * an empty slot and no console error. Hardcoding the same literal in two files
 * is exactly how that happens.
 *
 * The env fallback is the real id so a fresh clone works without setup; override
 * with NEXT_PUBLIC_ADSENSE_CLIENT in .env.local to swap accounts. This is a
 * PUBLIC identifier - AdSense embeds it in every ad request by design, so the
 * NEXT_PUBLIC_ prefix is correct here and is not a leak. It authorises nothing
 * beyond "serve ads for this publisher".
 */
export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "pub-7630283650499048";

/**
 * Numeric form for the `data-ad-client` attribute.
 *
 * AdSense accepts the bare digits; the "ca-pub-" prefix is display convention
 * only. Stripped defensively so an operator who pastes "ca-pub-123" into the env
 * var does not produce the invalid "ca-pub-ca-pub-123" attribute, which would
 * stop every slot on the site from filling.
 */
export const ADSENSE_CLIENT_ID = ADSENSE_CLIENT.replace(/^ca-pub-/, "");

/**
 * src for the AdSense loader. */
export const ADSENSE_SCRIPT_SRC =
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

/**
 * SHOULD ADS BE SERVED IN THIS BUILD?
 *
 * ── WHY THIS IS FALSE IN DEVELOPMENT ────────────────────────────────────────
 * AdSense is a third-party ad SERVER, not a component library. In local dev the
 * loader executes for real and then, almost always, cannot fill: there is no ad
 * campaign behind the publisher id from a `localhost` origin, and Google
 * deliberately does not serve creatives to localhost. Every unfilled slot logs
 *
 *   ERROR: No ad slot found for:  ca-pub-XXXX/adsbygoogle.js,...
 *
 * from inside Google's own code, and it also floods the network panel with
 * doubleclick/tracking requests. None of that is fixable from application code —
 * there is no API to silence the loader's logging, and `console` patching would
 * be hiding a third party's output rather than addressing it.
 *
 * So the correct fix is to not load the third-party script at all in a build
 * where it cannot work. That removes the warnings at the source instead of
 * muting them, and it also stops the dev machine making a round trip to Google on
 * every page load, which is real latency against a hot-reload loop.
 *
 * ── HOW TO GET ADS IN LOCAL DEV IF YOU ACTUALLY WANT THEM ────────────────────
 * Ads are off in EVERY `next dev` build, whether or not the ids are configured.
 * Set `NEXT_PUBLIC_ADSENSE_DEV=1` in `.env.local` to opt back in — useful when
 * you are specifically testing a new ad unit's size or format and need to see it
 * render. The escape hatch exists so this is a one-env-var decision rather than
 * a code edit that someone forgets to revert before shipping.
 *
 * ── WHY `typeof window` IS NOT THE CHECK ─────────────────────────────────────
 * The obvious guard here is `typeof window === "undefined"`, but that is the
 * WRONG question for this component. `AdSenseScript` runs in the ROOT layout, so
 * the browser-only answer would flip depending on which render pass asked — and
 * more importantly it would say "yes, load ads" on the client while the server
 * rendered no script tag, which is precisely the hydration mismatch this whole
 * module exists to prevent. The environment, not the presence of a DOM, decides
 * whether ads are in play, and it decides identically on both sides.
 *
 * NOTE ON THE BUILD-TIME INLINING: `process.env.NODE_ENV` is statically replaced
 * by the bundler, so this constant folds to a literal. Server and client
 * therefore agree by construction — no runtime window sniffing, no mismatch, and
 * no hydration risk from the gate itself.
 */
export const ADS_ENABLED = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ADSENSE_DEV === "1";

/**
 * Ad unit id for the app-sidebar placement.
 *
 * A BARE NUMBER, unlike the publisher id. This is not an oversight: AdSense
 * ad unit ids are plain numeric strings, and prefixing this one with `ca-pub-`
 * or `pub-` would be a different (invalid) value that never fills. The two id
 * spaces are easy to confuse and the slot id is the one that silently breaks.
 *
 * Placements are one-to-one: each unit id is configured in the dashboard for a
 * specific size and format, and it also scopes reporting for that placement.
 * Adding a second placement means adding a second constant here, not reusing
 * this one, or the Ad units report collapses into a single row.
 */
export const ADSENSE_SLOT_SIDEBAR = "5766871498";