"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TIER_LABELS,
  type SubscriptionTierName,
  type WalletView,
} from "@/lib/models/wallet";

/**
 * Wallet menu — uniform tier + coin balance chip and the purchase drawer.
 *
 * Rendered in the app shell header (chip variant) and on the dashboard
 * (card variant). The drawer contains the live balance + tier badge, a
 * coin-pack purchasing grid and tier upgrade cards with a mock checkout
 * step. All amounts/prices are derived server-side via /api/wallet/purchase.
 */

interface CoinPack { id: string; coins: number; priceNgn: number; label: string }
interface TierUpgrade { tier: SubscriptionTierName; priceUsd: number; perks: string[] }

type Checkout =
  | { type: "coins"; pack: CoinPack }
  | { type: "tier"; upgrade: TierUpgrade }
  | null;

const TIER_CHIP: Record<SubscriptionTierName, string> = {
  free: "border-white/20 bg-white/10 text-white/80",
  premium: "border-amber-400/50 bg-amber-500/20 text-amber-200",
  vip: "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200",
};

export function WalletMenu({
  initial,
  variant = "chip",
}: {
  initial: WalletView;
  variant?: "chip" | "card";
}) {
  const [wallet, setWallet] = useState<WalletView>(initial);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [upgrades, setUpgrades] = useState<TierUpgrade[]>([]);
  const [open, setOpen] = useState(false);
  const [checkout, setCheckout] = useState<Checkout>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Live-sync: poll the membership endpoint (also refreshes after actions). */
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/purchase", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as WalletView & {
        coinPacks?: CoinPack[];
        tierUpgrades?: TierUpgrade[];
      };
      setWallet({
        subscriptionTier: data.subscriptionTier,
        coinBalance: data.coinBalance,
        totalEarned: data.totalEarned,
      });
      if (data.coinPacks) setPacks(data.coinPacks);
      if (data.tierUpgrades) setUpgrades(data.tierUpgrades);
    } catch {
      // Offline — keep last known values.
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const id = window.setInterval(refresh, 15000);
    return () => window.clearInterval(id);
  }, [open, refresh]);

  const completeCheckout = useCallback(async () => {
    if (!checkout) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        checkout.type === "coins"
          ? { kind: "coins", packId: checkout.pack.id }
          : { kind: "tier", tier: checkout.upgrade.tier };
      const res = await fetch("/api/wallet/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as WalletView & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Payment failed");
      setWallet({
        subscriptionTier: data.subscriptionTier,
        coinBalance: data.coinBalance,
        totalEarned: data.totalEarned,
      });
      setMessage(
        checkout.type === "coins"
          ? `${checkout.pack.coins.toLocaleString()} coins added! 🪙`
          : `Welcome to ${TIER_LABELS[checkout.upgrade.tier]} VIP Membership! 🎉`
      );
      setCheckout(null);
      window.setTimeout(() => setMessage(null), 3200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }, [checkout]);

  const tierLabel = TIER_LABELS[wallet.subscriptionTier];

  /* ── Triggers ──────────────────────────────────────────────────────────── */
  const chip = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25"
    >
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${TIER_CHIP[wallet.subscriptionTier]}`}>
        {tierLabel}
      </span>
      🪙 {wallet.coinBalance.toLocaleString()}
    </button>
  );

  const card = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      className="w-full rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-orange-600/10 to-slate-900/60 p-5 text-left transition hover:border-amber-400/60"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">Wallet</h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${TIER_CHIP[wallet.subscriptionTier]}`}>
          {tierLabel} tier
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold text-amber-200">
        🪙 {wallet.coinBalance.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-white/50">
        Total earned {wallet.totalEarned.toLocaleString()} · tap to buy coins or upgrade
      </p>
    </button>
  );

  return (
    <>
      {variant === "chip" ? chip : card}

      {/* ── Wallet drawer ──────────────────────────────────────────────── */}
      {open ? (
        <div
          className="fixed inset-0 z-[90] flex justify-end bg-slate-950/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Wallet and checkout"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Wallet</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close wallet"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${TIER_CHIP[wallet.subscriptionTier]}`}>
                  {tierLabel}
                </span>
                <span className="text-2xl font-bold text-amber-200" aria-live="polite">
                  🪙 {wallet.coinBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {message ? (
              <p role="status" className="mt-3 rounded-xl border border-success-500/40 bg-success-500/10 px-4 py-2.5 text-sm text-success-200">
                {message}
              </p>
            ) : null}

            {/* Coin packs */}
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
              Coin packs
            </h3>
            <div className="mt-3 grid gap-3">
              {packs.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setCheckout({ type: "coins", pack })}
                  className="flex items-center justify-between rounded-2xl border border-orange-500/30 bg-slate-900/90 p-4 text-left transition hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/5"
                >
                  <div>
                    <p className="font-semibold text-white">{pack.label}</p>
                    <p className="text-xs text-amber-300">🪙 {pack.coins.toLocaleString()} coins</p>
                  </div>
                  <span className="rounded-xl bg-[#FF5722] px-4 py-2 text-sm font-semibold shadow-lg shadow-[#FF5722]/25">
                    ₦{pack.priceNgn.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>

            {/* Tier upgrades */}
            <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
              Upgrade tier
            </h3>
            <div className="mt-3 grid gap-3 pb-6">
              {upgrades
                .filter((u) => u.tier !== wallet.subscriptionTier)
                .map((upgrade) => (
                  <button
                    key={upgrade.tier}
                    type="button"
                    onClick={() => setCheckout({ type: "tier", upgrade })}
                    className="rounded-2xl border border-orange-500/30 bg-slate-900/90 p-4 text-left transition hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">{TIER_LABELS[upgrade.tier]}</p>
                      <span className="rounded-xl bg-[#FF5722] px-4 py-2 text-sm font-semibold shadow-lg shadow-[#FF5722]/25">
                        ${upgrade.priceUsd.toFixed(2)}
                      </span>
                    </div>
                    <ul className="mt-2 text-xs text-white/60">
                      {upgrade.perks.map((perk) => (
                        <li key={perk}>• {perk}</li>
                      ))}
                    </ul>
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}
      {/* ── Checkout modal ──────────────────────────────────────────────── */}
      {checkout ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Checkout"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setCheckout(null);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-orange-500/30 bg-slate-900/90 p-6 text-white shadow-2xl shadow-orange-500/5">
            <h2 className="text-lg font-bold text-white">
              {checkout.type === "coins"
                ? "VIP Membership — Coin Pack"
                : `Upgrade to ${TIER_LABELS[checkout.upgrade.tier]}`}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              {checkout.type === "coins"
                ? `🪙 ${checkout.pack.coins.toLocaleString()} coins · ${checkout.pack.label}`
                : checkout.upgrade.perks.join(" · ")}
            </p>
            <p className="mt-4 text-4xl font-bold">
              {checkout.type === "coins" ? (
                <span className="text-[#FF5722]">₦{checkout.pack.priceNgn.toFixed(2)}</span>
              ) : (
                <span className="text-[#FF5722]">${(checkout.upgrade.priceUsd).toFixed(2)}</span>
              )}
            </p>

            {error ? (
              <p role="alert" className="mt-3 rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            {/* Mock payment method row — a real gateway (Paystack/Stripe) is
                wired here later; the server route is already authoritative. */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-slate-900/90 p-3 text-sm">
              <span aria-hidden>💳</span>
              <span className="flex-1 text-white/80">Card on file ···· 4242</span>
              <span className="text-xs text-white/40">Mock</span>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setCheckout(null)}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void completeCheckout()}
                className="flex-1 rounded-xl bg-[#FF5722] px-4 py-2.5 text-sm font-semibold shadow-lg shadow-[#FF5722]/25 hover:bg-orange-500 disabled:opacity-60"
              >
                {busy ? "Processing…" : "Pay now"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}