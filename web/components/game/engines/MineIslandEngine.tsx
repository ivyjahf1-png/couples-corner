"use client";

import { useState } from "react";

/**
 * Mine Island 5D engine.
 *
 * CORE LOOP
 *   1. Player places a bet from a 50-5,000 coin slider (staked immediately).
 *   2. Game presents a row of ~6-10 floating islands across a 5D water plane.
 *   3. Click an island to HOP: if it is safe you advance, the multiplier ticks up.
 *   4. Cash out anytime to bank the current stack = bet x multiplier.
 *   5. Land on a "mine" island or fail a hard hop => bet lost.
 *
 * DIFFICULTY TUNING (Easy / Medium / Hard)
 *   Easy    : 10% fail chance per hop; multiplier cap 12x.
 *   Medium  : 6% fail chance per hop; multiplier cap 30x.
 *   Hard    : 2% fail chance per hop; multiplier cap 50x.
 */

export type Diff = "easy" | "medium" | "hard";
export type GamePhase = "idle" | "playing" | "cashed" | "lost";

const DIFFICULTY: Record<
  Diff,
  { label: string; max: number; retryPct: number; islands: number; mines: number; step: number }
> = {
  easy: { label: "Easy", max: 12, retryPct: 10, islands: 6, mines: 1, step: 0.5 },
  medium: { label: "Medium", max: 30, retryPct: 6, islands: 8, mines: 2, step: 1 },
  hard: { label: "Hard", max: 50, retryPct: 2, islands: 10, mines: 3, step: 1.5 },
};

function rollMines(count: number, mineCount: number): number[] {
  const pool = Array.from({ length: Math.max(1, count - 1) }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(mineCount, pool.length)).sort((a, b) => a - b);
}


