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
  /**
   * Matchmaking-suite section this game belongs to.
   *
   * Drives the Game Center tabs — "puzzle" renders under Puzzle & Match,
   * "multiplayer" under Multiplayer Classics, and "thrill" under Coin
   * Thrills. Defaults to "puzzle" so older entries never render homeless.
   */
  section?: "puzzle" | "multiplayer" | "thrill";
  /**
   * How the center launches this entry.
   *
   * "iframe" games open through `openGame(id)` (the signed `/api/game/launch`
   * URL loads in the fullscreen iframe). "native" games never touch the
   * iframe — they dispatch their own modal event instead (Truth or Dare,
   * Real Feelings, the compatibility quiz). Defaults to "iframe".
   */
  kind?: "iframe" | "native";
  /**
   * Native modal event for "native" entries, e.g. "couplescorner:open-truth-or-dare".
   * Ignored for iframe games.
   */
  nativeEvent?: string;
  /** Short category label shown on the card (e.g. "Match-3 Puzzle"). */
  categoryLabel?: string;
  /** True when the game participates in the coin economy (shows a coin chip). */
  coinGame?: boolean;
  /**
   * True when a chat-room challenge card can be sent for this game.
   * Challenge cards post a normal text message with a play payload, so the
   * challenge survives on every surface that renders messages.
   */
  challengeable?: boolean;
}

/**
 * The registered games. Keep the order deliberate — index 0 is what
 * DEFAULT_GAME_ID resolves to when a launcher entry point (the floating
 * Game button, the feed star) opens without a specific title in mind.
 *
 * NOTE: the four legacy ids (ludo, mines, spin-wheel, scratch) keep their
 * exact ids and paths — `/api/game/launch` call sites and profile tiles
 * already reference them, and renaming would 404 those surfaces.
 */
