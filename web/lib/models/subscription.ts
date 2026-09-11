import type { EntityId, ISODateString } from "./common";

/**
 * Couples Corner — subscription tiers & pricing.
 *
 * Three tiers: Free, Gold (Premium), Platinum (VIP). Each tier maps to
 * feature *gates* that the server-side services enforce (e.g. daily likes).
 * A user's current tier is stored on the `subscriptions` table (source of
 * truth) and mirrored onto `users.tier` for cheap reads.
 */

export type SubscriptionTier = "free" | "gold" | "platinum";

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "none";

/** Feature gates that vary by tier. Server services read these. */
export interface TierFeatures {
  /** Max "like"/connection requests a user may send per rolling day. */
  dailyLikes: number;
  /** Whether the user can see who liked them (profile visitors). */
  seeWhoLikedYou: boolean;
  /** Whether profile boosts (extra discoverability) are available. */
  profileBoosts: boolean;
  /** Number of free boosts granted per day. */
  boostDurationHours: number;
  /** Unlimited messaging / higher connection priority. */
  unlimitedConnections: boolean;
  /** Extra profile badges / verification highlighting. */
  premiumBadge: boolean;
  /** Read receipts & typing indicators in messaging. */
  readReceipts: boolean;
}

export interface Plan {
  tier: SubscriptionTier;
  name: string;
  /** Monthly price in USD cents (0 = free). */
  priceMonthlyCents: number;
  tagline: string;
  features: TierFeatures;
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = ["free", "gold", "platinum"];

export const PLANS: Plan[] = [
  {
    tier: "free",
    name: "Free",
    priceMonthlyCents: 0,
    tagline: "Get started and meet new people",
    features: {
      dailyLikes: 10,
      seeWhoLikedYou: false,
      profileBoosts: false,
      boostDurationHours: 0,
      unlimitedConnections: false,
      premiumBadge: false,
      readReceipts: false,
    },
  },
  {
    tier: "gold",
    name: "Gold (Premium)",
    priceMonthlyCents: 1999,
    tagline: "See who likes you and like freely",
    features: {
      dailyLikes: 60,
      seeWhoLikedYou: true,
      profileBoosts: true,
      boostDurationHours: 24,
      unlimitedConnections: false,
      premiumBadge: true,
      readReceipts: true,
    },
  },
  {
    tier: "platinum",
    name: "Platinum (VIP)",
    priceMonthlyCents: 3499,
    tagline: "The full VIP experience",
    features: {
      dailyLikes: -1, // unlimited
      seeWhoLikedYou: true,
      profileBoosts: true,
      boostDurationHours: 72,
      unlimitedConnections: true,
      premiumBadge: true,
      readReceipts: true,
    },
  },
];

const PLAN_BY_TIER = new Map<SubscriptionTier, Plan>(PLANS.map((p) => [p.tier, p]));

export function featuresForTier(tier: SubscriptionTier): TierFeatures {
  return PLAN_BY_TIER.get(tier)?.features ?? PLAN_BY_TIER.get("free")!.features;
}

/** A user's subscription row (Supabase `subscriptions`). */
export interface Subscription {
  id: EntityId;
  userId: EntityId;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd?: ISODateString | null;
  /** External billing provider id (e.g. Stripe subscription id), if any. */
  provider?: string | null;
  providerCustomerId?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}