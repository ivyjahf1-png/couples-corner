"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, Coins, Cpu, Heart, Trophy, User, Users } from "lucide-react";
import { BETS } from "@/lib/ludo/match";
import { Avatar } from "@/components/app/Avatar";

/**
 * LudoLobby — THE single pre-match flow for Ludo, as one responsive 3-step
 * wizard instead of the old duplicate lobby screens (LudoHub's two-tab matrix
 * and this file's flat card, which both existed at once):
 *
 *   Step 1 Mode    2 Players · 4 Players · Friends · vs Computer
 *   Step 2 Stake   coin chips + live pot preview
 *   Step 3 Start   confirm summary (+ friend names when Friends is selected)
 *
 * Modes map onto the match engine as:
 *   duo     two human seats (you seat 0 + a friend seat 2, diagonal bases)
 *   quad    all four seats hot-seated on one device
 *   friends quad hot-seat where you can name the friends around the table
 *   cpu     seat 0 human vs the three bot personas
 */
export type LudoMode = "duo" | "quad" | "friends" | "cpu";

/** Seats dealt into the match: duo plays the diagonal pair. */
export function modePlayers(mode: LudoMode): number {
  return mode === "duo" ? 2 : 4;
}

const MODE_CARDS: Array<{
  id: LudoMode;
  icon: React.ReactNode;
  title: string;
  sub: string;
}> = [
  { id: "duo", icon: <User className="h-4 w-4" />, title: "2 Players", sub: "You vs a friend" },
  { id: "quad", icon: <Users className="h-4 w-4" />, title: "4 Players", sub: "Pass & play, all seats" },
  { id: "friends", icon: <Heart className="h-4 w-4" />, title: "Friends", sub: "Name your crew" },
  { id: "cpu", icon: <Cpu className="h-4 w-4" />, title: "vs Computer", sub: "Beat Tunde & crew" },
];

