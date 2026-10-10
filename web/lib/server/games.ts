import "server-only";

/**
 * Couples Corner — coin wallet reads (SERVER ONLY).
 *
 * WHY THIS FILE SHRANK: it used to hold the full legacy Game Center coin
 * economy — `claimReward` (chests), `stakeGame`/`settleGame` (built-in engine
 * buy-ins) and the `MAX_PAYOUT_MULTIPLIER` ceiling, all reachable only from
 * `/api/games/reward`. That route, the built-in engines and the `/games`
 * hub were removed with the old implementation, and every caller of those
 * functions went with them, so they are gone rather than left as dead
 * exports. Only the READ path remains: profile and messages both render the
 * live balance from `getGameWallet`, and nothing in the new launcher writes
 * coins (it mints a signed iframe token — see `app/api/game/launch`).
 *
 * All writes that still exist in the app (coin packs, tier upgrades, gifts,
 * store) go through `lib/server/commerce.ts` and `lib/server/subscription.ts`
 * against the same `game_wallets` / `game_ledger` tables — this module only
 * reads them.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";

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
    // Degrade gracefully (e.g. migration not applied) — the profile stays usable.
    return { coinBalance: 0, totalEarned: 0 };
  }
}
