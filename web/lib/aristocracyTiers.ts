/**
 * Couples Corner - Aristocracy tier definitions (client-safe).
 *
 * Shared by the Aristocracy UI and the server-side commerce module so the
 * displayed tiers/prices always match what the server charges.
 *
 * ⚠️ THE TIER *STRING VALUES* ARE PERSISTED. These names are written into
 * `public.aristocracy_activations.tier` and into `game_ledger.reward_id` as
 * `aristocracy:<tier>`, and lookups match on the exact string. Adding a tier is
 * safe; RENAMING one is a data migration, not a rename.
 *
 * That is exactly what migration 046 did to fold `Monarch` into `King`: it
 * retargeted the existing rows (preserving `expires_at`, and the old label in
 * `legacy_tier`) rather than dropping them, because dropping the row would
 * revoke a paid membership with no refund. The CHECK constraint added there
 * now makes an unrecognised tier a write error instead of a member silently
 * appearing to have no tier at all.
 *
 * The ladder is six ranks. `Marquis` sits between Viscount and Duke; `King` is
 * the apex. Prices are the cost of a 30-day plan.
 */

export const ARISTOCRACY_TIERS = [
  "Knight",
  "Baron",
  "Viscount",
  "Marquis",
  "Duke",
  "King",
] as const;
export type AristocracyTier = (typeof ARISTOCRACY_TIERS)[number];

/** Coin cost per 30-day Aristocracy plan. */
export const TIER_PRICES: Record<AristocracyTier, number> = {
  Knight: 10000,
  Baron: 20000,
  Viscount: 30000,
  Marquis: 100000,
  Duke: 250000,
  King: 500000,
};

/** Days a single activation lasts. */
export const TIER_DURATION_DAYS = 30;

/**
 * The 3D animal emblem shown on each tier chip.
 *
 * These are the animals, not the heraldic objects: a lion reads as "power" at a
 * glance in a way a shield does not, and the chips are small enough that a
 * detailed crest would be illegible. The `mascot` is decorative and never
 * conveyed on its own — the tier NAME always sits beside it, so the emblem is
 * never the sole carrier of meaning for a screen-reader user.
 */
export const TIER_MASCOTS: Record<AristocracyTier, string> = {
  Knight: "🐺",
  Baron: "🦁",
  Viscount: "🦅",
  Marquis: "🦌",
  Duke: "🐉",
  King: "👑",
};

/** Short Roman-numeral-style rank label, shown under the tier name. */
export const TIER_ORDINALS: Record<AristocracyTier, string> = {
  Knight: "I",
  Baron: "II",
  Viscount: "III",
  Marquis: "IV",
  Duke: "V",
  King: "VI",
};

/**
 * The perk families the Aristocracy actually sells, in display order.
 *
 * Modelled as families rather than a flat string list so the UI can render a
 * real PROGRESSION — a per-family "locked → unlocked at X" ladder — and so the
 * privileges grid can be generated from one source instead of hand-written per
 * tier. A flat list of sentences ("Everything in Baron") is not a perk: it
 * cannot be styled, sorted, or checked against a family, and it left a member
 * unable to answer "what does Duke give me that Viscount doesn't?".
 */
export const PERK_FAMILIES = [
  { id: "renewal", label: "Renewal offer", icon: "🎁" },
  { id: "identity", label: "Identity mark", icon: "🏷️" },
  { id: "medal", label: "Medal", icon: "🎖️" },
  { id: "frame", label: "Avatar frame", icon: "🪞" },
  { id: "bubble", label: "Bubble box", icon: "🫧" },
  { id: "entry", label: "Entry effect", icon: "✨" },
] as const;

export type PerkFamilyId = (typeof PERK_FAMILIES)[number]["id"];

/**
 * The tier each perk family first unlocks at.
 *
 * A perk is granted at the highest tier held that is AT OR ABOVE the unlocking
 * tier, so perks accumulate as a member climbs — which is what makes the view a
 * ladder rather than six unrelated cards.
 */
export const PERK_UNLOCKS: Record<PerkFamilyId, { tier: AristocracyTier; detail: string }> = {
  renewal: { tier: "Baron", detail: "Early access to renew before expiry." },
  identity: { tier: "Knight", detail: "Your rank shown beside your name." },
  medal: { tier: "Viscount", detail: "A collectible medal on your profile." },
  frame: { tier: "Marquis", detail: "Animated profile frame and entrance flourish." },
  bubble: { tier: "Duke", detail: "Exclusive chat bubble styling." },
  entry: { tier: "King", detail: "Signature room entry effect for everyone to see." },
};

/**
 * Every perk family with its state for a given tier — `unlocked` included, and
 * ALL families are returned, not just the unlocked ones.
 *
 * `unlocked` is deliberately in the RETURN TYPE, not only on the returned
 * object. An explicit annotation is the declared contract: omitting a property
 * that the implementation actually sets makes TypeScript treat it as absent, so
 * a caller reading `perk.unlocked` fails to compile even though the value is
 * right there at runtime. The UI needs the flag to render a padlock on the
 * families this rank has NOT earned yet, which is the whole upsell.
 *
 * Note it also does NOT filter. A caller that wants only the held perks filters
 * itself; filtering here would make "which rank do I need for this?" unanswerable.
 */
export function perksForTier(
  tier: AristocracyTier
): { id: PerkFamilyId; label: string; icon: string; detail: string; unlocked: boolean }[] {
  const rank = ARISTOCRACY_TIERS.indexOf(tier);
  return PERK_FAMILIES.map(({ id, label, icon }) => {
    const unlocked = rank >= ARISTOCRACY_TIERS.indexOf(PERK_UNLOCKS[id].tier);
    return {
      id,
      label,
      icon,
      detail: unlocked ? PERK_UNLOCKS[id].detail : `Unlocks at ${PERK_UNLOCKS[id].tier}`,
      unlocked,
    };
  });
}

/** Tier just above the given one, or null at the apex. */
export function nextTier(tier: AristocracyTier): AristocracyTier | null {
  const index = ARISTOCRACY_TIERS.indexOf(tier);
  return index >= 0 && index < ARISTOCRACY_TIERS.length - 1
    ? ARISTOCRACY_TIERS[index + 1]
    : null;
}

export function isAristocracyTier(value: unknown): value is AristocracyTier {
  return typeof value === "string" && (ARISTOCRACY_TIERS as readonly string[]).includes(value);
}
