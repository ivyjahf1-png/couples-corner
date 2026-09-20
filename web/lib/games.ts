/**
 * Couples Corner — Game Center registry facade (client-safe).
 *
 * The actual catalog lives in lib/gamesData.ts (the dynamic, scalable
 * registry). This module adapts it to the shape used across the app —
 * hub, player container and the server-side coin logic — and keeps the
 * reward-chest / level helpers. It must stay importable from Client
 * Components — any server-only logic lives in lib/server/games.ts.
 */

import {
  GAMES_REGISTRY,
  getGameById,
  type GameRegistryEntry,
} from "@/lib/gamesData";

export type GameKind = GameRegistryEntry["kind"];
export type GameTag = GameRegistryEntry["badge"];
export type GameCategory = GameRegistryEntry["category"];
export type { GameRegistryEntry };

export interface GameEntry {
  /** URL slug used by /games/[id]. */
  slug: string;
  title: string;
  tagline: string;
  /** Short label shown on the card (category chip). */
  tag: GameTag;
  /** What runs when the game launches. */
  kind: GameKind;
  /** External HTML5 game URL (kind === "iframe"). */
  iframeSrc?: string;
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
  /** Browsing category used by the hub's filter tabs. */
  category: GameCategory;
  /** Registry-style embed URL. Mirrors `iframeSrc` for iframe games. */
  embedUrl?: string;
}

/** Adapt the registry entries to the legacy GameEntry shape. */
export const GAMES: GameEntry[] = GAMES_REGISTRY.map((entry) => ({
  slug: entry.id,
  title: entry.title,
  tagline: entry.tagline,
  tag: entry.badge,
  kind: entry.kind,
  iframeSrc: entry.embedUrl,
  gradient: entry.gradient,
  emoji: entry.emoji,
  stake: entry.stake,
  reward: entry.reward,
  multiplayer: entry.multiplayer,
  category: entry.category,
  embedUrl: entry.embedUrl,
}));

export function getGameBySlug(slug: string): GameEntry | undefined {
  const entry = getGameById(slug);
  if (!entry) return undefined;
  return GAMES.find((game) => game.slug === entry.id);
}

export { CATEGORY_TABS, gamesByCategory } from "@/lib/gamesData";

/** Coin claimables shown on the hub. Cooldowns are enforced server-side. */
export interface RewardChest {
  /** Server-verified reward id sent to /api/games/reward. */
  rewardId: string;
  title: string;
  description: string;
  emoji: string;
  coins: number;
  /** Client-side hint only — the server owns the real cooldown. */
  cooldownLabel: string;
  accent: string;
}

export const REWARD_CHESTS: RewardChest[] = [
  {
    rewardId: "daily_bonus",
    title: "Daily Bonus",
    description: "A free stack of coins every 24 hours.",
    emoji: "🎁",
    coins: 50,
    cooldownLabel: "Every 24 hours",
    accent: "from-amber-400 to-orange-600",
  },
  {
    rewardId: "chest_silver",
    title: "Silver Chest",
    description: "Unlocks at Level 10 — a steady coin drip.",
    emoji: "🥈",
    coins: 120,
    cooldownLabel: "Every 12 hours",
    accent: "from-slate-300 to-slate-500",
  },
  {
    rewardId: "chest_level35",
    title: "Level 35 Benefits",
    description: "Milestone chest with a 10% reward boost, forever.",
    emoji: "🏆",
    coins: 500,
    cooldownLabel: "One-time milestone",
    accent: "from-yellow-400 to-amber-600",
  },
];

/** Coin thresholds for each player level (Lv1 = 0 coins). */
export const LEVEL_THRESHOLDS = [0, 250, 600, 1200, 2500, 5000, 9000];

export function levelFromBalance(balance: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (balance >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

/** Progress (0–100) towards the next level. */
export function levelProgress(balance: number): number {
  const level = levelFromBalance(balance);
  if (level >= LEVEL_THRESHOLDS.length) return 100;
  const floor = LEVEL_THRESHOLDS[level - 1];
  const ceil = LEVEL_THRESHOLDS[level];
  return Math.min(100, Math.round(((balance - floor) / (ceil - floor)) * 100));
}
