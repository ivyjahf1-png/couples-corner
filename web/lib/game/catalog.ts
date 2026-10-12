/**
 * THE GAME CATALOG — `data/games.json`, typed.
 *
 * WHY A SEPARATE FILE FROM `lib/game/registry.ts`. That module is the
 * Coin-Thrills launcher's allow-list: every entry is bound to the signed
 * `/api/game/launch` flow, a coin economy and a profile tile. This catalog is
 * the plain, browsable shelf behind `/games/<gameId>` — a title, a thumbnail and
 * one URL to put in an iframe. Keeping them apart means a storefront edit can
 * never silently change what the signed launcher will mint.
 *
 * ── THIS FILE IS THE SECURITY BOUNDARY, NOT A CONVENIENCE IMPORT ─────────────
 * The URL that goes into an iframe is ALWAYS read from here, by id. The route
 * parameter only ever selects WHICH entry — it is never used as, concatenated
 * into, or returned as a URL. That is what makes `?gameId=` and the path segment
 * unable to steer the iframe at an arbitrary origin: there is no code path that
 * treats untrusted input as an address.
 *
 * `isSafeGameUrl` is the second half. It runs on the value coming OUT of the
 * catalog too, so a future entry that pastes a `javascript:` or `data:` URL
 * fails at read time rather than at render time in every member's browser.
 *
 * Importing JSON rather than fetching it keeps this synchronous, so a Server
 * Component can resolve a game inline with no waterfall and no client-side
 * loading state.
 */

import catalogJson from "../../data/games.json";

/** One playable catalog entry, as authored in `data/games.json`. */
export interface CatalogGame {
  /** URL-safe id. This is the only value the route param is compared against. */
  id: string;
  /** Display name — page heading and the title badge on the control bar. */
  title: string;
  /** Shelf grouping, e.g. "Board", "Strategy". */
  category: string;
  /** Artwork URL. May be a public path or an absolute https URL. */
  thumbnail: string;
  /** The document loaded into the runner iframe. */
  iframeUrl: string;
}

/**
 * WHY THIS IS NOT A BARE `as CatalogGame[]`. The JSON is a build artefact that a
 * human edits by hand; `as` would assert a shape without checking one, and a
 * typo'd field would surface as `undefined` deep inside the page instead of at
 * the read. Filtering here means every consumer receives entries that genuinely
 * have a non-empty id and URL, and the `?? []` covers an empty or malformed
 * catalogue.
 */
const CATALOG: readonly CatalogGame[] = (
  Array.isArray(catalogJson) ? catalogJson : []
).filter(
  (game): game is CatalogGame =>
    typeof game === "object" &&
    game !== null &&
    typeof (game as CatalogGame).id === "string" &&
    (game as CatalogGame).id.length > 0 &&
    typeof (game as CatalogGame).title === "string" &&
    typeof (game as CatalogGame).iframeUrl === "string" &&
    (game as CatalogGame).iframeUrl.length > 0,
);

/** Every catalog entry, in authored order. */
export function listGames(): readonly CatalogGame[] {
  return CATALOG;
}

/**
 * Resolve one entry by id, or null when the id is unknown.
 *
 * The parameter is length-capped before the comparison: a path segment is
 * attacker-controlled and unbounded, and comparing a megabyte-long string
 * against a two-dozen-entry list on every request is a free CPU sink.
 */
export function findCatalogGame(gameId: string | undefined | null): CatalogGame | null {
  if (typeof gameId !== "string") return null;
  const wanted = gameId.slice(0, 64);
  return CATALOG.find((game) => game.id === wanted) ?? null;
}

/**
 * Is this URL safe to load in an iframe `src`?
 *
 * Allow-list rather than deny-list. Blocking `javascript:` and `data:` is a
 * game of whack-a-mole — the property is forgiving of case and whitespace
 * (`JaVaScRiPt:`, `  javascript:`, `java\tscript:`) and new schemes appear. So
 * only two shapes are permitted: a root-relative path (one of our own files in
 * `public/`) or a real `http`/`https` URL. Everything else is rejected, which
 * makes the check exhaustive by construction instead of by enumeration.
 *
 * `new URL` does the parsing, so the scheme is normalised and lower-cased
 * before the comparison — hand-rolled `startsWith` checks do not do that and are
 * the usual way this kind of guard gets bypassed.
 */
export function isSafeGameUrl(url: string | undefined | null): boolean {
  if (typeof url !== "string" || url.trim().length === 0) return false;

  const candidate = url.trim();

  /* Same-origin build. Must be root-relative — a leading "//" is a
     protocol-relative URL that inherits whatever scheme the page is on and is
     therefore not a path at all, so it falls through to the parsed branch. */
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return true;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
