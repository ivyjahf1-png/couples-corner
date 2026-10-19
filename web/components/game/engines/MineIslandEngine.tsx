"use client";

import {{ useState }} from "react";

/**
 * Mine Island 5D engine.
 *
 * CORE LOOP
 *   1. Player places a bet from a 50-5,000 coin slider (staked immediately).
 *   2. Game presents a row of ~6-10 floating islands across a 5D water plane.
 *   3. Click an island to HOP: if safe you advance, multiplier ticks up.
 *   4. Cash out anytime to bank the current stack = bet x multiplier.
 *   5. Land on a mine or fail a hard hop => bet lost.
 *
 * DIFFICULTY (Easy/Medium/Hard): retryPct 10/6/2; max 12/30/50.
 */

export type Diff = "easy" | "medium" | "hard";
export type GamePhase = "idle" | "playing" | "cashed" | "lost";

const DIFFICULTY: Record<Diff, { label: string; max: number; retryPct: number }> = {
  easy: { label: "Easy", max: 12, retryPct: 10 },
  medium: { label: "Medium", max: 30, retryPct: 6 },
  hard: { label: "Hard", max: 50, retryPct: 2 },
};


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
  const [retryBag, setRetryBag] = useState<number[]>([]);



  const pick = (idx: number) => {
    if (phase !== "playing") return;
    const { max, retryPct } = DIFFICULTY[diff];
    const isLast = idx === islands - 1;
    const isMine = !isLast && ((hops + idx) % max === 0);
    const isRetryBag = retryBag.includes(idx);
    const isSpring = isLast && multiplier <= 0.5;

    if (isMine) {
      setPhase("lost");
      setLast("BOOM! You sank a mine.");
      onLose(bet);
      return;
    }

    if (isRetryBag) {
      const roll = Math.random() * 100;
      if (roll > retryPct) {
        setMultiplier((m) => Math.min(max, m + 1));
        setHops((h) => h + 1);
        setRetryBag((r) => r.filter((x) => x !== idx));
        setLast("Scraped through!");
        return;
      }
      setPhase("lost");
      setLast("You slipped off the island.");
      onLose(bet);
      return;
    }

    if (isSpring) {
      setMultiplier((m) => Math.min(max, m + 1));
      setHops((h) => h + 1);
      setLast("Spring! +1.5x");
      return;
    }

    const roll = Math.random() * 100;
    if (roll > 30) {
      setMultiplier((m) => Math.min(max, m + 1));
      setHops((h) => h + 1);
      setLast("Safe hop!");
    } else {
      setPhase("lost");
      setLast("You fell into the current.");
      onLose(bet);
    }
  };

  const cash = () => {
    if (phase !== "playing") return;
    const win = Math.round((bet * multiplier) / 100) * 100;
    setPhase("cashed");
    setLast("Cashed " + win.toLocaleString() + " coins");
    onWin(win);
  };

  const retry = () => {
    if (phase !== "lost") return;
    onWin(0);
    setPhase("idle");
    setLast(null);
  };

  const str =
    phase === "playing" || phase === "cashed" || phase === "lost"
      ? last ?? ""
      : phase === "idle"
        ? "Bet " + bet.toLocaleString() + " | " + DIFFICULTY[diff].label + " | " + islands + " islands"
        : "-";

  const reset = (newBet: number, newDiff: Diff) => {
    const { max } = DIFFICULTY[newDiff];
    const n = Math.min(6, Math.max(4, Math.floor(max / 2) + 2));
    setBet(newBet);
    setDiff(newDiff);
    setIslands(n);
    setHops(0);
    setMultiplier(1);
    setCurrentStack(0);
    setLast(null);
    setRetryBag([]);
    setPhase("playing");
  };

  const [islands, setIslands] = useState(6);

  const onBetChange = (v: number) => {
    setBet(v);
    if (phase === "idle") reset(v, diff);
  };

  const onDiffChange = (d: Diff) => {
    if (phase !== "idle") return;
    reset(bet, d);
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
          {phase === "playing" && " | " + multiplier + "x"}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {(["easy", "medium", "hard"] as Diff[]).map((d) => (
          <button
            key={d}
            type="button"
            disabled={phase !== "idle"}
            onClick={() => onDiffChange(d)}
            className={`rounded-full px-3 py-1 text-xs font-black transition ` + (diff === d ? "bg-amber-400 text-black" : "bg-white/10 text-white/70 hover:bg-white/20")}
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
            const isMine = !isLast && ((hops + i) % Math.max(6, DIFFICULTY[diff].max) === 0);
            const isRetryBag = retryBag.includes(i);
            const isSpring = isLast && multiplier <= 0.5;
            const isActive = phase === "playing" && !isMine && !isRetryBag && !isSpring;

            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                disabled={!isActive}
                className={
                  (isMine ? "bg-red-500/20 text-red-300 ring-2 ring-red-400/40 " :
                  isSpring ? "bg-amber-400/20 text-amber-200 ring-2 ring-amber-400/40 " :
                  isRetryBag ? "bg-white/10 text-white/40 " :
                  isLast ? "bg-emerald-400/20 text-emerald-200 ring-2 ring-emerald-400/40 " :
                  "bg-sky-400/20 text-sky-200 ring-2 ring-sky-400/40 ") +
                  "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black transition active:scale-95"
                }
                title={isMine ? "Mine!" : isSpring ? "Lucky spring" : "Hop " + (i + 1)}
              >
                {isMine ? "MINE" : isSpring ? "SPRING" : isRetryBag ? "RETRY" : isLast ? "STAR" : "ISLAND"}
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
      {phase === "lost" && (
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

