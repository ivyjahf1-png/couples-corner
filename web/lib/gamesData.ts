/**
 * Couples Corner — dynamic Game Center registry (client-safe).
 *
 * The single source of truth for the games shown on /games and playable in
 * /games/[id]. Adding a game is a one-line change here: append an entry to
 * GAMES_REGISTRY and the hub grid, filter tabs and player route pick it up
 * automatically. This module must stay importable from Client Components —
 * any server-only coin logic lives in lib/server/games.ts.
 */

export type GameKind =
  | "iframe"
  | "builtin-ludo"
  | "builtin-memory"
  | "builtin-tictactoe"
  | "builtin-trivia"
  | "builtin-word"
  | "builtin-slots"
  | "builtin-slide";

export type GameBadge = "Hot" | "New" | "Multiplayer" | "Recommended";

export type GameCategory = "Board" | "Arcade" | "Strategy" | "Casual" | "Slots" | "Action";

export interface GameRegistryEntry {
  /** URL id used by /games/[id]. */
  id: string;
  title: string;
  tagline: string;
  /** Badge chip shown on the card ("Hot", "New", "Multiplayer", …). */
  badge: GameBadge;
  /** Browsing category used by the hub's filter tabs. */
  category: GameCategory;
  /**
   * What runs when the game launches: an external HTML5/WebGL build
   * ("iframe") or the built-in canvas Ludo engine ("builtin-ludo").
   */
  kind: GameKind;
  /** External HTML5 game URL (kind === "iframe"). */
  embedUrl?: string;
  /** Accent gradient for the banner card (Tailwind classes). */
  gradient: string;
  /** Emoji glyph used as the game artwork placeholder. */
  emoji: string;
  /** Coins required to start a session (0 = free to play). */
  stake: number;
  /** Base coin payout awarded for a win. */
  reward: number;
  /** Whether the game supports multiplayer matchmaking (vs bot fallback). */
  multiplayer: boolean;
}

/**
 * The dynamic Game Center catalog.
 *
 * "Couple Ludo Advance" is the flagship high-end multiplayer board game —
 * it runs the built-in canvas engine (components/games/LudoGame) with full
 * VS-Bot logic, so it is playable out of the box and is featured first.
 *
 * Every remaining title runs a built-in, self-hosted engine:
 *   builtin-slots · builtin-slide · builtin-tictactoe · builtin-memory
 *   builtin-trivia · builtin-word
 * These live in components/games/ and need no network access, so a card can
 * never resolve to an upstream 404.
 *
 * `kind: "iframe"` + `embedUrl` remain supported for the day a title ships a
 * hosted HTML5/WebGL build: set both and the player switches to a sandboxed
 * iframe with no other change. A title with `kind: "iframe"` and no
 * `embedUrl` renders the in-app "build in progress" state — never a 404.
 */
