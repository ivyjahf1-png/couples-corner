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

/** src for the AdSense loader. */
export const ADSENSE_SCRIPT_SRC =
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

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