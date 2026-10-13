"use client";
import { useState } from "react";

const COLORS = ["#E11D48", "#2563EB", "#16A34A", "#F59E0B"];

export function LudoEngine({ onWin, onLose }: { onWin: (n: number) => void; onLose: (n: number) => void }) {
  const [pos, setPos] = useState([0, 0, 0, 0]);
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState(6);
  const [msg, setMsg] = useState("You are RED. Roll to start (50 coins).");
  const [started, setStarted] = useState(false);
  function roll() {
    if (!started) { onLose(50); setStarted(true); }
    const d = 1 + Math.floor(Math.random() * 6);
    setDice(d);
    const me = 0;
    const active = turn === me;
    const p = [...pos];
    if (active) {
      p[me] = Math.min(57, p[me] + d);
      setPos(p);
      if (p[me] >= 57) { onWin(500); setMsg("You won the Ludo match! +500"); return; }
    } else {
      p[turn] = Math.min(57, p[turn] + d);
      setPos(p);
    }
    setTurn((turn + 1) % 4);
    setMsg(active ? `You moved ${d} steps.` : `Player ${turn + 1} moved ${d}.`);
  }
  return (
    <div className="rounded-2xl bg-black/40 p-4">
      <div className="grid grid-cols-2 gap-2">
        {pos.map((s, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center" style={{ borderTop: `4px solid ${COLORS[i]}` }}>
            <p className="text-xs font-bold text-white">{i === 0 ? "YOU (RED)" : `CPU ${i + 1}`}</p>
            <p className="text-2xl font-black text-white">{s}/57</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-2xl font-black">{dice}</span>
        <button type="button" onClick={roll} className="rounded-full bg-rose-500 px-8 py-2.5 text-sm font-black text-white">ROLL</button>
      </div>
      <p className="mt-2 text-center text-xs font-bold text-white/80">{msg}</p>
    </div>
  );
}
