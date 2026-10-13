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
 * against the same `game_wallets` / `game_ledger` tables — with ONE exception:
 * `creditGameWinnings` below, the self-hosted Mines game's Cash Out path. It
 * is the only write in this module and follows the same compare-and-swap +
 * ledger-insert shape task rewards use in `lib/server/tasks.ts`.
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

export interface CashOutResult {
  ok: boolean;
  error?: string;
  credited?: number;
  coinBalance?: number;
}

/** Hard ceiling for a single self-hosted cash-out. */
const MAX_CASHOUT_COINS = 100_000;

/**
 * Credit game winnings onto the member's wallet (SERVER ONLY).
 *
 * THE WRITE PATH FOR LOCAL GAME WINS. The native React engines post wins via
 * `useGameWallet`, which upserts `game_wallets` directly — and server-side
 * callers credit via this function with the session's own uid. The client
 * never names the account it is crediting.
 *
 * THE WRITE IS A COMPARE-AND-SWAP, not a blind increment: the row is updated
 * only if `coin_balance` still equals the value read a line earlier, so two
 * concurrent cash-outs cannot lose one of the updates (the loser sees no row
 * match and is told to retry). The matching `game_ledger` row is inserted
 * after, same shape as `lib/server/tasks.ts` uses for task rewards, so every
 * coin that enters the wallet stays auditable.
 */
export async function creditGameWinnings(userId: string, coins: number): Promise<CashOutResult> {
  if (!Number.isInteger(coins) || coins <= 0 || coins > MAX_CASHOUT_COINS) {
    return { ok: false, error: "Invalid cash-out amount" };
  }

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) throw new Error("Supabase not configured");

    const wallet = await ensureWallet(userId);
    const { data: credited, error: creditError } = await supabase
      .from("game_wallets")
      .update({
        coin_balance: wallet.coin_balance + coins,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("coin_balance", wallet.coin_balance)
      .select("coin_balance")
      .single();

    if (creditError || !credited) {
      return { ok: false, error: "Balance changed, please retry" };
    }

    const { error: ledgerError } = await supabase.from("game_ledger").insert({
      user_id: userId,
      kind: "claim",
      reward_id: "game:mines:cashout",
      amount: coins,
    });
    if (ledgerError) {
      // The wallet moved but the audit row failed: log loudly rather than
      // roll back — the balance is the member-facing truth, and the retry
      // would double-credit if we returned an error here.
      console.error("[games] cash-out ledger insert failed:", ledgerError.message);
    }

    return {
      ok: true,
      credited: coins,
      coinBalance: (credited as { coin_balance: number }).coin_balance,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Cash-out failed" };
  }
}
