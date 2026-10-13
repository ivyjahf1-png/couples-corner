"use client";
import { useMemo, useState } from "react";

export function MinesEngine({ onWin, onLose }: { onWin: (n: number) => void; onLose: (n: number) => void }) {
  const mines = useMemo(() => {
    const s = new Set<number>();
    while (s.size < 5) s.add(Math.floor(Math.random() * 25));
    return s;
  }, []);
  const [open, setOpen] = useState<number[]>([]);
  const [dead, setDead] = useState(false);
  function pick(i: number) {
    if (dead || open.includes(i)) return;
    if (mines.has(i)) { setDead(true); onLose(100); return; }
    if (open.length === 0) onLose(100);
    const n = [...open, i];
    setOpen(n);
  }
  function cash() {
    const win = 100 + open.length * 60;
    onWin(win);
    setOpen([]);
  }
  return (
    <div className="rounded-2xl bg-black/40 p-4">
      <p className="text-center text-sm font-bold text-white">{dead ? "BOOM! You hit a mine." : `Safe: ${open.length} — Cash out ${100 + open.length * 60}`}</p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {Array.from({ length: 25 }, (_, i) => {
          const isOpen = open.includes(i);
          const showMine = dead && mines.has(i);
          return (<button key={i} type="button" onClick={() => pick(i)} className={`flex h-12 items-center justify-center rounded-xl text-lg font-black ${isOpen ? "bg-emerald-400 text-black" : showMine ? "bg-red-500 text-white" : "bg-slate-700 text-white"}`}>{isOpen ? "★" : showMine ? "●" : "?"}</button>);
        })}
      </div>
      {!dead && open.length > 0 ? (<button type="button" onClick={cash} className="mt-3 w-full rounded-full bg-emerald-400 py-2.5 text-sm font-black text-black">CASH OUT</button>) : null}
      {dead ? (<button type="button" onClick={() => { setOpen([]); setDead(false); }} className="mt-3 w-full rounded-full bg-white/15 py-2.5 text-sm font-bold text-white">TRY AGAIN</button>) : null}
    </div>
  );
}
