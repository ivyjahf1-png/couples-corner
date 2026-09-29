"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, Lock } from "lucide-react";
import { AristocracyModal } from "@/components/aristocracy/AristocracyModal";
import {
  ARISTOCRACY_TIERS,
  PERK_FAMILIES,
  PERK_UNLOCKS,
  TIER_DURATION_DAYS,
  TIER_MASCOTS,
  TIER_ORDINALS,
  TIER_PRICES,
  perksForTier,
  type AristocracyTier,
} from "@/lib/aristocracyTiers";

/**
 * The Aristocracy page: the rank ladder, plus the purchase modal.
 *
 * RELATIONSHIP TO AristocracyModal: this page shows the whole ladder and lets a
 * member compare; the modal is where the money moves. Splitting them means
 * browsing a rank is free and reversible, and the one screen that debits a
 * wallet has exactly one job.
 *
 * The progression table is the centrepiece. A flat list of perk strings per rank
 * — the previous design — meant comparing Duke against King meant reading two
 * walls of prose and diffing them mentally. Here each perk family is a ROW and
 * each rank a COLUMN, so "what does upgrading get me" is a glance across a row.
 */
export function AristocracyCenter({
  initialCoins = 0,
  activeTier: initialActiveTier = null,
  activeTierExpiresAt: initialActiveTierExpiresAt = null,
  signedIn = false,
}: {
  initialCoins?: number;
  activeTier?: AristocracyTier | null;
  activeTierExpiresAt?: string | null;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [coins] = useState(initialCoins);
  const [activeTier] = useState<AristocracyTier | null>(initialActiveTier);
  const [expiresAt] = useState<string | null>(initialActiveTierExpiresAt);
  const [modalOpen, setModalOpen] = useState(false);

  // The member's standing, so the ladder can mark perks as already HELD rather
  // than merely advertised. null (signed out / no rank) means nothing is held.
  const heldRank = activeTier ? ARISTOCRACY_TIERS.indexOf(activeTier) : -1;

  return (
    // `min-h-full` (not `min-h-screen`): this renders inside AppShell, which
    // already owns the 100dvh lock, so a viewport-height floor would overflow
    // the content region and make the page scroll past the tab nav.
    <div className="min-h-full bg-[#0b061d] p-4 font-sans text-white select-none">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="lux-metal text-xl font-black uppercase tracking-wider">Aristocracy</h1>
          <p className="text-[11px] text-indigo-200/70">
            Six ranks · {TIER_DURATION_DAYS} days each
          </p>
        </div>
        <span className="lux-coin text-xs">
          <Coins className="h-3.5 w-3.5" aria-hidden /> {coins.toLocaleString()}
        </span>
      </div>

      {activeTier ? (
        <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-200">
          Active rank: {TIER_MASCOTS[activeTier]} {activeTier}
          {expiresAt ? ` — renews ${new Date(expiresAt).toLocaleDateString()}` : ""}
        </p>
      ) : null}
      {/* ── PROGRESSION TABLE ───────────────────────────────────────────────
          `min-w` + horizontal scroll keeps six rank columns legible on a phone
          rather than crushing them to sub-tap-target widths. */}
      <section aria-labelledby="progression-heading" className="lux-card mb-6 overflow-hidden p-4">
        <h2
          id="progression-heading"
          className="lux-metal relative z-10 mb-1 text-sm font-black uppercase tracking-wider"
        >
          Rank progression
        </h2>
        <p className="relative z-10 mb-4 text-[11px] text-indigo-200/80">
          Every privilege is kept once earned — climb a rank and the ones below stay with you.
        </p>

        <div className="relative z-10 -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[26rem] border-collapse text-left">
            <caption className="sr-only">
              Which privilege unlocks at each Aristocracy rank, and which you already hold.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="pb-2 pr-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Privilege
                </th>
                {ARISTOCRACY_TIERS.map((name) => (
                  <th
                    key={name}
                    scope="col"
                    aria-current={activeTier === name ? "true" : undefined}
                    className={[
                      "pb-2 pr-1 text-center align-bottom text-[10px] font-bold uppercase tracking-wider",
                      activeTier === name ? "text-amber-300" : "text-ink-400",
                    ].join(" ")}
                  >
                    <span className="block" aria-hidden>
                      {TIER_MASCOTS[name]}
                    </span>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERK_FAMILIES.map(({ id, label, icon }) => {
                const unlock = PERK_UNLOCKS[id];
                const unlockRank = ARISTOCRACY_TIERS.indexOf(unlock.tier);
                const heldByMember = heldRank >= unlockRank;
                return (
                  <tr key={id} className="border-t border-white/[0.07]">
                    <th scope="row" className="py-2.5 pr-2 align-middle text-[11px] font-semibold text-white/90">
                      <span aria-hidden className="mr-1.5">
                        {icon}
                      </span>
                      {label}
                      <span className="mt-0.5 block text-[10px] font-medium text-ink-400">
                        {heldByMember ? "Active for you" : `From ${unlock.tier}`}
                      </span>
                    </th>
                    {ARISTOCRACY_TIERS.map((name, rank) => {
                      const isUnlockTier = rank === unlockRank;
                      const isPast = rank > unlockRank;
                      return (
                        <td key={name} className="py-2.5 pr-1 text-center align-middle">
                          {isUnlockTier ? (
                            <span className="lux-check mx-auto" title={`Unlocks at ${name}`}>
                              <Check className="h-3 w-3" />
                            </span>
                          ) : isPast ? (
                            /* A dim tick, not a blank cell: the privilege IS held
                               here, it just was not introduced at this rank. */
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
      {/* ── RANK CARDS ──────────────────────────────────────────────────────
          A compact card per rank so the price ladder is readable at a glance
          without a table. The one this member holds is marked. */}
      <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ARISTOCRACY_TIERS.map((name) => {
          const held = activeTier === name;
          const perks = perksForTier(name).filter((perk) => perk.unlocked).length;
          return (
            <li
              key={name}
              className={[
                "lux-card relative flex flex-col items-center p-4 text-center",
                held ? "lux-card--featured" : "",
              ].join(" ")}
            >
              <span aria-hidden className="relative z-10 mb-2 text-3xl">
                {TIER_MASCOTS[name]}
              </span>
              <span className="relative z-10 text-sm font-bold text-white">{name}</span>
              <span aria-hidden className="relative z-10 text-[10px] uppercase tracking-wider text-white/40">
                {TIER_ORDINALS[name]}
              </span>
              <span className="lux-coin relative z-10 mt-2 text-sm">
                {TIER_PRICES[name].toLocaleString()}
              </span>
              <span className="relative z-10 mt-1 text-[10px] text-white/50">
                {perks} of {PERK_FAMILIES.length} privileges
              </span>
              {held ? (
                <span className="relative z-10 mt-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  Yours
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="lux-cta w-full py-3 text-xs"
      >
        {signedIn ? "Open the Aristocracy" : "Sign in to open the Aristocracy"}
      </button>

      {modalOpen ? (
        <AristocracyModal
          signedIn={signedIn}
          coinBalance={coins}
          activeTier={activeTier}
          activeTierExpiresAt={expiresAt}
          onClose={() => {
            setModalOpen(false);
            // Balance and rank both change on activation; a refresh is how this
            // Server-rendered page learns about it.
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}