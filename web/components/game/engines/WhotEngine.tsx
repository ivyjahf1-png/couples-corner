"use client";
import { useState } from "react";

type Card = { n: number; s: string };
const SUITS = ["*", "#", "O", "X", "W"];

function draw(): Card { return { n: 1 + Math.floor(Math.random() * 14), s: SUITS[Math.floor(Math.random() * SUITS.length)]! }; }

export function WhotEngine({ onWin, onLose }: { onWin: (n: number) => void; onLose: (n: number) => void }) {
  const [hand, setHand] = useState<Card[]>([draw(), draw(), draw(), draw(), draw()]);
  const [top, setTop] = useState<Card>(draw());
  const [msg, setMsg] = useState("Match number or suit. (50 coins entry)");
  const [started, setStarted] = useState(false);
  function play(i: number) {
    if (!started) { onLose(50); setStarted(true); }
    const c = hand[i]!;
    if (c.n === top.n || c.s === top.s || c.s === "W") {
      const rest = hand.filter((_, j) => j !== i);
      setHand(rest);
      setTop(c);
      if (rest.length === 0) { onWin(400); setMsg("WHOT! You cleared your hand! +400"); setHand([draw(), draw(), draw(), draw(), draw()]); }
      else setMsg(`Played ${c.n}${c.s}. CPU draws...`);
    } else setMsg(`Cannot play ${c.n}${c.s} on ${top.n}${top.s}.`);
  }
  return (
    <div className="rounded-2xl bg-black/40 p-4">
      <div className="mx-auto flex h-20 w-16 items-center justify-center rounded-xl bg-white text-lg font-black">{top.n}{top.s}</div>
      <p className="mt-2 text-center text-xs font-bold text-white/80">{msg}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {hand.map((c, i) => (
          <button key={i} type="button" onClick={() => play(i)} className="flex h-16 w-12 items-center justify-center rounded-lg bg-amber-100 text-sm font-black text-black">{c.n}{c.s}</button>
        ))}
      </div>
    </div>
  );
}
