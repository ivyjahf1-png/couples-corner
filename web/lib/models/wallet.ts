/**
 * Couples Corner — shared wallet & subscription-tier view model.
 *
 * Used by BOTH the user app (web) and the admin dashboard (web-admin) so the
 * tier labels and wallet shape stay consistent across codebases. Backed by:
 *   - public.users.subscription_tier  ('free' | 'premium' | 'vip')
 *   - public.game_wallets.coin_balance (integer coins) — THE table. It is keyed
 *     on public.users(id).
 *   - public.user_wallets — a READ-ONLY VIEW over game_wallets (migration 021),
 *     giving both codebases one stable shape. It is not a second table and is
 *     never written to; anything that credits coins must target game_wallets.
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