export const HTML5_GAMES: readonly Html5Game[] = [
  {
    id: "ludo",
    title: "Ludo",
    tagline: "Roll, race, and bring your tokens home together.",
    emoji: "🎲",
    gradient: "from-rose-500 via-red-600 to-orange-700",
    path: "https://html5.gamedistribution.com/f258521f5fb34a4198d08caeb5168db7/",
    section: "multiplayer",
    kind: "iframe",
    categoryLabel: "Realtime Multiplayer",
    challengeable: true,
  },
  {
    id: "ludo-1v1",
    title: "Ludo Master 1v1",
    tagline: "Challenge your match to a head-to-head Ludo duel.",
    emoji: "🏆",
    gradient: "from-red-500 via-rose-600 to-pink-700",
    path: "https://html5.gamedistribution.com/f258521f5fb34a4198d08caeb5168db7/",
    section: "multiplayer",
    kind: "iframe",
    categoryLabel: "Realtime Multiplayer",
    challengeable: true,
  },
  {
    id: "whot-battle",
    title: "Whot! Card Battle",
    tagline: "Outplay your match in the classic African card duel.",
    emoji: "🃏",
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    path: "https://html5.gamedistribution.com/5f67b5e43a6344319808a3f81e351fdf/",
    section: "multiplayer",
    kind: "iframe",
    categoryLabel: "Card Battle",
    challengeable: true,
  },
  {
    id: "jewels-blitz",
    title: "Jewels Blitz",
    tagline: "Swap sparkling gems in this fast Match-3 puzzler.",
    emoji: "💎",
    gradient: "from-fuchsia-500 via-purple-600 to-indigo-700",
    path: "https://html5.gamedistribution.com/rv/831518f8c7b84f339f4d7ddc0756bb8c/",
    section: "puzzle",
    kind: "iframe",
    categoryLabel: "Match-3 Puzzle",
  },
  {
    id: "tile-match",
    title: "Tile Match",
    tagline: "Clear the board three tiles at a time — pure focus.",
    emoji: "🧩",
    gradient: "from-cyan-500 via-sky-600 to-blue-700",
    path: "https://html5.gamedistribution.com/rv/5f67b5e43a6344319808a3f81e351fdf/",
    section: "puzzle",
    kind: "iframe",
    categoryLabel: "Triple Tile Puzzle",
  },
  {
    id: "mines",
    title: "Mines",
    tagline: "Clear the safe tiles — every one grows the pot.",
    emoji: "💣",
    gradient: "from-sky-500 via-blue-600 to-indigo-700",
    path: "https://html5.gamedistribution.com/a42b1f8fb54a49cfa3923c0b021d7495/",
    section: "puzzle",
    kind: "iframe",
    categoryLabel: "Logic Mine Puzzle",
  },
  {
    id: "mines-gold",
    title: "Mines Gold",
    tagline: "Stake coins, dodge the mines, and cash out golden.",
    emoji: "🪙",
    gradient: "from-amber-400 via-yellow-500 to-orange-600",
    path: "https://html5.gamedistribution.com/a42b1f8fb54a49cfa3923c0b021d7495/",
    section: "thrill",
    kind: "iframe",
    categoryLabel: "Coin Thrill",
    coinGame: true,
  },
  {
    id: "spin-wheel",
    title: "Spin Wheel",
    tagline: "One spin, one shared fortune. Give it a whirl.",
    emoji: "🎡",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    path: "https://html5.gamedistribution.com/5f67b5e43a6344319808a3f81e351fdf/",
    section: "thrill",
    kind: "iframe",
    categoryLabel: "Lucky Spin",
    coinGame: true,
  },
  {
    id: "lucky-chest",
    title: "Spin the Wheel & Lucky Chest",
    tagline: "Spin daily, crack the chest, and shower coins.",
    emoji: "🎁",
    gradient: "from-yellow-400 via-amber-500 to-orange-600",
    path: "https://html5.gamedistribution.com/831518f8c7b84f339f4d7ddc0756bb8c/",
    section: "thrill",
    kind: "iframe",
    categoryLabel: "Lucky Chest",
    coinGame: true,
  },
  {
    id: "scratch",
    title: "Scratch",
    tagline: "Make and share your own interactive stories and games.",
    emoji: "🎨",
    gradient: "from-purple-500 via-violet-600 to-indigo-700",
    path: "https://html5.gamedistribution.com/831518f8c7b84f339f4d7ddc0756bb8c/",
    section: "puzzle",
    kind: "iframe",
    categoryLabel: "Creative Play",
  },
  {
    id: "truth-or-dare",
    title: "Truth or Dare",
    tagline: "Couple's Spicy / Icebreaker Edition — swipe a card, send it to chat.",
    emoji: "🔥",
    gradient: "from-rose-500 via-pink-600 to-fuchsia-700",
    path: "",
    section: "multiplayer",
    kind: "native",
    nativeEvent: "couplescorner:open-truth-or-dare",
    categoryLabel: "Icebreaker",
  },
  {
    id: "real-feelings",
    title: "Real Feelings",
    tagline: "Deep connection prompts for late-night honesty.",
    emoji: "💌",
    gradient: "from-pink-500 via-rose-500 to-red-500",
    path: "",
    section: "multiplayer",
    kind: "native",
    nativeEvent: "couplescorner:open-truth-or-dare",
    categoryLabel: "Deep Connection",
  },
  {
    id: "compatibility-quiz",
    title: "Couple's Compatibility Quiz",
    tagline: "Answer together and reveal your match score.",
    emoji: "💘",
    gradient: "from-red-400 via-rose-500 to-pink-600",
    path: "",
    section: "multiplayer",
    kind: "native",
    nativeEvent: "couplescorner:open-truth-or-dare",
    categoryLabel: "Compatibility",
  },
] as const;

/** The game opened by entry points that name no specific title. */
export const DEFAULT_GAME_ID: string = HTML5_GAMES[0]!.id;

/** Resolve a registered game, or undefined for an unknown id. */
export function findGame(gameId: string): Html5Game | undefined {
  return HTML5_GAMES.find((game) => game.id === gameId);
}
