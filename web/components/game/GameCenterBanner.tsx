"use client";
import { ChevronRight, Coins, Gift, Lock, Medal, Sparkles, TrendingUp, Trophy } from "lucide-react";

/**
 * GameCenterBanner — the promo + level-benefits strip.
 *
 * Top: a marquee-style Special Offer banner with glowing gold edges.
 * Middle: three feature buttons (Ranking / Honor / 10K Chest).
 * Bottom: the "Lv35 Benefit" dual cards — a chest reward card and a
 * "10% Reward Boost" card, both locked with a badge until the member
 * reaches game level 35.
 */
export function GameCenterBanner({
  onFeature,
}: {
  onFeature: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      {/* ---- Scrolling Special Offer banner ---- */}
      <div className="group relative overflow-hidden rounded-3xl border border-amber-300/50 bg-gradient-to-r from-[#ff5f6d] via-[#ff7a00] to-[#ffc371] p-[2px] shadow-[0_10px_36px_rgba(255,122,0,0.45)]">
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#7a1020] via-[#c2410c] to-[#b45309] px-4 py-3">
          {/* glowing gold edge shimmer */}
          <div className="pointer-events-none absolute inset-0 rounded-[22px] shadow-[inset_0_0_24px_rgba(255,215,120,0.55)]" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl shadow-inner">🎁</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-200">Special Offer 2026.10.9-10.13</p>
              <div className="relative mt-0.5 h-6 overflow-hidden">
                <div className="absolute inset-0 flex w-max items-center whitespace-nowrap motion-safe:animate-[marquee_16s_linear_infinite]">
                  <span className="text-base font-black text-white drop-shadow">
                    🎉 Grand Game Festival — Win up to 1M Coins &nbsp;·&nbsp; Double rewards all week &nbsp;·&nbsp; Spin to claim your chest &nbsp;·&nbsp;
                  </span>
                  <span className="text-base font-black text-white drop-shadow" aria-hidden>
                    🎉 Grand Game Festival — Win up to 1M Coins &nbsp;·&nbsp; Double rewards all week &nbsp;·&nbsp; Spin to claim your chest &nbsp;·&nbsp;
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/80" aria-hidden />
          </div>
        </div>
      </div>

      {/* ---- Feature buttons ---- */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onFeature("ranking")}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-amber-300/20 bg-gradient-to-b from-amber-400/15 to-transparent p-3 text-white transition hover:from-amber-400/25 active:scale-95"
        >
          <Trophy className="h-6 w-6 text-amber-300" aria-hidden />
          <span className="text-center text-xs font-bold leading-tight">Ranking</span>
        </button>
        <button
          type="button"
          onClick={() => onFeature("honor")}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-fuchsia-300/20 bg-gradient-to-b from-fuchsia-400/15 to-transparent p-3 text-white transition hover:from-fuchsia-400/25 active:scale-95"
        >
          <Medal className="h-6 w-6 text-fuchsia-300" aria-hidden />
          <span className="text-center text-xs font-bold leading-tight">Honor</span>
        </button>
        <button
          type="button"
          onClick={() => onFeature("chests")}
          className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-amber-300/20 bg-gradient-to-b from-orange-400/15 to-transparent p-3 text-white transition hover:from-orange-400/25 active:scale-95"
        >
          <Gift className="h-6 w-6 text-orange-300" aria-hidden />
          <span className="text-center text-xs font-bold leading-tight">10K Chest</span>
          <span className="absolute -right-1 -top-1 rounded-full bg-gradient-to-b from-amber-300 to-orange-500 px-1.5 py-0.5 text-[9px] font-black text-[#2b1000] shadow">10K</span>
        </button>
      </div>

      {/* ---- Lv35 Benefit dual cards ---- */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-300" aria-hidden />
          <h2 className="text-sm font-black text-white">Lv35 Benefit</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Chest reward card */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-br from-[#3b2a08] via-[#2b1245] to-[#141031] p-3">
            <div className="flex h-20 items-center justify-center">
              <span className="text-4xl drop-shadow-[0_4px_10px_rgba(251,191,36,0.6)]">🎁</span>
            </div>
            <p className="mt-1 text-center text-sm font-black text-white">Chest Reward</p>
            <p className="text-center text-[11px] font-semibold text-amber-200">Claim 100K coins</p>
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black text-amber-200">
              <Lock className="h-2.5 w-2.5" aria-hidden /> Lv35
            </span>
          </div>

          {/* 10% Reward Boost card */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-[#062e2b] via-[#101a3a] to-[#141031] p-3">
            <div className="flex h-20 items-center justify-center">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/10 ring-1 ring-emerald-300/40">
                <TrendingUp className="h-7 w-7 text-emerald-300" aria-hidden />
                <span className="absolute -bottom-1 rounded-full bg-emerald-400 px-1.5 text-[9px] font-black text-[#04231d]">+10%</span>
              </div>
            </div>
            <p className="mt-1 text-center text-sm font-black text-white">Reward Boost</p>
            <p className="flex items-center justify-center gap-1 text-center text-[11px] font-semibold text-emerald-200">
              <Coins className="h-3 w-3" aria-hidden /> +10% on every win
            </p>
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black text-emerald-200">
              <Lock className="h-2.5 w-2.5" aria-hidden /> Lv35
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
