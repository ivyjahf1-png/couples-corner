"use client";

import { PageHeader, PageLock } from "@/components/app/PageHeader";
import {
  BadgeCheck,
  CalendarCheck,
  Camera,
  Flame,
  Gamepad2,
  ListChecks,
  MessageCircle,
} from "lucide-react";

/**
 * LEVEL — the member progression screen.
 *
 * Four bands, top to bottom, in ONE scroll region (`PageLock`):
 *   1. Status card   — current level, XP progress bar (0/30), next-level gap.
 *   2. Ways          — the activities that grant XP and what each pays.
 *   3. Level icons   — LV1 → LV100 with the icon and title each level carries.
 *   4. Rewards       — the badge frames unlocked at specific level-ups.
 *
 * THE XP VALUES ARE STATIC, DELIBERATELY. The progression ledger exists as a
 * migration (`users.level` / `users.experience`) but no server helper reads it
 * yet, and this product's convention is not to claim a state the backend cannot
 * support — the profile's "Uncertified" row documents the same call. When a
 * `getProgression()` helper lands, the three constants below become props and
 * no markup in this file changes.
 */

/* Dark slate surface shared by every card: slate-900 glass with a hairline, so
   the canvas gradient still shows through instead of a pasted white box. */
const CARD = "rounded-2xl border border-white/10 bg-[#0F172A]/70 shadow-lg";
const ORANGE = "#FF7A00";

/* The member's current state. The progress bar denominator is XP_PER_LEVEL. */
const CURRENT_LEVEL = 1;
const CURRENT_XP = 0;
const XP_PER_LEVEL = 30;

/** Icon + title a level carries, by tier. LV100 is its own terminal tier. */
function tierOf(level: number): { icon: string; title: string } {
  if (level >= 100) return { icon: "🌟", title: "Legend" };
  if (level >= 76) return { icon: "👑", title: "Crown" };
  if (level >= 51) return { icon: "💎", title: "Gem" };
  if (level >= 26) return { icon: "🥇", title: "Gold" };
  if (level >= 11) return { icon: "🥈", title: "Silver" };
  return { icon: "🥉", title: "Bronze" };
}

/** The full table is materialised once — 100 rows, no lazy slicing. */
const LEVELS = Array.from({ length: 100 }, (_, index) => index + 1);

/** XP grants. Each entry is a real, reachable action in the app. */
const WAYS: { icon: typeof Flame; label: string; xp: number }[] = [
  { icon: CalendarCheck, label: "Daily check-in", xp: 5 },
  { icon: MessageCircle, label: "Send a message", xp: 2 },
  { icon: Camera, label: "Post a moment", xp: 10 },
  { icon: ListChecks, label: "Complete a daily task", xp: 20 },
  { icon: Gamepad2, label: "Play a game round", xp: 8 },
  { icon: BadgeCheck, label: "Verify your profile", xp: 50 },
];

/** Frames unlocked at level-ups. `ring` is the preview border colour. */
const REWARD_FRAMES: { level: number; name: string; ring: string }[] = [
  { level: 5, name: "Bronze Frame", ring: "border-amber-700" },
  { level: 10, name: "Silver Frame", ring: "border-slate-300" },
  { level: 20, name: "Gold Frame", ring: "border-amber-400" },
  { level: 35, name: "Rose Frame", ring: "border-pink-400" },
  { level: 50, name: "Royal Frame", ring: "border-violet-400" },
  { level: 75, name: "Aurora Frame", ring: "border-cyan-300" },
  { level: 100, name: "Eternal Frame", ring: "border-orange-300" },
];

