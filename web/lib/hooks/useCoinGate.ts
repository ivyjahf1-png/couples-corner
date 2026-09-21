"use client";

import { useState } from "react";

/**
 * Couples Corner — coin-gate hook (FUTURE-PROOF STUB).
 *
 * The coin/wallet system (public.user_wallets.coin_balance, see
 * lib/models/wallet.ts) is NOT live yet. While `COIN_SYSTEM_LIVE` is false,
 * premium actions (First Impressions, Super Like purchases) run in free
 * testing mode. When the coin system goes live, flip this single flag —
 * every gated action then routes to the coin purchase / tier modal instead
 * of performing the action, with zero component changes.
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
