"use client";

/**
 * Wallet tile — the coin-balance tile on the profile grid.
 *
 * Tapping it opens `CoinWalletModal`, which owns everything the wallet now
 * shows (balance card, rate sheet, converter, withdraw, bind account). This
 * component deliberately keeps only the TILE: the balance read happens
 * server-side on the profile page, so the tile needs no fetch of its own and
 * renders correctly on first paint even when the wallet backend is down.
 *
 * The modal is reached through its imperative handle rather than a raw
 * `<dialog>` ref, so opening it also triggers the modal's lazy data loads —
 * the tile cannot show an empty panel.
 */

import { useRef } from "react";
import { Coins } from "lucide-react";

import { CoinWalletModal, type CoinWalletModalHandle } from "@/components/wallet/CoinWalletModal";

const ORANGE = "#FF7A00";

export function WalletTile({ balance }: { balance: number }) {
  const modalRef = useRef<CoinWalletModalHandle>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => modalRef.current?.open()}
        aria-label={`Coin balance ${balance}. Open wallet`}
        className="flex h-[88px] items-center gap-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#2A2438]/55 px-3.5 text-left transition hover:bg-[#332B45]/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: ORANGE }}
        >
          <Coins className="h-5 w-5 text-[#0F0C1B]" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-2xl font-bold tabular-nums leading-none text-white">
            {balance.toLocaleString("en-US")}
          </span>
          <span className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-[#A09AB0]">
            Coins
          </span>
        </span>
      </button>

      <CoinWalletModal ref={modalRef} balance={balance} />
    </>
  );
}
