"use client";
import { useState } from "react";

export type SlotSym = { id: number; label: string; icon: string; color: string };

const SYMS: SlotSym[] = [
  { id: 0, label: "Ingot", icon: "◆", color: "#FFD700" },
  { id: 1, label: "Wild", icon: "W", color: "#FDE047" },
  { id: 2, label: "Orange", icon: "●", color: "#FB923C" },
  { id: 3, label: "Cracker", icon: "✸", color: "#EF4444" },
  { id: 4, label: "Bell", icon: "▲", color: "#60A5FA" },
];

function rollGrid(): number[][] {
  const g: number[][] = [];
  for (let c = 0; c < 5; c++) {
    const col: number[] = [];
    for (let r = 0; r < 3; r++) col.push(Math.floor(Math.random() * SYMS.length));
    g.push(col);
  }
  return g;
}

function midMatch(g: number[][]): number {
  const m = g.map((c) => c[1]);
  let run = 1;
  for (let i = 1; i < m.length; i++) {
    if (m[i] === m[0]) run++;
    else break;
  }
  return run;
}

export function SlotsEngine({ onWin }: { onWin: (m: number) => void }) {
  const [grid, setGrid] = useState<number[][]>([[0, 2, 1], [2, 2, 3], [1, 2, 0], [3, 2, 4], [0, 2, 2]]);
  const [bet, setBet] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [msg, setMsg] = useState("Match 3+ Oranges on the middle row. Win up to x1000!");
  const [last, setLast] = useState(0);

  function spin(turbo: boolean) {
    if (spinning) return;
    setSpinning(true);
    setMsg("Spinning...");
    let ticks = 0;
    const max = turbo ? 6 : 14;
    const iv = setInterval(() => {
      setGrid(rollGrid());
      ticks++;
      if (ticks >= max) {
        clearInterval(iv);
        const g = rollGrid();
        setGrid(g);
        const run = midMatch(g);
        const mult = run >= 5 ? 1000 : run === 4 ? 200 : run === 3 ? 50 : run === 2 ? 5 : 0;
        setLast(mult);
        if (mult > 0) {
          setMsg(run >= 5 ? "FORTUNE TIGER JACKPOT x1000!" : "Win x" + mult + " on payline 3!");
          onWin(mult);
        } else {
          setMsg("No win. Spin again!");
        }
        setSpinning(false);
      }
    }, turbo ? 60 : 110);
  }

  return (
    <div className="rounded-2xl border border-amber-300/30 bg-gradient-to-b from-red-950 to-black p-4">
      <div className="mb-3 text-center">
        <p className="text-4xl">🐯</p>
        <h3 className="text-xl font-black text-amber-300">FORTUNE TIGER</h3>
        <p className="text-xs font-black text-yellow-400">WIN UP TO x1000</p>
      </div>
      <div className="mb-2 flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n === 3 ? "rounded bg-amber-400 px-2 py-0.5 text-[10px] font-black text-black" : "rounded bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/60"}>{n}</span>
        ))}
      </div>
      <div className="mb-3 grid grid-cols-5 gap-1.5 rounded-xl border-2 border-amber-300/50 bg-black/60 p-2">
        {grid.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1.5">
            {col.map((s, ri) => (
              <div key={ri} className={ri === 1 ? "flex h-14 items-center justify-center rounded-lg border-2 border-amber-300 bg-gradient-to-b from-amber-900 to-black text-2xl font-black" : "flex h-14 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-2xl font-black"} style={{ color: SYMS[s].color }}>
                {SYMS[s].icon}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mb-3 flex items-center justify-center gap-2">
        <button onClick={() => setBet((b) => Math.max(10, b - 10))} className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">- BET</button>
        <span className="text-sm font-black text-amber-300">{bet}</span>
        <button onClick={() => setBet((b) => b + 10)} className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">+ BET</button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => spin(false)} disabled={spinning} className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{spinning ? "SPINNING" : "SPIN"}</button>
        <button onClick={() => spin(false)} disabled={spinning} className="rounded-full bg-purple-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">AUTO</button>
        <button onClick={() => spin(true)} disabled={spinning} className="rounded-full bg-yellow-500 px-4 py-2 text-xs font-black text-black disabled:opacity-50">TURBO</button>
      </div>
      <p className="mt-2 text-center text-xs text-white/70">{msg}{last > 0 ? " Last x" + last : ""}</p>
    </div>
  );
}
