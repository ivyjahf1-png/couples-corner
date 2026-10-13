"use client";
import { useState } from "react";

export function SlotsEngine({ onWin, onLose }: { onWin: (n: number) => void; onLose: (n: number) => void }) {
  const [reels, setReels] = useState(["7", "7", "7"]);
  const [msg, setMsg] = useState("Tap SPIN (100 coins).");
  const SYMS = ["7", "T", "G", "S", "C"];
  function spin() {
    onLose(100);
    const r = [0, 1, 2].map(() => SYMS[Math.floor(Math.random() * SYMS.length)]!);
    setReels(r);
    if (r[0] === r[1] && r[1] === r[2]) {
      const win = r[0] === "7" ? 1000 : 400;
      onWin(win);
      setMsg(`JACKPOT! +${win} coins`);
    } else if (r[0] === r[1] || r[1] === r[2]) {
      onWin(150);
      setMsg("Small win! +150 coins");
    } else setMsg("No luck — spin again.");
  }
  return (
    <div className="rounded-2xl bg-black/40 p-4 text-center">
      <div className="flex justify-center gap-2 text-4xl font-black">
        {reels.map((s, i) => (<span key={i} className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-black">{s}</span>))}
      </div>
      <p className="mt-3 text-sm font-bold text-amber-300">{msg}</p>
      <button type="button" onClick={spin} className="mt-3 rounded-full bg-amber-400 px-8 py-2.5 text-sm font-black text-black">SPIN · 100</button>
    </div>
  );
}
