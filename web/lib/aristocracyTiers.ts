/**
 * Couples Corner - Aristocracy tier definitions (client-safe).
 *
 * Shared by the Aristocracy UI and the server-side commerce module so the
 * displayed tiers/prices always match what the server charges.
 */

export const ARISTOCRACY_TIERS = ["Knight", "Baron", "Viscount", "Duke", "Monarch"] as const;
export type AristocracyTier = (typeof ARISTOCRACY_TIERS)[number];

/** Coin cost per 30-day Aristocracy plan. */
export const TIER_PRICES: Record<AristocracyTier, number> = {
  Knight: 10000,
  Baron: 25000,
  Viscount: 45000,
  Duke: 70000,
  Monarch: 120000,
};

export const TIER_PERKS: Record<AristocracyTier, string[]> = {
  Knight: ["Special profile badge", "10 free super likes daily", "See who liked you", "Priority message delivery"],
  Baron: ["Everything in Knight", "Unlimited rewinds", "Incognito browsing mode", "Featured profile boost weekly"],
  Viscount: ["Everything in Baron", "Animated avatar frame", "Priority profile placement", "Extended message storage"],
  Duke: ["Everything in Duke", "Exclusive duke room effect", "Direct chat with verified members", "Monthly coin bonus"],
  Monarch: ["Everything in Duke", "Monarch lounge access", "Custom room card", "Personalized matching concierge"],
};

export const TIER_MASCOTS: Record<AristocracyTier, string> = {
  Knight: "🛡️",
  Baron: "🦁",
  Viscount: "🦅",
  Duke: "🎖️",
  Monarch: "👑",
};

export function isAristocracyTier(value: unknown): value is AristocracyTier {
  return typeof value === "string" && (ARISTOCRACY_TIERS as readonly string[]).includes(value);
}