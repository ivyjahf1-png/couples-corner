"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Coins, Crown, Lock } from "lucide-react";
import { activateVipTierAction } from "@/lib/actions/commerce";
import {
  PERK_FAMILIES,
  PERK_UNLOCKS,
  TIER_MASCOTS,
  TIER_PERKS,
  TIER_PRICES,
  VIP_TIERS,
  perksForTier,
  type VipTier,
} from "@/lib/vipTiers";

/**
 * The VIP Club: a tier progression view plus the activation CTA.
 *
 * REBRAND: this surface was "Aristocracy". A noble-faction rank is game
 * vocabulary and it fought the upscale dating voice the rest of the product
 * uses. It is now the VIP Club, and the screen's job changed with it: the old
 * one showed a flat list of perk strings per tier, so comparing Baron against
 * Duke meant reading two walls of prose and diffing them mentally. The ladder
 * below answers that directly — every perk family, the tier that unlocks it,
 * and whether THIS member already holds it.
 */
export function VipClubCenter({
  initialCoins = 0,
  activeTier: initialActiveTier = null,
  activeTierExpiresAt: initialActiveTierExpiresAt = null,
}: {
  initialCoins?: number;
  activeTier?: VipTier | null;
  activeTierExpiresAt?: string | null;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = VIP_TIERS.indexOf(initialActiveTier ?? "Knight");
    return idx >= 0 ? idx : 0;
  });
  const [coins, setCoins] = useState(initialCoins);
  const [activeTier, setActiveTier] = useState<VipTier | null>(initialActiveTier);
  const [activeTierExpiresAt, setActiveTierExpiresAt] = useState<string | null>(initialActiveTierExpiresAt);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tier = VIP_TIERS[activeIndex];
  const isCurrent = activeTier === tier;
  // The member's standing, so the ladder can mark perks as already HELD rather
  // than merely advertised. `null` (signed out / no tier) means nothing is
  // held, which is the honest reading of "no membership".
  const heldRank = activeTier ? VIP_TIERS.indexOf(activeTier) : -1;

  function activate() {
    startTransition(async () => {
      const result = await activateVipTierAction(tier);
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
    // the content region and make the page scroll past the tab nav.
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
      {/* ── TIER PROGRESSION ───────────────────────────────────────────────
          The centrepiece of the rebrand, and the reason this is a "club" rather
          than a shop.

          It is a LADDER, not a list: one row per perk family, one column per
          tier, so "what does upgrading get me" is a glance across a row rather
          than a prose diff between two tier cards. A filled tick appears only
          at the tier that first unlocks the family — ticking every column above
          it would imply each tier re-grants it, which is noise, not information.

          Locked families are muted with a padlock rather than hidden, because
          "you get this at Duke" is the most persuasive thing on the screen for
          a member who is one tier down. */}
      <section aria-labelledby="progression-heading" className="lux-card mb-6 overflow-hidden p-4">
        <h2 id="progression-heading" className="lux-metal relative z-10 mb-1 text-sm font-black uppercase tracking-wider">
          Tier progression
        </h2>
        <p className="relative z-10 mb-4 text-[11px] text-indigo-200/80">
          Every perk is kept once earned — climb a tier and the ones below stay with you.
        </p>

        {/* `min-w` + horizontal scroll keeps the five tier columns legible on a
            phone instead of crushing them to sub-tap-target widths. */}
        <div className="relative z-10 -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[22rem] border-collapse text-left">
            <caption className="sr-only">
              Which perk family unlocks at each VIP Club tier, and which you already hold.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="pb-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Perk
                </th>
                {VIP_TIERS.map((name) => {
                  const held = activeTier === name;
                  return (
                    <th
                      key={name}
                      scope="col"
                      aria-current={held ? "true" : undefined}
                      className={[
                        "pb-2 pr-1 text-center align-bottom text-[10px] font-bold uppercase tracking-wider",
                        held ? "text-amber-300" : "text-ink-400",
                      ].join(" ")}
                    >
                      <span className="block" aria-hidden>
                        {TIER_MASCOTS[name]}
                      </span>
                      {name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERK_FAMILIES.map(({ id, label }) => {
                const unlock = PERK_UNLOCKS[id];
                const unlockRank = VIP_TIERS.indexOf(unlock.tier);
                const heldByMember = heldRank >= unlockRank;
                return (
                  <tr key={id} className="border-t border-white/[0.07]">
                    <th scope="row" className="py-2.5 pr-2 align-middle text-[11px] font-semibold text-white/90">
                      {label}
                      <span className="mt-0.5 block text-[10px] font-medium text-ink-400">
                        {heldByMember ? "Active for you" : `From ${unlock.tier}`}
                      </span>
                    </th>
                    {VIP_TIERS.map((name, rank) => {
                      const isUnlockTier = rank === unlockRank;
                      const isPast = rank > unlockRank;
                      return (
                        <td key={name} className="py-2.5 pr-1 text-center align-middle">
                          {isUnlockTier ? (
                            <span className="lux-check mx-auto" title={`Unlocks at ${name}`}>
                              <Check className="h-3 w-3" />
                            </span>
                          ) : isPast ? (
                            /* A dim tick, not a blank cell: the family IS held
                               here, it just was not introduced at this tier. */
                            <span className="text-ink-400/50" aria-hidden>
                              <Check className="mx-auto h-2.5 w-2.5" />
                            </span>
                          ) : (
                            <span className="text-ink-400/30" aria-hidden>
                              <Lock className="mx-auto h-2.5 w-2.5" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {/* Tier switching. `aria-selected` drives the selected styling in
          `.lux-tab`, so the visual and accessibility states cannot disagree —
          the old version hand-rolled both from `activeIndex === idx` and had to
          be kept in step by hand. A member whose tier is already active also
          gets a dot on their tab, so "which one am I?" is answerable from the
          tab row alone. */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-3" role="tablist" aria-label="VIP tiers">
        {VIP_TIERS.map((name, idx) => (
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

      {/* The tier card. When the member already holds this tier it renders as
          `lux-card--featured` with an elite badge, so "this is you" is answered
          at a glance rather than by reading a greyed-out button — a disabled CTA
          reads as "broken", not as "you are here". */}
      <div
        className={`lux-card relative mb-6 flex flex-col items-center overflow-hidden p-6 text-center ${
          isCurrent ? "lux-card--featured" : ""
        }`}
      >
        <div className="pointer-events-none absolute -bottom-6 -right-6 text-9xl opacity-10" aria-hidden>
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
            "30 days" sits beside the price so the term is not buried under the
            CTA label. */}
        <div className="lux-coin relative z-10 mb-6 text-base">
          {TIER_PRICES[tier].toLocaleString()} tokens
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

      {/* Aesthetic & profile effects.

          Now DRIVEN BY `perksForTier` rather than a hardcoded six-label grid.
          The old array showed the same six decorative icons on every tier, so
          it told a member nothing about what their money bought. Each tile is a
          real perk family, badged "Active" so the panel answers "what do I
          have" instead of "here are some icons". */}
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-200">
        Aesthetic &amp; Profile Effects
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {perksForTier(tier).map((perk) => (
          <div key={perk.id} className="lux-card flex flex-col items-center p-3 text-center">
            <span className="relative z-10 mb-1.5 text-[11px] font-semibold leading-tight text-indigo-100">
              {perk.label}
            </span>
            <span className="relative z-10 mt-1 text-[9px] font-bold uppercase tracking-wide text-emerald-300/80">
              Active
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
