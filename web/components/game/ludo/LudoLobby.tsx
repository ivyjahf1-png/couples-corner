"use client";
import { motion } from "framer-motion";
import { Coins, Cpu, Trophy, Users } from "lucide-react";
import { BETS } from "@/lib/ludo/match";

/**
 * LudoLobby — the pre-match screen (mode + stake selection) and the end-of-
 * match win/lose overlay. Modes: Pass-and-Play (all four seats hot-seated on
 * one device) vs Computer (you are seat 0, three bots).
 */
export type LudoMode = "pass" | "cpu";

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

export function LudoLobby({
  balance,
  bet,
  onBet,
  mode,
  onMode,
  pot,
  onStart,
}: {
  balance: number;
  bet: number;
  onBet: (b: number) => void;
  mode: LudoMode;
  onMode: (m: LudoMode) => void;
  pot: number;
  onStart: () => void;
}) {
  const broke = balance < bet;
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
          <p className="text-xs font-semibold text-white/55">Classic 3D board · 4 players · exact finish</p>
        </div>
      </div>

      <p className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white/45">Game mode</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <ModeCard
          active={mode === "pass"}
          onClick={() => onMode("pass")}
          icon={<Users className="h-4 w-4" />}
          title="Pass & Play"
          sub="All 4 seats, one device"
        />
        <ModeCard
          active={mode === "cpu"}
          onClick={() => onMode("cpu")}
          icon={<Cpu className="h-4 w-4" />}
          title="vs Computer"
          sub="Beat Tunde, Aisha & David"
        />
      </div>

      <p className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white/45">Stake</p>
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
        <span className="text-[11px] font-bold text-amber-100/80">Winner takes the pot</span>
        <span className="flex items-center gap-1 text-sm font-black text-amber-300">
          <Coins className="h-4 w-4" />
          {pot.toLocaleString("en-US")}
        </span>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={broke}
        className="w-full rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(249,115,22,.45)] ring-1 ring-white/25 transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start match · {bet.toLocaleString("en-US")} 🪙
      </button>
      <p className={`mt-2 text-center text-[10px] ${broke ? "font-bold text-rose-400" : "text-white/45"}`}>
        {broke
          ? "Not enough coins — pick a smaller stake."
          : `Balance ${balance.toLocaleString("en-US")} · stake deducted at kickoff · pot ${pot.toLocaleString("en-US")} to the winner`}
      </p>
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
        <h3 className="text-xl font-black text-white">{youWon ? "You win!" : `${winnerName} wins!`}</h3>
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