"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// `ShieldCheck` was replaced by the `.lux-check` metal disc, which styles the
// checkmark itself; `Sparkles` was already unused. Neither is needed here.
import { Check, ChevronRight, Coins, Crown } from "lucide-react";
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
    // `min-h-full` (not `min-h-screen`): this renders inside AppShell, which
    // already owns the 100dvh lock, so a viewport-height floor would overflow
    // the content region and make the page scroll past the tab nav. The old
    // `pb-24` is gone too — the nav is an in-flow sibling now, not a fixed
    // overlay, so no compensating padding is needed.
    <div className="min-h-full bg-[#0b061d] p-4 font-sans text-white select-none">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="rounded-xl border border-white/10 bg-white/[0.06] p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          {/* "VIP Club", matching the label the nav and the profile quick
              action now use. */}
          <h1 className="text-xl font-bold tracking-wide">VIP Club</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="lux-coin text-xs">
            <Coins className="h-3.5 w-3.5" /> {coins.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-indigo-200">
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

      {/* Tier switching.
          `aria-selected` is what drives the selected styling in `.lux-tab`, so
          the visual state and the accessibility state cannot disagree — the
          old version hand-rolled both from `activeIndex === idx` and they had
          to be kept in step by hand. A member whose tier is already active also
          gets a dot on their tab, so "which one am I?" is answerable from the
          tab row without opening each tier. */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-3" role="tablist" aria-label="VIP tiers">
        {ARISTOCRACY_TIERS.map((name, idx) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={activeIndex === idx}
            onClick={() => setActiveIndex(idx)}
            className="lux-tab flex items-center gap-1.5"
          >
            <span aria-hidden>{TIER_MASCOTS[name]}</span>
            {name}
            {activeTier === name ? (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            ) : null}
          </button>
        ))}
      </div>

      {/* The tier card.
          When the member already holds this tier it renders as `lux-card--featured`
          with an elite badge, so "this is you" is answered at a glance instead of
          by reading a disabled button. The badge is the single most important
          addition here: previously the only signal was the CTA being greyed out
          with the words "Currently Active", which reads as "broken" rather than
          as "you are here". */}
      <div
        className={`lux-card relative mb-6 flex flex-col items-center overflow-hidden p-6 text-center ${
          isCurrent ? "lux-card--featured" : ""
        }`}
      >
        <div className="pointer-events-none absolute -bottom-6 -right-6 text-9xl opacity-10" aria-hidden>
          {TIER_MASCOTS[tier]}
        </div>
        {isCurrent ? (
          <span className="lux-badge relative z-10 mb-3">
            <Crown className="h-3 w-3" /> Your tier
          </span>
        ) : null}
        {/* Mascot medallion. The ring is metallic and the glow tightens for the
            active tier, so the focal point mirrors the card's state. */}
        <div
          className={[
            "relative z-10 mb-3 flex h-24 w-24 items-center justify-center rounded-full text-5xl shadow-xl",
            isCurrent
              ? "border-2 border-amber-300/70 bg-slate-950/70 shadow-[0_0_28px_-6px_rgba(251,191,36,0.6)]"
              : "border-2 border-white/15 bg-slate-950/50",
          ].join(" ")}
        >
          {TIER_MASCOTS[tier]}
        </div>
        <h2 className="lux-metal relative z-10 mb-1 text-2xl font-black uppercase tracking-wider">
          {tier}
        </h2>
        <p className="relative z-10 mb-4 text-xs text-indigo-200">
          Unlock elite standing and exclusive relationship perks
        </p>

        {/* Price. The coin glyph is gone: an emoji next to a metallic number
            fought the `lux-metal` fill and read as two different currencies.
            "30 days" moves up beside the price so the term is not buried under
            the CTA label. */}
        <div className="lux-coin relative z-10 mb-6 text-base">
          {TIER_PRICES[tier].toLocaleString()} coins
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/70">
            / 30 days
          </span>
        </div>

        <div className="relative z-10 mb-6 w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left backdrop-blur-md">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-amber-300">
            Included Privileges
          </span>
          <ul className="flex flex-col gap-2">
            {TIER_PERKS[tier].map((perk) => (
              <li key={perk} className="flex items-center gap-2.5 text-xs text-white/90">
                {/* A metal disc rather than a bare amber tick, so each privilege
                    line reads as a completed entitlement. */}
                <span className="lux-check">
                  <Check className="h-3 w-3" />
                </span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={activate}
          disabled={isPending || isCurrent}
          className="lux-cta relative z-10 w-full text-xs"
        >
          {isPending ? "Activating…" : isCurrent ? "Currently Active" : `Activate ${tier} · 30 days`}
        </button>
      </div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-200">
        Aesthetic &amp; Profile Effects
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Identity Mark", icon: TIER_MASCOTS[tier] },
          { label: "Custom Medal", icon: "🎖️" },
          { label: "Avatar Frame", icon: "🪞" },
          { label: "Bubble Box", icon: "🫧" },
          { label: "Entry Effect", icon: "✨" },
          { label: "Renewal Bonus", icon: "🎁" },
        ].map((priv) => (
          <div
            key={priv.label}
            className="lux-card flex flex-col items-center p-3 text-center"
          >
            <span aria-hidden className="relative z-10 mb-1.5 text-xl">
              {priv.icon}
            </span>
            <span className="relative z-10 text-[11px] font-semibold text-indigo-100">
              {priv.label}
            </span>
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