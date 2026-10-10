"use client";

/**
 * Wallet tile + wallet modal — replaces the coin tile's navigation to /store.
 *
 * Tapping the coin balance opens a sleek dialog with the wallet balance card
 * and a Withdraw button. Withdrawal submits a pending request through
 * `requestWithdrawalAction` and reports success/failure inline; the dialog
 * degrades gracefully when the backend is unavailable.
 */

import { useRef, useState } from "react";
import { Coins, Minus } from "lucide-react";
import { requestWithdrawalAction } from "@/lib/actions/wallet";

const ORANGE = "#FF7A00";

export function WalletTile({ balance }: { balance: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function withdraw() {
    const value = Number.parseInt(amount, 10);
    if (!Number.isInteger(value) || value <= 0) {
      setNotice("Enter an amount greater than zero.");
      return;
    }
    if (value > balance) {
      setNotice("That is more than your balance.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await requestWithdrawalAction({ amount: value });
      setNotice(result.ok ? `Withdrawal request for ${value} coins submitted.` : (result.error ?? "Withdrawal failed."));
      if (result.ok) setAmount("");
    } catch {
      setNotice("Withdrawals are unavailable right now. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
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
            {balance}
          </span>
          <span className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-[#A09AB0]">
            Coins
          </span>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Wallet"
        className="w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-white/10 bg-[#1B1636] p-0 text-white shadow-2xl backdrop:bg-black/70"
      >
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#A09AB0]">Wallet</p>
          <div
            className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-4"
            style={{ backgroundImage: "linear-gradient(135deg, #FF7A00 0%, #E25C00 100%)" }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25">
              <Coins className="h-6 w-6 text-white" />
            </span>
            <span>
              <span className="block text-3xl font-bold tabular-nums leading-none">{balance}</span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-white/80">
                Coins available
              </span>
            </span>
          </div>

          <label htmlFor="wallet-withdraw-amount" className="mt-5 block text-sm font-semibold">
            Withdraw amount
          </label>
          <input
            id="wallet-withdraw-amount"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-base tabular-nums text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
          />
          {notice ? <p className="mt-2 text-xs text-white/70">{notice}</p> : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void withdraw()}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#FF7A00] text-sm font-bold text-[#0F0C1B] transition hover:bg-[#FF9500] active:scale-[0.98] disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
              {busy ? "Submitting…" : "Withdraw"}
            </button>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-11 rounded-2xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
