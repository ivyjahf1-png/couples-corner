/**
 * Couples Corner Admin — shared wallet & subscription-tier view model.
 *
 * Mirror of web/lib/models/wallet.ts — keep both files byte-identical so the
 * user app and admin dashboard agree on tier names and the wallet shape.
 * Backed by:
 *   - public.users.subscription_tier  ('free' | 'premium' | 'vip')
 *   - public.user_wallets / public.game_wallets.coin_balance (integer coins)
 */

export type SubscriptionTierName = "free" | "premium" | "vip";

export const SUBSCRIPTION_TIERS: readonly SubscriptionTierName[] = [
  "free",
  "premium",
  "vip",
] as const;

export function isSubscriptionTierName(value: unknown): value is SubscriptionTierName {
  return (
    value === "free" || value === "premium" || value === "vip"
  );
}

export const TIER_LABELS: Record<SubscriptionTierName, string> = {
  free: "Free",
  premium: "Premium",
  vip: "VIP",
};

/** The uniform wallet shape both apps render. */
export interface WalletView {
  subscriptionTier: SubscriptionTierName;
  coinBalance: number;
  totalEarned: number;
}

export function emptyWallet(): WalletView {
  return { subscriptionTier: "free", coinBalance: 0, totalEarned: 0 };
}