"use client";

import { Coins, X } from "lucide-react";
import {
  SHEET_BACKDROP,
  SHEET_PANEL_RELATIVE,
  SHEET_SHELL,
} from "@/components/ui/layers";

/**
 * CoinTopUpModal — the shared "Get Coins" bottom sheet.
 *
 * Extracted from DiscoverCardStack so the chat composer and the GiftDrawer can
 * auto-open the SAME top-up surface when a send is refused for lack of coins
 * (server error code `INSUFFICIENT_COINS` / gift reason `insufficient`). One
 * modal, three callers: a member who sees "you need N more coins" should land
 * on the identical pack list no matter which feature told them so.
 *
 * The packs are advisory display only — prices are re-resolved server-side on
 * purchase, exactly as the gift catalogue is.
 */

/** Coin-pack tiers shown in the sheet. Mirrors DiscoverCardStack's original list. */
const COIN_PACKS = [
  { amount: 5, coins: 100 },
  { amount: 15, coins: 275, tag: "Popular" },
  { amount: 50, coins: 850, tag: "Best value" },
] as const;

export function CoinTopUpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className={SHEET_SHELL} role="dialog" aria-modal="true" aria-label="Get Coins">
      <button type="button" aria-label="Close" onClick={onClose} className={SHEET_BACKDROP} />
      <div className={`${SHEET_PANEL_RELATIVE} w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl sm:rounded-3xl`}>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
            <Coins className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Get Coins</h2>
            <p className="text-xs text-ink-300">Top up your Couples Corner wallet to continue.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <ul className="flex flex-col gap-3">
          {COIN_PACKS.map((pack) => (
            <li key={pack.coins}>
              <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-orange-400/40 hover:bg-orange-500/10"
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-white">🪙 {pack.coins} coins</span>
                  {"tag" in pack && pack.tag ? (
                    <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-300">{pack.tag}</span>
                  ) : null}
                </span>
                <span className="text-sm font-semibold text-orange-300">${pack.amount.toFixed(2)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
