/**
 * Couples Corner — subscription tiers & billing model.
 */

import type { EntityId, ISODateString } from "./common";

export type SubscriptionPeriod = "weekly" | "monthly" | "yearly";

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "expired" | "trialing";

export interface SubscriptionTier {
  id: EntityId;
  name: string;
  /** Price in cents (USD). Stored as integer to avoid floating-point issues. */
  priceCents: number;
  period: SubscriptionPeriod;
  /** Display price, e.g. "$6". */
  displayPrice: string;
  /** Features included in this tier. */
  features: string[];
  /** Whether this tier is highlighted / recommended. */
  isPopular?: boolean;
  /** Optional badge text, e.g. "Best value". */
  badge?: string;
}

export interface UserSubscription {
  id: EntityId;
  userId: EntityId;
  tierId: EntityId;
  status: SubscriptionStatus;
  /** ISO date when the current period started. */
  currentPeriodStart: ISODateString;
  /** ISO date when the current period ends. */
  currentPeriodEnd: ISODateString;
  /** Whether the subscription will cancel at the end of the period. */
  cancelAtPeriodEnd: boolean;
  paymentProvider: "paystack" | "stripe" | "manual";
  paymentProviderSubscriptionId?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** The three canonical subscription tiers for Couples Corner. */
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "tier_weekly",
    name: "Weekly",
    priceCents: 600,
    period: "weekly",
    displayPrice: "$6",
    features: [
      "Unlimited messaging",
      "Full profile visibility",
      "Discover & match",
      "Cancel anytime",
    ],
  },
  {
    id: "tier_monthly",
    name: "Monthly",
    priceCents: 1900,
    period: "monthly",
    displayPrice: "$19",
    isPopular: true,
    badge: "Best value",
    features: [
      "Everything in Weekly",
      "Priority support",
      "Advanced filters",
      "See who viewed you",
    ],
  },
  {
    id: "tier_yearly",
    name: "Yearly",
    priceCents: 5500,
    period: "yearly",
    displayPrice: "$55",
    badge: "Save vs monthly",
    features: [
      "Everything in Monthly",
      "Profile boost weekly",
      "Verified badge",
      "Ad-free experience",
      "Early access to features",
    ],
  },
];

/** Plan shape used by the subscription page. */
export interface SubscriptionPlan {
  id: EntityId;
  name: string;
  tier: SubscriptionPeriod;
  priceUsd: number;
  durationDays: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

/** Plans displayed on the subscription page. */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_weekly",
    name: "Weekly",
    tier: "weekly",
    priceUsd: 6,
    durationDays: 7,
    description: "Flexible weekly access with full messaging and discovery.",
    features: [
      "Unlimited messaging",
      "Full profile visibility",
      "Discover & match",
      "Cancel anytime",
    ],
  },
  {
    id: "plan_monthly",
    name: "Monthly",
    tier: "monthly",
    priceUsd: 19,
    durationDays: 30,
    description: "Our most popular plan with advanced filters and priority support.",
    recommended: true,
    features: [
      "Everything in Weekly",
      "Priority support",
      "Advanced filters",
      "See who viewed you",
    ],
  },
  {
    id: "plan_yearly",
    name: "Yearly",
    tier: "yearly",
    priceUsd: 55,
    durationDays: 365,
    description: "Best value with weekly profile boosts and verified badge.",
    features: [
      "Everything in Monthly",
      "Profile boost weekly",
      "Verified badge",
      "Ad-free experience",
      "Early access to features",
    ],
  },
];

/** The Subscription type used by the server handler. */
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionPeriod;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodEnd: string;
  canceledAt?: string;
  paymentProvider?: string;
  paymentMethodId?: string;
}

/** Look up a plan by its tier. */
export function getPlanByTier(tier: SubscriptionPeriod): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
}

export function getTierById(id: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS.find((t) => t.id === id);
}

export function formatTierSavings(tier: SubscriptionTier): string | null {
  if (tier.period === "yearly") {
    const monthlyCost = 19 * 12;
    const savings = monthlyCost - 55;
    return `Save $${savings}/year`;
  }
  if (tier.period === "monthly") {
    return "Save vs weekly";
  }
  return null;
}
