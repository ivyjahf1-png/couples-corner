"use client";
import { useState } from "react";

export function CardsEngine({
  balance,
  onWin,
  onLose,
}: {
  balance?: number;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const [msg, setMsg] = useState("Pick Dragon or Tiger (100 coins).");
  const [last, setLast] = useState<[number, number] | null>(null);
  function play(pick: "dragon" | "tiger") {
    onLose(100);
    const d = 1 + Math.floor(Math.random() * 13);
    const t = 1 + Math.floor(Math.random() * 13);
    setLast([d, t]);
    const winner = d === t ? "tie" : d > t ? "dragon" : "tiger";
    if (winner === pick) {
      onWin(190);
      setMsg(`You win! D:${d} T:${t} +190 coins`);
    } else if (winner === "tie") {
      onWin(100);
      setMsg(`Tie! D:${d} T:${t} refunded`);
    } else setMsg(`You lose. D:${d} T:${t}`);
  }
  return (
    <div className="rounded-2xl bg-black/40 p-4 text-center">
      <div className="flex justify-center gap-3">
        <div className="rounded-xl border border-red-400/40 bg-red-500/20 px-6 py-4">
          <p className="text-xs font-bold text-red-300">DRAGON</p>
          <p className="text-3xl font-black text-white">{last ? last[0] : "?"}</p>
        </div>
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/20 px-6 py-4">
          <p className="text-xs font-bold text-amber-300">TIGER</p>
          <p className="text-3xl font-black text-white">{last ? last[1] : "?"}</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-bold text-white">{msg}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => play("dragon")}
          className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-black text-white"
        >
          DRAGON
        </button>
        <button
          type="button"
          onClick={() => play("tiger")}
          className="flex-1 rounded-full bg-amber-400 py-2.5 text-sm font-black text-black"
        >
          TIGER
        </button>
      </div>
    </div>
  );
}

export function SportsEngine({
  balance,
  onWin,
  onLose,
}: {
  balance?: number;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const [msg, setMsg] = useState("Pick a corner and shoot (100 coins).");
  function shoot(pick: number) {
    onLose(100);
    const keeper = Math.floor(Math.random() * 3);
    if (pick === keeper) setMsg("Saved by the keeper!");
    else {
      onWin(190);
      setMsg("GOAL! +190 coins");
    }
  }
  return (
    <div className="rounded-2xl bg-black/40 p-4 text-center">
      <p className="text-4xl">🥅</p>
      <p className="mt-2 text-sm font-bold text-white">{msg}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["Left", "Center", "Right"].map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => shoot(i)}
            className="rounded-xl bg-emerald-500 py-3 text-sm font-black text-black"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ArcadeEngine({
  balance,
  onWin,
  onLose,
}: {
  balance?: number;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const [msg, setMsg] = useState("Cast your net (100 coins).");
  function fish() {
    onLose(100);
    const roll = Math.random();
    if (roll > 0.7) {
      const w = 200 + Math.floor(Math.random() * 600);
      onWin(w);
      setMsg(`Big catch! +${w} coins`);
    } else if (roll > 0.4) {
      onWin(140);
      setMsg("Nice fish! +140 coins");
    } else setMsg("It got away...");
  }
  return (
    <div className="rounded-2xl bg-black/40 p-6 text-center">
      <p className="text-5xl">🎣</p>
      <p className="mt-2 text-sm font-bold text-white">{msg}</p>
      <button
        type="button"
        onClick={fish}
        className="mt-3 rounded-full bg-sky-400 px-8 py-2.5 text-sm font-black text-black"
      >
        CAST NET · 100
      </button>
    </div>
  );
}