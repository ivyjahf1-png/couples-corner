"use client";

import { Coins, X } from "lucide-react";
import {
  SHEET_BACKDROP,
  SHEET_PANEL_RELATIVE,
  SHEET_SHELL,
} from "@/components/ui/layers";
import {
  COIN_PACKS as SHARED_COIN_PACKS,
  formatNaira,
} from "@/lib/wallet/coin-packs";
import { PointingBotBanner } from "@/components/app/PointingBotBanner";

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

/**
 * Coin packs shown in the sheet.
 *
 * READ FROM THE SHARED CATALOGUE (`lib/wallet/coin-packs`), the same array the
 * server prices a purchase from. This sheet used to carry its own three-tier
 * list priced in US dollars ($5 / $15 / $50 for 100 / 275 / 850 coins) — a
 * different economy from the Naira prices the wallet drawer showed, and a set
 * of packs the server could not actually sell. One list, one currency, one
 * price.
 */
const COIN_PACKS = SHARED_COIN_PACKS;

export function CoinTopUpModal({
  open,
  onClose,
  shortfall = null,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * How many MORE coins the member needs, when the sheet was opened because an
   * action was refused for lack of coins.
   *
   * When this is null the sheet opens as a plain browse (the wallet's own
   * "Get Coins" tap) and NO banner is shown: a member who opened the shop
   * deliberately does not need to be told they cannot afford something. The
   * banner appears ONLY in the refusal case, which is the whole point of it.
   */
  shortfall?: number | null;
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

        {/* THE POINTING BOT.
            Directly ABOVE the price list, which is what gives the gesture its
            target: the bot's arm points down-right at the packs, so the
            member's eye travels from "you cannot afford this" straight to
            "here is what you can afford". It is only rendered when the sheet
            was opened by a REFUSAL (`shortfall` is set) — see the prop's doc
            comment above. */}
        {shortfall != null && shortfall > 0 ? (
          <PointingBotBanner
            title="Not enough coins"
            detail={`You need ${shortfall.toLocaleString("en-US")} more coins to continue. Pick a pack below.`}
          />
        ) : null}

        <ul className="flex flex-col gap-3">
          {COIN_PACKS.map((pack, index) => (
            <li key={pack.id}>
              <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-orange-400/40 hover:bg-orange-500/10"
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-white">🪙 {pack.coins.toLocaleString("en-US")} coins</span>
                  {/* A SINGLE tag on the middle pack only. "Popular" on one row
                      and "Best value" on another was two tags competing for the
                      same glance; one tag on the pack most members would
                      actually buy is a recommendation rather than a decoration. */}
                  {index === 1 ? (
                    <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-300">Popular</span>
                  ) : null}
                </span>
                <span className="text-sm font-semibold text-orange-300">{formatNaira(pack.priceNgn)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