function ModeCard({
  active,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border px-3 py-2.5 text-left transition active:scale-[.98] ${
        active
          ? "border-amber-300/70 bg-amber-400/12 shadow-[0_0_18px_rgba(251,191,36,.28)]"
          : "border-white/12 bg-white/6 hover:bg-white/10"
      }`}
    >
      <span
        className={`mb-1.5 grid h-7 w-7 place-items-center rounded-lg ${
          active ? "bg-amber-400/25 text-amber-300" : "bg-white/10 text-white/70"
        }`}
      >
        {icon}
      </span>
      <span className="block text-xs font-black text-white">{title}</span>
      <span className="block text-[10px] font-semibold text-white/50">{sub}</span>
    </button>
  );
}

/** 1 Mode → 2 Stake → 3 Start progress pills; completed steps are tappable. */
function StepDots({
  step,
  onBack,
}: {
  step: 1 | 2 | 3;
  onBack: (s: 1 | 2 | 3) => void;
}) {
  const labels = ["Mode", "Stake", "Start"] as const;
  return (
    <div className="mb-4 flex items-center gap-1.5">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = step > n;
        const current = step === n;
        return (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
            <button
              type="button"
              onClick={() => (done || current ? null : onBack(n))}
              disabled={!done && !current}
              aria-current={current ? "step" : undefined}
              className={`flex min-w-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black transition ${
                current
                  ? "border-amber-300/70 bg-amber-400/15 text-amber-300"
                  : done
                    ? "border-white/15 bg-white/8 text-white/75 hover:bg-white/12"
                    : "border-white/8 bg-white/4 text-white/35"
              }`}
            >
              {done ? <Check className="h-3 w-3 shrink-0" /> : <span className="shrink-0">{n}</span>}
              <span className="truncate">{label}</span>
            </button>
            {i < labels.length - 1 ? (
              <span className="h-px flex-1 bg-white/10" aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function LudoLobby({
  balance,
  bet,
  onBet,
  mode,
  onMode,
  players,
  pot,
  names,
  onNames,
  photoUrl,
  onStart,
}: {
  balance: number;
  bet: number;
  onBet: (b: number) => void;
  mode: LudoMode;
  onMode: (m: LudoMode) => void;
  players: number;
  pot: number;
  /** Seat display names; seat 0 is always "You" (the device holder). */
  names: string[];
  onNames: (n: string[]) => void;
  /** Your custom photo avatar (profiles.photos[0]); falls back to initials. */
  photoUrl?: string | null;
  onStart: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const broke = balance < bet;
  const modeMeta = MODE_CARDS.find((m) => m.id === mode)!;

  const setName = (i: number, value: string): void => {
    const next = [...names];
    next[i] = value.slice(0, 12);
    onNames(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/3 p-4 backdrop-blur-xl sm:p-5"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-600 text-3xl shadow-[0_8px_24px_rgba(249,115,22,.45)]">
          🎲
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black leading-tight text-white">Ludo Superstar</h2>
          <p className="text-xs font-semibold text-white/55">
            Classic board · roll a 6 to leave base · exact finish
          </p>
        </div>
      </div>

      <StepDots step={step} onBack={setStep} />

      {step === 1 ? (
        <>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white/45">
            Step 1 · Select mode
          </p>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MODE_CARDS.map((m) => (
              <ModeCard
                key={m.id}
                active={mode === m.id}
                onClick={() => onMode(m.id)}
                icon={m.icon}
                title={m.title}
                sub={m.sub}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(249,115,22,.45)] ring-1 ring-white/25 transition active:scale-[.98]"
          >
            Continue · {modeMeta.title}
          </button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white/45">
            Step 2 · Select stake
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {BETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onBet(b)}
                aria-pressed={bet === b}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-black transition active:scale-95 ${
                  bet === b
                    ? "border-amber-300/70 bg-amber-400/15 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,.3)]"
                    : "border-white/12 bg-white/6 text-white/70 hover:bg-white/10"
                }`}
              >
                {b.toLocaleString("en-US")} 🪙
              </button>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-300/25 bg-amber-400/10 px-3 py-2">
            <span className="text-[11px] font-bold text-amber-100/80">
              {players} players · winner takes the pot
            </span>
            <span className="flex items-center gap-1 text-sm font-black text-amber-300">
              <Coins className="h-4 w-4" />
              {pot.toLocaleString("en-US")}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-black text-white/85 transition hover:bg-white/12 active:scale-[.98]"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={broke}
              className="flex-1 rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(249,115,22,.45)] ring-1 ring-white/25 transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue · {bet.toLocaleString("en-US")} 🪙
            </button>
          </div>
          {broke ? (
            <p className="mt-2 text-center text-[10px] font-bold text-rose-400">
              Not enough coins — go back and pick a smaller stake.
            </p>
          ) : null}
        </>
      ) : null}

      {step === 3 ? (
        <>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white/45">
            Step 3 · Start match
          </p>
          <div className="mb-3 space-y-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/55">Mode</span>
              <span className="font-black text-white">
                {modeMeta.title} · {players} players
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/55">Stake</span>
              <span className="font-black text-white">{bet.toLocaleString("en-US")} 🪙</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/55">Pot to winner</span>
              <span className="font-black text-amber-300">{pot.toLocaleString("en-US")} 🪙</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/55">Your balance</span>
              <span className="font-black text-white">{balance.toLocaleString("en-US")} 🪙</span>
            </div>
          </div>

          {mode === "friends" ? (
            <div className="mb-3 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">
                Name the friends joining you
              </p>
              <div className="flex items-center gap-2">
                <Avatar name={names[0] ?? "You"} src={photoUrl} size="sm" />
                <span className="text-xs font-bold text-white/75">You (seat 1)</span>
              </div>
              {[1, 2, 3].map((i) => (
                <label key={i} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-[3px]"
                    style={{ background: ["#3b82f6", "#eab308", "#22c55e"][i - 1] }}
                    aria-hidden
                  />
                  <span className="sr-only">{`Seat ${i + 1} player name`}</span>
                  <input
                    value={names[i] ?? ""}
                    onChange={(e) => setName(i, e.target.value)}
                    placeholder={`Friend in seat ${i + 1}`}
                    maxLength={12}
                    className="min-w-0 flex-1 rounded-xl border border-white/12 bg-white/6 px-2.5 py-1.5 text-xs font-bold text-white placeholder:text-white/30 focus:border-amber-300/60 focus:outline-none"
                  />
                </label>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1 rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-black text-white/85 transition hover:bg-white/12 active:scale-[.98]"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={onStart}
              disabled={broke}
              className="flex-1 rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(249,115,22,.45)] ring-1 ring-white/25 transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start match · {bet.toLocaleString("en-US")} 🪙
            </button>
          </div>
          <p
            className={`mt-2 text-center text-[10px] ${
              broke ? "font-bold text-rose-400" : "text-white/45"
            }`}
          >
            {broke
              ? "Not enough coins — pick a smaller stake."
              : `Balance ${balance.toLocaleString("en-US")} · stake deducted at kickoff · pot ${pot.toLocaleString("en-US")} to the winner`}
          </p>
        </>
      ) : null}
    </motion.div>
  );
}

export function LudoWinScreen({
  winnerName,
  youWon,
  pot,
  onAgain,
  onExit,
}: {
  winnerName: string;
  youWon: boolean;
  pot: number;
  onAgain: () => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 grid place-items-center rounded-3xl bg-slate-950/80 p-5 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="w-full max-w-xs rounded-3xl border border-white/15 bg-gradient-to-b from-white/12 to-white/4 p-5 text-center shadow-2xl"
      >
        <div
          className={`mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full ${
            youWon
              ? "bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_0_32px_rgba(251,191,36,.6)]"
              : "bg-white/10"
          }`}
        >
          <Trophy className={`h-8 w-8 ${youWon ? "text-white" : "text-white/50"}`} />
        </div>
        <h3 className="text-xl font-black text-white">
          {youWon ? "You win!" : `${winnerName} wins!`}
        </h3>
        <p className="mt-1 text-sm font-bold">
          {youWon ? (
            <span className="text-amber-300">+{pot.toLocaleString("en-US")} coins</span>
          ) : (
            <span className="text-white/55">Stake lost — rematch?</span>
          )}
        </p>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onAgain}
            className="w-full rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_6px_18px_rgba(249,115,22,.45)] ring-1 ring-white/25 transition active:scale-[.98]"
          >
            Play again
          </button>
          <button
            type="button"
            onClick={onExit}
            className="w-full rounded-2xl border border-white/15 bg-white/8 py-3 text-sm font-black text-white/85 transition hover:bg-white/12 active:scale-[.98]"
          >
            Back to games
          </button>
        </div>
      </motion.div>
    </div>
  );
}

