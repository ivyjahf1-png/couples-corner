"use client";

import { useState } from "react";

/**
 * Couples Corner — coin-gate hook.
 *
 * The coin/wallet system (public.game_wallets.coin_balance, exposed to both
 * codebases as the public.user_wallets VIEW created in migration 021 — see
 * lib/models/wallet.ts) is NOT live yet. While `COIN_SYSTEM_LIVE` is false,
 * premium actions (First Impressions, Super Like purchases) run in free testing
 * mode. When the coin system goes live, flip this single flag — every gated
 * action then routes to the coin purchase / tier modal instead of performing the
 * action, with zero component changes.
 *
 * NOTE: `game_wallets` is the table; `user_wallets` is a read-only view over it,
 * not a second table. An earlier version of this comment implied the two needed
 * keeping in sync, which was wrong — they are the same data by construction.
 */
export const COIN_SYSTEM_LIVE = false;

export interface CoinGateResult {
  /** true = proceed with the action; false = the coin purchase modal was opened. */
  allowed: boolean;
}

export function useCoinGate() {
  const [coinModalOpen, setCoinModalOpen] = useState(false);

  /**
   * Call before any coin-priced action. Returns `allowed: true` while the
   * system is in free-test mode; once live it opens the purchase/tier modal
   * and returns `allowed: false`.
   */
  function requireCoins(_action: string): CoinGateResult {
    if (COIN_SYSTEM_LIVE) {
      setCoinModalOpen(true);
      return { allowed: false };
    }
    return { allowed: true };
  }

  return { coinModalOpen, setCoinModalOpen, requireCoins };
}