export const GAMES_REGISTRY: GameRegistryEntry[] = [
  {
    id: "couples-ludo-advance",
    title: "Couple Ludo Advance",
    tagline: "The premium multiplayer board race — team up or duel smart bots.",
    badge: "Multiplayer",
    category: "Board",
    kind: "builtin-ludo",
    gradient: "from-rose-500 via-red-600 to-orange-700",
    emoji: "🎲",
    stake: 20,
    reward: 80,
    multiplayer: true,
  },
  {
    id: "fortune-gems",
    title: "Fortune Gems",
    tagline: "Match sparkling gems and grow your fortune together.",
    badge: "Hot",
    category: "Slots",
    kind: "builtin-slots",
    gradient: "from-orange-500 via-amber-400 to-sky-600",
    emoji: "💎",
    stake: 10,
    reward: 40,
    multiplayer: false,
  },
  {
    id: "wealthy-tiger",
    title: "Wealthy Tiger",
    tagline: "Prowl the golden reels for roaring jackpots.",
    badge: "Hot",
    category: "Slots",
    kind: "builtin-slots",
    gradient: "from-amber-500 via-orange-600 to-rose-600",
    emoji: "🐯",
    stake: 10,
    reward: 40,
    multiplayer: false,
  },
  {
    id: "world-goal",
    title: "World Goal",
    tagline: "Score big in the world's favourite couples cup.",
    badge: "New",
    category: "Action",
    kind: "builtin-slide",
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    emoji: "⚽",
    stake: 5,
    reward: 25,
    multiplayer: false,
  },
  {
    id: "rocket-star",
    title: "Rocket Star",
    tagline: "Blast off, dodge the asteroids, cash out before the burst.",
    badge: "Hot",
    category: "Action",
    kind: "builtin-slide",
    gradient: "from-sky-500 via-blue-600 to-violet-700",
    emoji: "🚀",
    stake: 15,
    reward: 60,
    multiplayer: false,
  },
  {
    id: "couples-chess-duel",
    title: "Couples Chess Duel",
    tagline: "Out-think your other half on the classic 64 squares.",
    badge: "Multiplayer",
    category: "Board",
    kind: "builtin-tictactoe",
    gradient: "from-slate-500 via-slate-700 to-slate-900",
    emoji: "♟️",
    stake: 15,
    reward: 70,
    multiplayer: true,
  },
  {
    id: "checkers-charm",
    title: "Checkers Charm",
    tagline: "King your pieces before your partner kings theirs.",
    badge: "Multiplayer",
    category: "Board",
    kind: "builtin-tictactoe",
    gradient: "from-red-500 via-rose-600 to-slate-800",
    emoji: "🔴",
    stake: 10,
    reward: 45,
    multiplayer: true,
  },
  {
    id: "backgammon-bliss",
    title: "Backgammon Bliss",
    tagline: "Dice, dash and bear off — a timeless two-player race.",
    badge: "New",
    category: "Board",
    kind: "builtin-memory",
    gradient: "from-amber-600 via-yellow-600 to-stone-700",
    emoji: "🎲",
    stake: 15,
    reward: 55,
    multiplayer: true,
  },
  {
    id: "snakes-and-ladders-love",
    title: "Snakes & Ladders Love",
    tagline: "Climb the ladders, dodge the snakes, race to 100.",
    badge: "New",
    category: "Board",
    kind: "builtin-memory",
    gradient: "from-lime-500 via-green-600 to-emerald-800",
    emoji: "🐍",
    stake: 5,
    reward: 30,
    multiplayer: true,
  },
  {
    id: "domino-duet",
    title: "Domino Duet",
    tagline: "Match the tiles, block your partner, take the round.",
    badge: "Multiplayer",
    category: "Board",
    kind: "builtin-memory",
    gradient: "from-slate-400 via-slate-600 to-zinc-800",
    emoji: "🁣",
    stake: 10,
    reward: 40,
    multiplayer: true,
  },
  {
    id: "neon-runner-rush",
    title: "Neon Runner Rush",
    tagline: "Sprint the neon skyline and beat your best distance.",
    badge: "Hot",
    category: "Arcade",
    kind: "builtin-slide",
    gradient: "from-cyan-400 via-sky-600 to-indigo-800",
    emoji: "🏃",
    stake: 5,
    reward: 35,
    multiplayer: false,
  },
  {
    id: "bubble-pop-bliss",
    title: "Bubble Pop Bliss",
    tagline: "Pop matching bubbles in endless cozy combos.",
    badge: "New",
    category: "Arcade",
    kind: "builtin-memory",
    gradient: "from-orange-400 via-amber-500 to-rose-600",
    emoji: "🫧",
    stake: 0,
    reward: 25,
    multiplayer: false,
  },
  {
    id: "brick-breaker-duo",
    title: "Brick Breaker Duo",
    tagline: "Clear every brick — one paddle, perfect timing.",
    badge: "Hot",
    category: "Arcade",
    kind: "builtin-slide",
    gradient: "from-orange-400 via-red-500 to-rose-700",
    emoji: "🧱",
    stake: 5,
    reward: 30,
    multiplayer: false,
  },
  {
    id: "space-shooter-sparks",
    title: "Space Shooter Sparks",
    tagline: "Defend the galaxy armada with your co-pilot.",
    badge: "New",
    category: "Arcade",
    kind: "builtin-slide",
    gradient: "from-indigo-500 via-blue-700 to-slate-900",
    emoji: "🛸",
    stake: 10,
    reward: 50,
    multiplayer: false,
  },
  {
    id: "fruit-slice-frenzy",
    title: "Fruit Slice Frenzy",
    tagline: "Swipe, slice, combo — don't miss the bombs.",
    badge: "Hot",
    category: "Arcade",
    kind: "builtin-memory",
    gradient: "from-lime-400 via-emerald-500 to-teal-700",
    emoji: "🍉",
    stake: 5,
    reward: 30,
    multiplayer: false,
  },
  {
    id: "pinball-partners",
    title: "Pinball Partners",
    tagline: "Flip, bump and chase the high-score table together.",
    badge: "New",
    category: "Arcade",
    kind: "builtin-slide",
    gradient: "from-orange-500 via-amber-500 to-rose-600",
    emoji: "🎰",
    stake: 10,
    reward: 45,
    multiplayer: false,
  },
  {
    id: "dino-dash-date",
    title: "Dino Dash Date",
    tagline: "Leap the cacti in this prehistoric endless run.",
    badge: "New",
    category: "Arcade",
    kind: "builtin-slide",
    gradient: "from-stone-400 via-amber-600 to-orange-700",
    emoji: "🦖",
    stake: 0,
    reward: 25,
    multiplayer: false,
  },
  {
    id: "tower-defense-tango",
    title: "Tower Defense Tango",
    tagline: "Place your towers, hold the line, protect the keep.",
    badge: "Multiplayer",
    category: "Strategy",
    kind: "builtin-tictactoe",
    gradient: "from-green-500 via-emerald-700 to-slate-900",
    emoji: "🏹",
    stake: 15,
    reward: 60,
    multiplayer: true,
  },
  {
    id: "empire-builders",
    title: "Empire Builders",
    tagline: "Grow a village into an empire — one coin at a time.",
    badge: "New",
    category: "Strategy",
    kind: "builtin-slide",
    gradient: "from-yellow-500 via-amber-600 to-orange-800",
    emoji: "🏰",
    stake: 10,
    reward: 55,
    multiplayer: false,
  },
  {
    id: "clash-of-clues",
    title: "Clash of Clues",
    tagline: "A strategy quiz duel — best of five rounds wins.",
    badge: "Multiplayer",
    category: "Strategy",
    kind: "builtin-trivia",
    gradient: "from-sky-500 via-blue-600 to-slate-700",
    emoji: "🧠",
    stake: 10,
    reward: 45,
    multiplayer: true,
  },
  {
    id: "connect-four-fireside",
    title: "Connect Four Fireside",
    tagline: "Drop discs, build four in a row, claim victory.",
    badge: "Multiplayer",
    category: "Strategy",
    kind: "builtin-tictactoe",
    gradient: "from-sky-400 via-blue-600 to-indigo-800",
    emoji: "🔵",
    stake: 10,
    reward: 40,
    multiplayer: true,
  },
  {
    id: "settlers-of-couples-bay",
    title: "Settlers of Couples Bay",
    tagline: "Trade, build and settle the island before your rival.",
    badge: "New",
    category: "Strategy",
    kind: "builtin-memory",
    gradient: "from-teal-400 via-cyan-600 to-blue-800",
    emoji: "🏝️",
    stake: 15,
    reward: 60,
    multiplayer: true,
  },
  {
    id: "memory-match-hearts",
    title: "Memory Match Hearts",
    tagline: "Flip the pairs and keep your streak alive.",
    badge: "Hot",
    category: "Casual",
    kind: "builtin-memory",
    gradient: "from-rose-400 via-pink-500 to-fuchsia-700",
    emoji: "💞",
    stake: 0,
    reward: 25,
    multiplayer: false,
  },
  {
    id: "solitaire-sunsets",
    title: "Solitaire Sunsets",
    tagline: "Unwind with the calmest solitaire on the app.",
    badge: "New",
    category: "Casual",
    kind: "builtin-memory",
    gradient: "from-orange-300 via-amber-500 to-rose-600",
    emoji: "🃏",
    stake: 0,
    reward: 20,
    multiplayer: false,
  },
  {
    id: "2048-hearts",
    title: "2048 Hearts",
    tagline: "Slide the tiles and reach the golden heart.",
    badge: "Hot",
    category: "Casual",
    kind: "builtin-slide",
    gradient: "from-amber-300 via-orange-500 to-red-600",
    emoji: "💛",
    stake: 5,
    reward: 30,
    multiplayer: false,
  },
  {
    id: "word-puzzle-whispers",
    title: "Word Puzzle Whispers",
    tagline: "Guess the word of the day before your partner does.",
    badge: "New",
    category: "Casual",
    kind: "builtin-word",
    gradient: "from-emerald-400 via-teal-500 to-cyan-700",
    emoji: "🔤",
    stake: 5,
    reward: 35,
    multiplayer: true,
  },
  {
    id: "trivia-couple-cup",
    title: "Trivia Couple Cup",
    tagline: "Who knows the other better? Prove it in trivia.",
    badge: "Multiplayer",
    category: "Casual",
    kind: "builtin-trivia",
    gradient: "from-orange-400 via-amber-500 to-sky-700",
    emoji: "❓",
    stake: 5,
    reward: 30,
    multiplayer: true,
  },
  {
    id: "idle-garden-together",
    title: "Idle Garden Together",
    tagline: "Plant, water and watch your shared garden bloom.",
    badge: "New",
    category: "Casual",
    kind: "builtin-memory",
    gradient: "from-green-400 via-lime-500 to-emerald-700",
    emoji: "🌱",
    stake: 0,
    reward: 20,
    multiplayer: false,
  },
  {
    id: "golden-pharaoh-spins",
    title: "Golden Pharaoh Spins",
    tagline: "Unlock the tomb's reels and chase the pharaoh's gold.",
    badge: "Hot",
    category: "Slots",
    kind: "builtin-slots",
    gradient: "from-yellow-400 via-amber-600 to-yellow-800",
    emoji: "🏺",
    stake: 10,
    reward: 50,
    multiplayer: false,
  },
  {
    id: "lucky-lantern-spins",
    title: "Lucky Lantern Spins",
    tagline: "Light the lanterns for a festival of jackpots.",
    badge: "New",
    category: "Slots",
    kind: "builtin-slots",
    gradient: "from-red-400 via-rose-600 to-amber-700",
    emoji: "🏮",
    stake: 10,
    reward: 50,
    multiplayer: false,
  },
  {
    id: "ocean-pearl-reels",
    title: "Ocean Pearl Reels",
    tagline: "Dive deep for pearl combos and treasure multipliers.",
    badge: "New",
    category: "Slots",
    kind: "builtin-slots",
    gradient: "from-cyan-300 via-blue-500 to-indigo-800",
    emoji: "🫧",
    stake: 10,
    reward: 45,
    multiplayer: false,
  },
  {
    id: "nitro-street-drift",
    title: "Nitro Street Drift",
    tagline: "Burn rubber through neon streets and bank the bounty.",
    badge: "Hot",
    category: "Action",
    kind: "builtin-slide",
    gradient: "from-zinc-500 via-slate-700 to-red-800",
    emoji: "🏎️",
    stake: 15,
    reward: 60,
    multiplayer: false,
  },
  {
    id: "ninja-shadow-leap",
    title: "Ninja Shadow Leap",
    tagline: "Wall-run, slash and vanish through the shadow city.",
    badge: "New",
    category: "Action",
    kind: "builtin-slide",
    gradient: "from-slate-600 via-gray-800 to-black",
    emoji: "🥷",
    stake: 10,
    reward: 50,
    multiplayer: false,
  },
  {
    id: "archer-ace-showdown",
    title: "Archer Ace Showdown",
    tagline: "Draw, aim and out-score your rival archer.",
    badge: "Multiplayer",
    category: "Action",
    kind: "builtin-tictactoe",
    gradient: "from-amber-500 via-orange-700 to-stone-800",
    emoji: "🏹",
    stake: 10,
    reward: 45,
    multiplayer: true,
  },
  {
    id: "zombie-block-defense",
    title: "Zombie Block Defense",
    tagline: "Barricade the block and hold out till sunrise.",
    badge: "Hot",
    category: "Action",
    kind: "builtin-tictactoe",
    gradient: "from-green-600 via-gray-700 to-zinc-900",
    emoji: "🧟",
    stake: 15,
    reward: 60,
    multiplayer: false,
  },
];

export function getGameById(id: string): GameRegistryEntry | undefined {
  return GAMES_REGISTRY.find((game) => game.id === id);
}

/** Tab labels for the hub's category filter (in display order). */
export const CATEGORY_TABS: { key: GameCategory | "All"; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Board", label: "Board Games" },
  { key: "Slots", label: "Slots" },
  { key: "Action", label: "Action" },
  { key: "Arcade", label: "Arcade" },
  { key: "Strategy", label: "Strategy" },
  { key: "Casual", label: "Casual" },
];

export function gamesByCategory(category: GameCategory | "All"): GameRegistryEntry[] {
  if (category === "All") return GAMES_REGISTRY;
  return GAMES_REGISTRY.filter((game) => game.category === category);
}