export default function LevelPage() {
  const current = tierOf(CURRENT_LEVEL);
  const toNext = XP_PER_LEVEL - CURRENT_XP;

  return (
    <PageLock
      className="mx-auto w-full max-w-3xl"
      bodyClassName="pb-8"
      head={
        <PageHeader
          eyebrow="Progression"
          title="Level"
          subtitle="Earn experience, climb from LV1 to LV100, and unlock badge frames along the way."
        />
      }
    >
      <div className="flex flex-col gap-6">
        {/* ── 1. STATUS CARD ───────────────────────────────────────────── */}
        <section aria-label="Current level" className={`${CARD} p-5`}>
          <div className="flex items-center gap-4">
            {/* The medallion: tier icon inside an orange-ringed disc. */}
            <div
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 bg-white/5 text-3xl"
              style={{ borderColor: ORANGE }}
              aria-hidden
            >
              {current.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-2xl font-black tabular-nums" style={{ color: ORANGE }}>
                  LV{CURRENT_LEVEL}
                </span>
                <span className="text-sm font-bold text-slate-300">{current.title}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {current.title} tier · next unlock at LV{CURRENT_LEVEL + 1}
              </p>

              {/* THE 0/30 PROGRESS BAR. ARIA mirrors the visible numbers, and the
                  fill width derives from the same values so the two can never
                  disagree; at 0 XP the track renders empty by construction. */}
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={XP_PER_LEVEL}
                aria-valuenow={CURRENT_XP}
                aria-label={`Experience towards level ${CURRENT_LEVEL + 1}`}
                className="mt-3"
              >
                <div className="flex items-baseline justify-between text-[11px] font-semibold">
                  <span className="uppercase tracking-wider text-slate-400">Experience</span>
                  <span className="tabular-nums text-white">
                    {CURRENT_XP}/{XP_PER_LEVEL} XP
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FFB020]"
                    style={{ width: `${(CURRENT_XP / XP_PER_LEVEL) * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {toNext} XP to reach LV{CURRENT_LEVEL + 1}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. WAYS TO LEVEL UP ──────────────────────────────────────── */}
        <section aria-label="Ways to level up" className={`${CARD} overflow-hidden`}>
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Ways to Level Up
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Every action below pays experience the moment it completes.
            </p>
          </div>
          <ul className="divide-y divide-white/10">
            {WAYS.map((way) => (
              <li key={way.label} className="flex items-center gap-3 px-5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200">
                  <way.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {way.label}
                </span>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums"
                  style={{ backgroundColor: `${ORANGE}1F`, color: "#FFA040" }}
                >
                  +{way.xp} XP
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 3. LEVEL ICON TABLE, LV1 → LV100 ─────────────────────────── */}
        <section aria-label="Level icons" className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Level Icons
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                The icon and title each level carries.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300">
              LV1 – LV100
            </span>
          </div>
          {/* Fixed-height scroller: 100 rows would otherwise push the reward
              frames a full page below the fold. The current level's row is
              tinted so it is findable the moment the table opens. */}
          <div className="max-h-[26rem] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#0F172A] text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-bold">Level</th>
                  <th scope="col" className="px-2 py-2.5 font-bold">Icon</th>
                  <th scope="col" className="px-2 py-2.5 font-bold">Title</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-bold">XP needed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {LEVELS.map((level) => {
                  const tier = tierOf(level);
                  const isCurrent = level === CURRENT_LEVEL;
                  return (
                    <tr
                      key={level}
                      className={
                        isCurrent ? "bg-[#FF7A00]/10" : "transition hover:bg-white/[0.04]"
                      }
                    >
                      <td className="px-5 py-2 font-bold tabular-nums text-white">
                        LV{level}
                        {isCurrent ? (
                          <span className="ml-1.5 rounded bg-[#FF7A00]/20 px-1 py-0.5 text-[9px] font-black uppercase text-[#FFA040]">
                            You
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-lg" aria-hidden>
                        {tier.icon}
                      </td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-300">
                        {tier.title}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-slate-400">
                        {level * XP_PER_LEVEL}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 4. LEVEL-UP REWARD BADGE FRAMES ──────────────────────────── */}
        <section aria-label="Level-up rewards">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Level-Up Rewards
            </h2>
            <span className="text-[11px] text-slate-400">Badge frames</span>
          </div>
          {/* Horizontal scroller: seven previews fit on a tablet but not on a
              phone, and stacking them would bury the end of the list. */}
          <ul className="flex snap-x gap-3 overflow-x-auto pb-2">
            {REWARD_FRAMES.map((frame) => {
              const unlocked = CURRENT_LEVEL >= frame.level;
              return (
                <li
                  key={frame.level}
                  className={`w-28 shrink-0 snap-start rounded-2xl border p-3 text-center ${
                    unlocked
                      ? "border-[#FF7A00]/50 bg-[#FF7A00]/10"
                      : "border-white/10 bg-[#0F172A]/70"
                  }`}
                >
                  {/* The frame preview: a ringed disc standing in for the
                      member's avatar wearing the frame. */}
                  <div
                    className={`mx-auto grid h-14 w-14 place-items-center rounded-full border-4 bg-white/5 text-xl ${frame.ring}`}
                    aria-hidden
                  >
                    {tierOf(frame.level).icon}
                  </div>
                  <p className="mt-2 truncate text-xs font-bold text-white" title={frame.name}>
                    {frame.name}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {unlocked ? "Unlocked" : `Reach LV${frame.level}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </PageLock>
  );
}



