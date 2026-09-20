import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Subscription, SubscriptionPeriod } from "@/lib/models/subscription";
import { getPlanByTier } from "@/lib/models/subscription";

function dbToSub(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    planId: row.plan_id as string,
    tier: row.tier as SubscriptionPeriod,
    status: row.status as Subscription["status"],
    startedAt: row.started_at as string,
    currentPeriodEnd: row.current_period_end as string,
    canceledAt: row.canceled_at as string | undefined,
    paymentProvider: row.payment_provider as string | undefined,
    paymentMethodId: row.payment_method_id as string | undefined,
  };
}

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return dbToSub(data);
}

export async function listUserSubscriptions(userId: string): Promise<Subscription[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (!data) return [];
  return data.map(dbToSub);
}

/**
 * Create a subscription record. Called by the payment webhook after successful
 * charge. The plan's duration is used to compute current_period_end.
 */
export async function createSubscription(params: {
  userId: string;
  tier: SubscriptionPeriod;
  paymentProvider?: string;
  paymentMethodId?: string;
}): Promise<Subscription> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const plan = getPlanByTier(params.tier);
  if (!plan) throw new Error(`Unknown tier: ${params.tier}`);

  const now = new Date();
  const end = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: params.userId,
      plan_id: plan.id,
      tier: params.tier,
      status: "active",
      started_at: now.toISOString(),
      current_period_end: end.toISOString(),
      payment_provider: params.paymentProvider ?? null,
      payment_method_id: params.paymentMethodId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return dbToSub(data);
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", subscriptionId);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Membership & coin wallet (uniform across web + web-admin).
 *
 * The tier is stored canonically on public.users.subscription_tier and the
 * coin balance on public.game_wallets (exposed consistently via the
 * public.user_wallets view). All amounts below are SERVER-ONLY constants —
 * the client can never dictate prices or balances.
 * ──────────────────────────────────────────────────────────────────────────── */

import {
  isSubscriptionTierName,
  type SubscriptionTierName,
  type WalletView,
} from "@/lib/models/wallet";

export const TIER_RANK: Record<SubscriptionTierName, number> = {
  free: 0,
  premium: 1,
  vip: 2,
};

/** Coin packs purchasable from the wallet drawer (server-authoritative).
 * Prices are in Nigerian Naira (NGN). No third-party wallet names are used. */
export const COIN_PACKS: { id: string; coins: number; priceNgn: number; label: string }[] = [
  { id: "pack_500", coins: 500, priceNgn: 772.24, label: "500 Coins" },
  { id: "pack_1000", coins: 1000, priceNgn: 1560.24, label: "1,000 Coins" },
  { id: "pack_2000", coins: 2000, priceNgn: 3136.24, label: "2,000 Coins" },
  { id: "pack_5000", coins: 5000, priceNgn: 7864.24, label: "5,000 Coins" },
  { id: "pack_10000", coins: 10000, priceNgn: 15744.24, label: "10,000 Coins" },
  { id: "pack_20000", coins: 20000, priceNgn: 31504.24, label: "20,000 Coins" },
  { id: "pack_50000", coins: 50000, priceNgn: 78784.24, label: "50,000 Coins" },
  { id: "pack_100000", coins: 100000, priceNgn: 157584.24, label: "100,000 Coins" },
  { id: "pack_200000", coins: 200000, priceNgn: 315184.24, label: "200,000 Coins" },
];

/** One-time tier upgrades (server-authoritative). */
export const TIER_UPGRADES: { tier: SubscriptionTierName; priceUsd: number; perks: string[] }[] = [
  { tier: "premium", priceUsd: 9.99, perks: ["Ad-free play", "1.5× coin payouts", "Exclusive badges"] },
  { tier: "vip", priceUsd: 19.99, perks: ["Everything in Premium", "2× coin payouts", "VIP-only tables", "Priority support"] },
];

async function ensureWalletRow(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, userId: string) {
  const { data } = await supabase
    .from("game_wallets")
    .select("coin_balance, total_earned")
    .eq("user_id", userId)
    .single();
  if (data) return data;

  const { data: created, error } = await supabase
    .from("game_wallets")
    .insert({ user_id: userId, coin_balance: 100, total_earned: 100 })
    .select("coin_balance, total_earned")
    .single();
  if (error || !created) throw new Error("Failed to create wallet");
  return created;
}

/** Read the uniform membership view (tier + coins) for a user. */
export async function getMembership(userId: string): Promise<WalletView> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) throw new Error("Supabase not configured");

    const [{ data: userRow }, wallet] = await Promise.all([
      supabase.from("users").select("subscription_tier").eq("id", userId).single(),
      ensureWalletRow(supabase, userId),
    ]);

    const tierRaw = userRow?.subscription_tier;
    const tier: SubscriptionTierName = isSubscriptionTierName(tierRaw) ? tierRaw : "free";

    return {
      subscriptionTier: tier,
      coinBalance: wallet.coin_balance as number,
      totalEarned: wallet.total_earned as number,
    };
  } catch {
    // Degrade gracefully — header/wallet stays usable without the DB.
    return { subscriptionTier: "free", coinBalance: 0, totalEarned: 0 };
  }
}

/**
 * Apply a paid tier upgrade: never downgrade below the current tier via
 * checkout, records the purchase in the ledger and stamps the new tier.
 */
export async function upgradeTier(
  userId: string,
  tier: SubscriptionTierName
): Promise<WalletView> {
  const upgrade = TIER_UPGRADES.find((u) => u.tier === tier);
  if (!upgrade) throw new Error("Unknown tier");

  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const current = await getMembership(userId);
  if (TIER_RANK[tier] <= TIER_RANK[current.subscriptionTier]) {
    throw new Error("You are already on this tier or higher");
  }

  const { error } = await supabase
    .from("users")
    .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error("Failed to update tier");

  await supabase.from("game_ledger").insert({
    user_id: userId,
    kind: "purchase",
    reward_id: `tier_${tier}`,
    amount: 0,
  });

  return { ...current, subscriptionTier: tier };
}

/** Credit a purchased coin pack (server-derived amount). */
export async function purchaseCoinPack(
  userId: string,
  packId: string
): Promise<WalletView> {
  const pack = COIN_PACKS.find((p) => p.id === packId);
  if (!pack) throw new Error("Unknown coin pack");

  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const wallet = await ensureWalletRow(supabase, userId);
  const newBalance = (wallet.coin_balance as number) + pack.coins;

  const { error } = await supabase
    .from("game_wallets")
    .update({
      coin_balance: newBalance,
      total_earned: (wallet.total_earned as number) + pack.coins,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw new Error("Failed to credit coins");

  await supabase.from("game_ledger").insert({
    user_id: userId,
    kind: "purchase",
    reward_id: packId,
    amount: pack.coins,
  });

  const membership = await getMembership(userId);
  return { ...membership, coinBalance: newBalance };
}