export function MineIslandEngine({
  onWin,
  onLose,
}: {
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const [bet, setBet] = useState(500);
  const [diff, setDiff] = useState<Diff>("easy");
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [hops, setHops] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [currentStack, setCurrentStack] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const [islands, setIslands] = useState<number>(DIFFICULTY.easy.islands);
  const [mines, setMines] = useState<number[]>([]);

  const startGame = (newBet: number, newDiff: Diff) => {
    const c = DIFFICULTY[newDiff];
    setBet(newBet);
    setDiff(newDiff);
    setIslands(c.islands);
    setMines(rollMines(c.islands, c.mines));
    setHops(0);
    setMultiplier(1);
    setCurrentStack(newBet);
    setLast(null);
    setPhase("playing");
  };

  const pick = (idx: number) => {
    if (phase !== "playing") return;
    const { max, retryPct, step } = DIFFICULTY[diff];

    if (mines.includes(idx)) {
      setPhase("lost");
      setLast("BOOM! You sank a mine.");
      onLose(bet);
      return;
    }

    const isLast = idx === islands - 1;
    const bonus = isLast ? step * 2 : step;

    const roll = Math.random() * 100;
    if (roll < retryPct) {
      setPhase("lost");
      setLast("You fell into the current.");
      onLose(bet);
      return;
    }

    const nextMult = Math.min(max, Math.round((multiplier + bonus) * 100) / 100);
    const nextStack = Math.round((bet * nextMult) / 10) * 10;
    setMultiplier(nextMult);
    setHops((h) => h + 1);
    setCurrentStack(nextStack);
    setLast(isLast ? `Star island! ${nextMult}x` : "Safe hop!");
  };

  const cash = () => {
    if (phase !== "playing") return;
    const win = Math.round((bet * multiplier) / 100) * 100;
    setPhase("cashed");
    setLast("Cashed " + win.toLocaleString() + " coins");
    onWin(win);
  };

  const retry = () => {
    if (phase !== "lost" && phase !== "cashed") return;
    setPhase("idle");
    setLast(null);
    setHops(0);
    setMultiplier(1);
    setCurrentStack(0);
    setMines([]);
  };

  const str =
    phase === "playing" || phase === "cashed" || phase === "lost"
      ? (last ?? "")
      : phase === "idle"
        ? "Bet " + bet.toLocaleString() + " | " + DIFFICULTY[diff].label + " | " + islands + " islands"
        : "-";

  const onBetChange = (v: number) => {
    setBet(v);
  };

  const onDiffChange = (d: Diff) => {
    if (phase !== "idle") return;
    setDiff(d);
    setIslands(DIFFICULTY[d].islands);
  };

  return (
    <div className="rounded-2xl bg-black/60 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-amber-300">
            {bet.toLocaleString()}
          </span>
          <span className="text-xs text-white/60">coins staked</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-black">
          {phase === "playing" ? "PLAYING" : phase === "cashed" ? "CASHED" : phase === "lost" ? "LOST" : "IDLE"}
          {phase === "playing" && " | " + multiplier + "x | " + hops + " hops"}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {(["easy", "medium", "hard"] as Diff[]).map((d) => (
          <button
            key={d}
            type="button"
            disabled={phase !== "idle"}
            onClick={() => onDiffChange(d)}
            className={`rounded-full px-3 py-1 text-xs font-black transition ${diff === d ? "bg-amber-400 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
          >
            {DIFFICULTY[d].label}
          </button>
        ))}
        <span className="text-xs text-white/60 ml-1">
          {islands} islands | {multiplier}x cap
        </span>
      </div>

      <div className="mt-3 flex justify-center">
        <div className="flex gap-2">
          {Array.from({ length: islands }, (_, i) => {
            const isLast = i === islands - 1;
            const isMine = mines.includes(i) && phase !== "playing";
            const isActive = phase === "playing";

            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                disabled={!isActive}
                className={
                  (isMine ? "bg-red-500/20 text-red-300 ring-2 ring-red-400/40 " :
                  isLast ? "bg-emerald-400/20 text-emerald-200 ring-2 ring-emerald-400/40 " :
                  "bg-sky-400/20 text-sky-200 ring-2 ring-sky-400/40 ") +
                  "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black transition active:scale-95"
                }
                title={isMine ? "Mine!" : isLast ? "Star island" : "Hop " + (i + 1)}
              >
                {isMine ? "MINE" : isLast ? "STAR" : "ISLAND"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-300"
          style={{ width: Math.round(((multiplier - 1) / (DIFFICULTY[diff].max - 1)) * 100) + "%" }}
        />
      </div>
      <p className="mt-1 text-center text-xs text-white/60">
        {multiplier}x | max {DIFFICULTY[diff].max}x
      </p>

      {phase === "idle" && (
        <div className="mt-3">
          <input
            type="range"
            min={50}
            max={5000}
            step={50}
            value={bet}
            onChange={(e) => onBetChange(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
          <div className="flex justify-between text-xs text-white/60">
            <span>50</span>
            <span>5,000</span>
          </div>
          <p className="text-right text-xs text-white/50">
            Staked <span className="font-black text-white">{bet.toLocaleString()}</span>
          </p>
          <button
            type="button"
            onClick={() => startGame(bet, diff)}
            className="mt-3 w-full rounded-full bg-amber-400 py-3 text-sm font-black text-black transition hover:bg-amber-300 active:scale-[0.98]"
          >
            START HOPPING
          </button>
        </div>
      )}

      {phase === "playing" && (
        <button
          type="button"
          onClick={cash}
          className="mt-3 w-full rounded-full bg-emerald-400 py-3 text-sm font-black text-black transition hover:bg-emerald-300 active:scale-[0.98]"
        >
          CASH OUT <span className="tabular-nums">{multiplier}x</span>
        </button>
      )}
      {(phase === "lost" || phase === "cashed") && (
        <button
          type="button"
          onClick={retry}
          className="mt-3 w-full rounded-full bg-white/15 py-3 text-sm font-black text-white transition hover:bg-white/25"
        >
          TRY AGAIN
        </button>
      )}

      <p className="mt-3 text-center text-sm font-black text-white">{str}</p>
      <p className="mt-1 text-right text-xs text-white/60">
        Stack {phase === "playing" ? <span className="font-black text-amber-200">{currentStack.toLocaleString()}</span> : null}
      </p>
    </div>
  );
}


