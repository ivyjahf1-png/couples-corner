/**
 * Couples Corner - VIP Club tier definitions (client-safe).
 *
 * THE REBRAND, PRECISELY: this product surface used to be called "Aristocracy".
 * That is a game-faction rank, not a membership benefit, and it fought the rest
 * of the product's upscale dating voice. It is now the "VIP Club" everywhere -
 * in this module's identifiers, the /vip-club route and the UI.
 *
 * ⚠️ THE TIER *STRING VALUES* DID NOT CHANGE, AND MUST NOT.
 * "Knight" / "Baron" / "Viscount" / "Duke" / "Monarch" are written into
 * `public.aristocracy_activations.tier` (and into `game_ledger.reward_id` as
 * `aristocracy:<tier>`). Renaming a value would orphan every existing
 * membership row, because lookups match on the exact string. So:
 *   • Renaming a SYMBOL   → safe, do it freely.
 *   • Renaming a VALUE    → a data migration, NOT a rebrand.
 * The `aristocracy_activations` TABLE and `aristocracy:` ledger PREFIX are
 * likewise frozen for the same reason. Only the TypeScript names changed.
 *
 * Shared by the VIP Club UI and the server-side commerce module so the
 * displayed tiers/prices always match what the server charges.
 */

export const VIP_TIERS = ["Knight", "Baron", "Viscount", "Duke", "Monarch"] as const;
export type VipTier = (typeof VIP_TIERS)[number];

/** Coin cost per 30-day VIP Club plan. */
export const TIER_PRICES: Record<VipTier, number> = {
  Knight: 10000,
  Baron: 25000,
  Viscount: 45000,
  Duke: 70000,
  Monarch: 120000,
};

/**
 * The perk families the VIP Club actually sells, in the order the progression
 * view presents them.
 *
 * This exists so the UI can render a *tier progression* — a per-family
 * "locked → unlocked at X" ladder — rather than a flat list of sentences. The
 * old `TIER_PERKS` was an array of strings where the first entry was literally
 * the text "Everything in Knight", which is not a perk: it is a sentence about
 * the list, and it could not be styled, sorted, or checked against a family.
 * A member could not answer "what does Baron actually give me that Knight
 * doesn't?" from it.
 */
export const PERK_FAMILIES = [
  { id: "matching", label: "Priority matching" },
  { id: "cosmetic", label: "Exclusive profile frames" },
  { id: "ads", label: "Ad-free experience" },
  { id: "badge", label: "Badge displays" },
] as const;

export type PerkFamilyId = (typeof PERK_FAMILIES)[number]["id"];

/**
 * The tier each perk family first unlocks at, per family.
 *
 * A perk is granted to a member at the highest tier they hold that is AT OR
 * ABOVE the unlocking tier — so perks accumulate as a member climbs, which is
 * what makes the progression view a ladder rather than five unrelated cards.
 */
export const PERK_UNLOCKS: Record<PerkFamilyId, { tier: VipTier; detail: string }> = {
  matching: { tier: "Baron", detail: "Your profile is surfaced earlier in Discover." },
  cosmetic: { tier: "Viscount", detail: "Animated avatar frames and entrance effects." },
  ads: { tier: "Viscount", detail: "Sponsored cards are removed from your feed." },
  badge: { tier: "Knight", detail: "A tier badge appears beside your name." },
};

/**
 * Every perk a tier confers, resolved — i.e. the perk that family first unlocks
 * at a lower tier is still listed, because a Duke keeps the Baron matching
 * benefit. This is what the "Included privileges" panel renders.
 */
export function perksForTier(tier: VipTier): { id: PerkFamilyId; label: string; detail: string }[] {
  const rank = VIP_TIERS.indexOf(tier);
  return PERK_FAMILIES.map(({ id, label }) => ({
    id,
    label,
    detail: rank >= VIP_TIERS.indexOf(PERK_UNLOCKS[id].tier) ? PERK_UNLOCKS[id].detail : "Unlocks higher up",
  })).filter((perk) => perk.detail !== "Unlocks higher up");
}

/**
 * Flat, display-ready perk strings for a tier. Kept as strings rather than
 * nodes so this stays serialisable across the server/client boundary.
 */
export const TIER_PERKS: Record<VipTier, string[]> = {
  Knight: ["Tier badge on your profile", "10 free super likes daily", "See who liked you", "Priority message delivery"],
  Baron: ["Everything in Knight", "Priority matching in Discover", "Unlimited rewinds", "Incognito browsing mode"],
  Viscount: ["Everything in Baron", "Ad-free feed, no sponsored cards", "Animated avatar frame", "Extended message storage"],
  Duke: ["Everything in Viscount", "Signature entrance effect", "Direct chat with verified members", "Monthly token bonus"],
  Monarch: ["Everything in Duke", "Concierge matching service", "Custom room card", "Early access to new features"],
};

export const TIER_MASCOTS: Record<VipTier, string> = {
  Knight: "🛡️",
  Baron: "🦁",
  Viscount: "🦅",
  Duke: "🎖️",
  Monarch: "👑",
};

export function isVipTier(value: unknown): value is VipTier {
  return typeof value === "string" && (VIP_TIERS as readonly string[]).includes(value);
}