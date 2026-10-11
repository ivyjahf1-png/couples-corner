/**
 * HTML5 GAME REGISTRY (client-safe — no server secrets, no coin logic).
 *
 * WHY THIS EXISTS: the legacy lib/gamesData.ts catalogued 36 titles that were
 * either built-in React/Canvas engines (kind: "builtin-*") or external
 * GameDistribution embeds that 404'd. All of that was removed with the old
 * Game Center. The new architecture is deliberately thin: every game is an
 * HTML5 build loaded in an iframe by components/game/GameModal, and the ONLY
 * thing this module owns is the truth about which builds exist and how to
 * reach them.
 *
 * SIDES THAT CONSUME IT:
  *   - `app/api/game/launch` validates gameId against this list server-side
 *     before building the launch URL — a client can never steer the launcher at
 *     an arbitrary URL.
 *   - components/game/GameModal (via GameLaunchButton/GameModalProvider)
 *     resolves titles for the loading header and picks the default game.
 *   - The profile screen's Recommended Games band renders tiles straight from
 *     this list, so adding a game here updates every surface at once — the same
 *     single-source-of-truth property the old registry had, minus the 30 dead
 *     entries.
 *
 * SERVING THE BUILDS: path is the public HTML5 Distribution embed URL for
 * each game, served directly by the launcher route. No first-party builds are
 * needed.
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
  /** HTML5 Distribution embed URL for the build. */
  path: string;
}

/**
 * The registered games. Keep the order deliberate — index 0 is what
 * DEFAULT_GAME_ID resolves to when a launcher entry point (the floating
 * Game button, the feed star) opens without a specific title in mind.
 */
export const HTML5_GAMES: readonly Html5Game[] = [
  {
    id: "ludo",
    title: "Ludo",
    tagline: "Roll, race, and bring your tokens home together.",
    emoji: "🎲",
    gradient: "from-rose-500 via-red-600 to-orange-700",
    path: "https://html5.gamedistribution.com/f258521f5fb34a4198d08caeb5168db7/",
  },
  {
    id: "mines",
    title: "Mines",
    tagline: "Clear the safe tiles — every one grows the pot.",
    emoji: "💣",
    gradient: "from-sky-500 via-blue-600 to-indigo-700",
    path: "https://html5.gamedistribution.com/a42b1f8fb54a49cfa3923c0b021d7495/",
  },
  {
    id: "spin-wheel",
    title: "Spin Wheel",
    tagline: "One spin, one shared fortune. Give it a whirl.",
    emoji: "🎡",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    path: "https://html5.gamedistribution.com/5f67b5e43a6344319808a3f81e351fdf/",
  },
  {
    id: "scratch",
    title: "Scratch",
    tagline: "Make and share your own interactive stories and games.",
    emoji: "🎨",
    gradient: "from-purple-500 via-violet-600 to-indigo-700",
    path: "https://html5.gamedistribution.com/831518f8c7b84f339f4d7ddc0756bb8c/",
  },
] as const;

/** The game opened by entry points that name no specific title. */
export const DEFAULT_GAME_ID: string = HTML5_GAMES[0]!.id;

/** Resolve a registered game, or undefined for an unknown id. */
export function findGame(gameId: string): Html5Game | undefined {
  return HTML5_GAMES.find((game) => game.id === gameId);
}
