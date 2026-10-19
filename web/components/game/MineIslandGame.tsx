"use client";

import { useState } from "react";
import { MineIslandEngine, type Diff, type GamePhase } from "./engines/MineIslandEngine";

const AVATARS = ["🦦", "🦀", "🐢"];

export function MineIslandGame({ winner, onPlay }: { winner: { name: string; src: string | null } | null; onPlay: () => void; }) {
  const [bet, setBet] = useState(500);
  const [diff, setDiff] = useState<Diff>("easy");
  const [enginePhase, setEnginePhase] = useState<GamePhase>("idle");
  const [engineLast, setEngineLast] = useState<string | null>(null);

  return (
    <div className="relative flex flex-col overflow-y-auto px-3 pt-2">
      {/* decorative water plane */}
      <div
        className="absolute inset-0 overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(180deg, #020617, #0ea5e9 40%, #020617)",
          boxShadow: "0 0 60px rgba(14,165,233,0.35)",
        }}
      >
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute left-0 right-0 h-full bg-gradient-to-b from-transparent via-white/40 to-transparent animate-pulse" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-3 pb-4">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏝</span>
            <span className="text-lg font-black text-white">Mine Island 5D</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Lv 1</span>
            <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-black text-amber-300">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
              x100
            </span>
          </div>
        </div>

        {/* bet slider */}
        <div className="rounded-2xl bg-black/50 p-3 backdrop-blur-sm">
          <div className="flex justify-between text-xs text-white/60">
            <span>50</span>
            <span className="text-white/40">bet</span>
            <span>5,000</span>
          </div>
          <input
            type="range"
            min={50}
            max={5000}
            step={50}
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            className="mt-1 w-full accent-amber-400"
          />
          <div className="flex justify-between text-sm">
            <span className="text-white/70">stake</span>
            <span className="font-black text-white">{bet.toLocaleString()} coins</span>
          </div>
        </div>

        {/* difficulty pills */}
        <div className="flex flex-wrap gap-2">
          {(["easy", "medium", "hard"] as Diff[]).map((d) => (
            <button
              key={d}
              type="button"
              disabled={enginePhase !== "idle"}
              onClick={() => { setDiff(d); setEnginePhase("idle"); setEngineLast(null); }}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${diff===d?"bg-amber-400 text-black":"bg-white/10 text-white/70 hover:bg-white/20"}`}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* island grid */}
        <div className="flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <button
                key={i}
                type="button"
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black transition active:scale-95 select-none"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  boxShadow: "0 0 12px rgba(255,255,255,0.12)",
                }}
              >
                🏝
              </button>
            ))}
          </div>
        </div>

        {/* action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { onPlay(); }}
            className="flex-1 rounded-full bg-amber-400 py-3 text-sm font-black text-black transition hover:bg-amber-300 active:scale-[0.98]"
          >
            💰 CASH OUT
          </button>
          <button
            type="button"
            onClick={() => { setEnginePhase("playing"); }}
            className="flex-1 rounded-full bg-white/10 py-3 text-sm font-black text-white transition hover:bg-white/20 active:scale-[0.98]"
          >
            HOP
          </button>
        </div>

        {/* message */}
        <p className="text-center text-sm font-black text-white">
          {engineLast ?? "Place your bet and hop the islands!"}
        </p>

        {/* stack */}
        <p className="text-right text-xs text-white/50">
          Stack <span className="font-black text-amber-200">{bet.toLocaleString()}</span>
        </p>
      </div>

      {/* avatar badge */}
      <div className="absolute -right-4 top-10 animate-bounce">
        <span className="text-4xl">{AVATARS[0]}</span>
      </div>

      {/* flag accessory */}
      <div className="absolute -left-4 top-12 animate-spin" style={{ animationDuration: "8s" }}>
        <span className="text-3xl">🇳🇬</span>
      </div>
    </div>
  );
}
