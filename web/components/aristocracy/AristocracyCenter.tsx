"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Coins, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { activateAristocracyTierAction } from "@/lib/actions/commerce";
import {
  ARISTOCRACY_TIERS,
  TIER_MASCOTS,
  TIER_PERKS,
  TIER_PRICES,
  type AristocracyTier,
} from "@/lib/aristocracyTiers";

export function AristocracyCenter({
  initialCoins = 0,
  activeTier: initialActiveTier = null,
  activeTierExpiresAt: initialActiveTierExpiresAt = null,
}: {
  initialCoins?: number;
  activeTier?: AristocracyTier | null;
  activeTierExpiresAt?: string | null;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = ARISTOCRACY_TIERS.indexOf(initialActiveTier ?? "Knight");
    return idx >= 0 ? idx : 0;
  });
  const [coins, setCoins] = useState(initialCoins);
  const [activeTier, setActiveTier] = useState<AristocracyTier | null>(initialActiveTier);
  const [activeTierExpiresAt, setActiveTierExpiresAt] = useState<string | null>(initialActiveTierExpiresAt);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tier = ARISTOCRACY_TIERS[activeIndex];
  const isCurrent = activeTier === tier;

  function activate() {
    startTransition(async () => {
      const result = await activateAristocracyTierAction(tier);
      if (!result.ok) {
        setNotice(result.error ?? "Activation failed");
        return;
      }
      setCoins(result.coinBalance ?? coins);
      setActiveTier(tier);
      setActiveTierExpiresAt(result.expiresAt ?? null);
      setNotice(`${tier} activated for 30 days`);
      router.refresh();
    });
  }
  return (
    <div className="min-h-screen bg-[#0b061d] p-4 pb-24 font-sans text-white select-none">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="rounded-xl border border-indigo-500/30 bg-indigo-950/60 p-1.5 text-white"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <h1 className="text-xl font-bold tracking-wide">Aristocracy Center</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
            <Coins className="h-3.5 w-3.5" /> {coins.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
            <Crown className="h-3.5 w-3.5" /> VIP Tiers
          </div>
        </div>
      </div>

      {activeTier ? (
        <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-200">
          Active tier: {TIER_MASCOTS[activeTier]} {activeTier}
          {activeTierExpiresAt ? ` - renews ${new Date(activeTierExpiresAt).toLocaleDateString()}` : ""}
        </p>
      ) : null}

      <div className="mb-6 flex space-x-2 overflow-x-auto pb-3" role="tablist" aria-label="Aristocracy tiers">
        {ARISTOCRACY_TIERS.map((name, idx) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={activeIndex === idx}
            onClick={() => setActiveIndex(idx)}
            className={
              "whitespace-nowrap rounded-2xl border px-4 py-2 text-xs font-extrabold shadow-lg transition-all " +
              (activeIndex === idx
                ? "scale-105 border border-white/30 bg-amber-500 text-black"
                : "border-indigo-500/20 bg-indigo-950/60 text-indigo-300")
            }
          >
            {TIER_MASCOTS[name]} {name}
          </button>
        ))}
      </div>

      <div className="relative mb-6 flex flex-col items-center overflow-hidden rounded-3xl border border-amber-500/30 bg-indigo-950/80 p-6 text-center shadow-2xl">
        <div className="pointer-events-none absolute -bottom-6 -right-6 text-9xl opacity-10" aria-hidden>
          {TIER_MASCOTS[tier]}
        </div>
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400/40 bg-black/30 text-4xl shadow-xl">
          {TIER_MASCOTS[tier]}
        </div>
        <h2 className="mb-1 text-2xl font-black uppercase tracking-wider">{tier} Status</h2>
        <p className="mb-4 text-xs text-indigo-200">Unlock elite standing and exclusive relationship perks</p>

        <div className="mb-6 rounded-xl border border-amber-400/30 bg-black/40 px-4 py-1.5 text-base font-extrabold text-amber-300">
          🪙 {TIER_PRICES[tier].toLocaleString()} coins / 30 days
        </div>

        <div className="mb-6 w-full rounded-2xl border border-indigo-500/20 bg-black/30 p-4 text-left backdrop-blur-md">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-amber-300">Included Privileges:</span>
          <ul className="flex flex-col gap-2">
            {TIER_PERKS[tier].map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-xs text-white/90">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={activate}
          disabled={isPending || isCurrent}
          className="w-full rounded-xl border border-amber-400/40 bg-amber-400 py-2.5 text-xs font-extrabold text-black shadow-lg transition hover:bg-amber-300 disabled:opacity-60"
        >
          {isPending ? "Activating..." : isCurrent ? "Currently Active" : `Activate ${tier} (30 days)`}
        </button>
      </div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-200">Aesthetic &amp; Profile Effects</h3>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Identity Mark", icon: TIER_MASCOTS[tier] },
          { label: "Custom Medal", icon: "🎖️" },
          { label: "Avatar Frame", icon: "🪞" },
          { label: "Bubble Box", icon: "🫧" },
          { label: "Entry Effect", icon: "✨" },
          { label: "Renewal Bonus", icon: "🎁" },
        ].map((priv) => (
          <div key={priv.label} className="flex flex-col items-center rounded-2xl border border-indigo-500/20 bg-indigo-950/40 p-3 text-center shadow">
            <span className="mb-1.5 text-xl" aria-hidden>{priv.icon}</span>
            <span className="text-[11px] font-semibold text-indigo-100">{priv.label}</span>
          </div>
        ))}
      </div>

      {notice ? (
        <p role="status" className="fixed bottom-28 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-white/15 bg-slate-900/95 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          {notice}
        </p>
      ) : null}
    </div>
  );
}