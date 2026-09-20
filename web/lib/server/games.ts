import "server-only";

/**
 * Couples Corner — Game Center server logic (SERVER ONLY).
 *
 * SECURITY BOUNDARY
 * -----------------
 * All coin mutations go through here, reached only from
 * /api/games/reward after the caller's session has been verified.
 * Amounts, cooldowns and payout ceilings are taken from server-side
 * constants — never from client-supplied numbers.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getGameBySlug } from "@/lib/games";

/** Server-authoritative chest definitions (mirrors lib/games.ts display copy). */
const CLAIMS: Record<string, { amount: number; cooldownHours: number | null }> = {
  daily_bonus: { amount: 50, cooldownHours: 24 },
  chest_silver: { amount: 120, cooldownHours: 12 },
  chest_level35: { amount: 500, cooldownHours: null }, // one-time milestone
};

/** A win may pay out at most this multiple of the original stake. */
export const MAX_PAYOUT_MULTIPLIER = 5;

export interface WalletView {
  coinBalance: number;
  totalEarned: number;
}

async function ensureWallet(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { data } = await supabase
    .from("game_wallets")
    .select("user_id, coin_balance, total_earned")
    .eq("user_id", userId)
    .single();

  if (data) return data;

  // First visit — lazily provision the wallet with a small welcome grant.
  const { data: created, error } = await supabase
    .from("game_wallets")
    .insert({ user_id: userId, coin_balance: 100, total_earned: 100 })
    .select("user_id, coin_balance, total_earned")
    .single();
  if (error) throw new Error("Failed to create game wallet");
  return created;
}

/** Read (and lazily create) the user's coin wallet. */
export async function getGameWallet(userId: string): Promise<WalletView> {
  try {
    const wallet = await ensureWallet(userId);
    return { coinBalance: wallet.coin_balance, totalEarned: wallet.total_earned };
  } catch {
    // Degrade gracefully (e.g. migration not applied) — hub stays usable.
    return { coinBalance: 0, totalEarned: 0 };
  }
}

/**
 * Claim a chest/bonus reward. Verifies cooldown (or one-time milestone)
 * from the ledger before crediting coins, guarded by an optimistic lock.
 */
export async function claimReward(userId: string, rewardId: string): Promise<WalletView> {
  const claim = CLAIMS[rewardId];
  if (!claim) throw new Error("Unknown reward");
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  if (claim.cooldownHours === null) {
    // One-time milestone: reject if already claimed.
    const { count } = await supabase
      .from("game_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", "claim")
      .eq("reward_id", rewardId);
    if ((count ?? 0) > 0) throw new Error("Milestone already claimed");
  } else {
    const cutoff = new Date(Date.now() - claim.cooldownHours * 3600_000).toISOString();
    const { count } = await supabase
      .from("game_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", "claim")
      .eq("reward_id", rewardId)
      .gte("created_at", cutoff);
    if ((count ?? 0) > 0) throw new Error("Reward still cooling down");
  }

  const wallet = await ensureWallet(userId);
  const newBalance = wallet.coin_balance + claim.amount;

  const { error: updateError } = await supabase
    .from("game_wallets")
    .update({
      coin_balance: newBalance,
      total_earned: wallet.total_earned + claim.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("coin_balance", wallet.coin_balance); // optimistic lock
  if (updateError) throw new Error("Failed to credit reward");

  await supabase.from("game_ledger").insert({
    user_id: userId,
    kind: "claim",
    reward_id: rewardId,
    amount: claim.amount,
  });

  return { coinBalance: newBalance, totalEarned: wallet.total_earned + claim.amount };
}

/**
 * Deduct a game buy-in (stake). The stake row is left `settled = false` so
 * exactly one payout can be claimed against it.
 */
export async function stakeGame(
  userId: string,
  gameId: string
): Promise<{ wallet: WalletView; stakeId: string }> {
  const game = getGameBySlug(gameId);
  if (!game) throw new Error("Unknown game");
  if (game.stake <= 0) throw new Error("Game is free to play");
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const wallet = await ensureWallet(userId);
  if (wallet.coin_balance < game.stake) throw new Error("Not enough coins");

  const newBalance = wallet.coin_balance - game.stake;
  const { error } = await supabase
    .from("game_wallets")
    .update({ coin_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("coin_balance", wallet.coin_balance);
  if (error) throw new Error("Failed to place stake");

  const { data: ledgerRow, error: ledgerError } = await supabase
    .from("game_ledger")
    .insert({
      user_id: userId,
      kind: "stake",
      game_id: gameId,
      amount: -game.stake,
      settled: false,
    })
    .select("id")
    .single();
  if (ledgerError || !ledgerRow) throw new Error("Failed to record stake");

  return {
    wallet: { coinBalance: newBalance, totalEarned: wallet.total_earned },
    stakeId: ledgerRow.id,
  };
}

/**
 * Settle a game session and pay out a win against the oldest unsettled
 * stake from the last 24 hours. The payout amount is derived server-side
 * from the registry — the client only reports win/loss.
 */
export async function settleGame(
  userId: string,
  gameId: string,
  won: boolean
): Promise<WalletView> {
  const game = getGameBySlug(gameId);
  if (!game) throw new Error("Unknown game");
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: stake, error } = await supabase
    .from("game_ledger")
    .select("id, amount")
    .eq("user_id", userId)
    .eq("kind", "stake")
    .eq("game_id", gameId)
    .eq("settled", false)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !stake) throw new Error("No active stake to settle");

  const staked = Math.abs(stake.amount);
  const amount = won ? Math.min(staked * MAX_PAYOUT_MULTIPLIER, game.reward) : 0;

  // Atomically mark the stake settled — one payout per stake.
  const { data: settledRows, error: settleError } = await supabase
    .from("game_ledger")
    .update({ settled: true })
    .eq("id", stake.id)
    .eq("settled", false)
    .select("id");
  if (settleError || !settledRows || settledRows.length === 0) {
    throw new Error("Stake already settled");
  }

  if (amount > 0) {
    const wallet = await ensureWallet(userId);
    await supabase
      .from("game_wallets")
      .update({
        coin_balance: wallet.coin_balance + amount,
        total_earned: wallet.total_earned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    await supabase.from("game_ledger").insert({
      user_id: userId,
      kind: "payout",
      game_id: gameId,
      amount,
    });
  }

  const fresh = await ensureWallet(userId);
  return { coinBalance: fresh.coin_balance, totalEarned: fresh.total_earned };
}
