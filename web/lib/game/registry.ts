/**
 * HTML5 GAME REGISTRY (client-safe — no server secrets, no coin logic).
 *
 * WHY THIS EXISTS: the legacy `lib/gamesData.ts` catalogued 36 titles that were
 * either built-in React/Canvas engines (`kind: "builtin-*"`) or external
 * GameDistribution embeds that 404'd. All of that was removed with the old
 * Game Center. The new architecture is deliberately thin: every game is an
 * HTML5 build loaded in an iframe by `components/game/GameModal`, and the ONLY
 * thing this module owns is the truth about which builds exist and how to
 * reach them.
 *
 * SIDES THAT CONSUME IT:
 *   - `app/api/game/launch` validates `gameId` against this list server-side
 *     before minting a session token — a client can never launch an arbitrary
 *     URL.
 *   - `components/game/GameModal` (via `GameLaunchButton`/`GameModalProvider`)
 *     resolves titles for the loading header and picks the default game.
 *   - The profile screen's Recommended Games band renders tiles straight from
 *     this list, so adding a game here updates every surface at once — the same
 *     single-source-of-truth property the old registry had, minus the 30 dead
 *     entries.
 *
 * SERVING THE BUILDS: `path` is first-party and relative, so a deploy works the
 * moment a bundle lands in `public/html5-games/<id>/index.html`. Nothing
 * external is fetched and no third-party CDN is baked in (the old external
 * embeds were the failure point this replaces). Until a real build is dropped
 * in, the shell page at each path renders an in-game "being prepared" state —
 * never a 404 inside the modal, preserving the product decision the old player
 * documented as "build in progress, never a 404".
 */

/** One launchable HTML5 game. Display fields double as tile artwork data. */
export interface Html5Game {
  /** Stable id sent to POST /api/game/launch. */
  id: string;
  /** Display name — modal header and profile tile title. */
  title: string;
  /** One-line pitch, used as the profile tile's accessible description. */
  tagline: string;
  /** Tile glyph (aria-hidden at the call site; the tagline names the tile). */
  emoji: string;
  /** Tailwind gradient utilities for the profile tile artwork. */
  gradient: string;
  /** First-party path of the HTML5 build, served from `public/`. */
  path: string;
}

/**
 * The registered games. Keep the order deliberate — index 0 is what
 * `DEFAULT_GAME_ID` resolves to when a launcher entry point (the floating
 * Game button, the feed star) opens without a specific title in mind.
 */
export const HTML5_GAMES: readonly Html5Game[] = [
  {
    id: "ludo",
    title: "Ludo",
    tagline: "Roll, race, and bring your tokens home together.",
    emoji: "🎲",
    gradient: "from-rose-500 via-red-600 to-orange-700",
    path: "/html5-games/ludo/index.html",
  },
  {
    id: "mines",
    title: "Mines",
    tagline: "Clear the safe tiles — every one grows the pot.",
    emoji: "💣",
    gradient: "from-sky-500 via-blue-600 to-indigo-700",
    path: "/html5-games/mines/index.html",
  },
  {
    id: "spin-wheel",
    title: "Spin Wheel",
    tagline: "One spin, one shared fortune. Give it a whirl.",
    emoji: "🎡",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    path: "/html5-games/spin-wheel/index.html",
  },
] as const;

/** The game opened by entry points that name no specific title. */
export const DEFAULT_GAME_ID: string = HTML5_GAMES[0]!.id;

/** Resolve a registered game, or undefined for an unknown id. */
export function findGame(gameId: string): Html5Game | undefined {
  return HTML5_GAMES.find((game) => game.id === gameId);
}
