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
  /**
   * Brand hex (e.g. "#22C55E") used to tint the tile gradient on the Arcade
   * grid. Optional so a hand-authored entry that predates this field still
   * passes validation; the grid falls back to a neutral slate when absent.
   */
  accent?: string;
  /**
   * Optional per-title glyph (e.g. "🎲"). Authored in `data/games.json` so the
   * storefront and the profile tiles can show a distinct mark per game instead
   * of one shared gamepad. Optional because the field post-dates the first
   * entries; consumers fall back to a neutral glyph when it is absent.
   */
  emoji?: string;
}

/**
 * WHY THIS IS NOT A BARE `as CatalogGame[]`. The JSON is a build artefact that a
 * human edits by hand; `as` would assert a shape without checking one, and a
 * typo'd field would surface as `undefined` deep inside the page instead of at
 * the read. Filtering here means every consumer receives entries that genuinely
 * have a non-empty id and URL, and the `?? []` covers an empty or malformed
 * catalogue.
 *
 * WHY THE SOURCE IS CAST TO `unknown[]` FIRST. `catalogJson` is typed by
 * inference from the literal, so every field it happens to contain — including
 * the optional `accent`/`emoji`, which every current entry now carries — comes
 * through as REQUIRED. A `game is CatalogGame` predicate demands `CatalogGame`
 * be assignable to that parameter type, and an optional `accent?: string` is
 * NOT assignable to an inferred `accent: string`. Reading through `unknown[]`
 * keeps the predicate honest: the guard below is what actually checks each
 * entry, so the element type on the way in must not pretend to already know
 * the shape.
 */
const CATALOG: readonly CatalogGame[] = (
  Array.isArray(catalogJson) ? (catalogJson as unknown[]) : []
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
 * EVERY GAME IS SELF-HOSTED, so this is deliberately the NARROWEST possible
 * allow-list: a single root-relative path into `public/`. There is no external
 * branch any more. Third-party embeds were removed because cross-origin iframe
 * hosts block our frame (they send `X-Frame-Options`/`frame-ancestors`), so an
 * external `src` renders a blank game — which is strictly worse than refusing
 * the entry here. Keeping the guard to same-origin paths means a stray
 * `https://` left in `data/games.json` fails closed (the route 404s) instead of
 * shipping a broken, blocked frame to a member.
 *
 * A leading "//" is a protocol-relative URL that inherits the page scheme and
 * therefore points at another origin, not at `public/`; it is rejected like any
 * other absolute URL. Everything that is not a clean root-relative path fails,
 * which makes the check exhaustive by construction rather than by enumeration.
 */
export function isSafeGameUrl(url: string | undefined | null): boolean {
  if (typeof url !== "string") return false;
  const candidate = url.trim();
  if (candidate.length === 0) return false;

  /* Same-origin build: a single leading slash and nothing else scheme-like.
     `startsWith("/") && !startsWith("//")` is what separates a path from a
     protocol-relative URL. */
  return candidate.startsWith("/") && !candidate.startsWith("//");
}
