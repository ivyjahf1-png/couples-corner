"use client";
import { useCallback, useEffect, useRef, useState } from "react";
const SYMBOLS = ["💎", "⭐", "🔔", "🍒", "💞", "🎰"];
export function SlotsGame({ onGameOver }: { muted: boolean; onGameOver: (won: boolean) => void }) {
  const [reels, setReels] = useState(["💎", "⭐", "🍒"]);
  const [spinning, setSpinning] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(5);
  const [wins, setWins] = useState(0);
  const [msg, setMsg] = useState("Tap SPIN — 5 free spins, 2+ wins takes the prize.");
  const reportedRef = useRef(false);
  const spin = useCallback(() => {
    if (spinning || spinsLeft <= 0) return;
    setSpinning(true); setMsg("Spinning…");
    const ticks = 8; let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setReels([0, 1, 2].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]));
      if (n >= ticks) {
        window.clearInterval(id);
        const fin = [0, 1, 2].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        setReels(fin); setSpinning(false);
        setSpinsLeft((s) => s - 1);
        const uniq = new Set(fin).size;
        if (uniq === 1) { setWins((w) => w + 1); setMsg("JACKPOT! All three match."); }
        else if (uniq === 2) { setWins((w) => w + 1); setMsg("Nice — a pair pays!"); }
        else setMsg("No match — spin again.");
      }
    }, 110);
  }, [spinning, spinsLeft]);
  useEffect(() => {
    if (spinsLeft === 0 && !spinning && !reportedRef.current) {
      reportedRef.current = true;
      setMsg(wins >= 2 ? `You won with ${wins} hits!` : `Only ${wins} hits — better luck!`);
      window.setTimeout(() => onGameOver(wins >= 2), 1000);
    }
  }, [spinsLeft, spinning, wins, onGameOver]);
  const restart = useCallback(() => {
    setReels(["💎", "⭐", "🍒"]); setSpinning(false); setSpinsLeft(5); setWins(0);
    setMsg("Tap SPIN — 5 free spins, 2+ wins takes the prize."); reportedRef.current = false;
  }, []);
  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold" aria-live="polite">Spins {spinsLeft} · Wins {wins}</span>
        <button type="button" onClick={restart} className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-semibold hover:border-orange-400/60">Restart</button>
      </div>
      <div className="flex items-center gap-3 rounded-3xl border border-amber-400/30 bg-gradient-to-b from-slate-800 to-slate-950 p-6 shadow-2xl" role="img" aria-label={`Slots showing ${reels.join(" ")}`}>
        {reels.map((r, i) => (<span key={i} className={`flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-5xl ${spinning ? "animate-pulse" : ""}`}>{r}</span>))}
      </div>
      <p className="text-sm text-white/70" role="status">{msg}</p>
      <button type="button" onClick={spin} disabled={spinning || spinsLeft <= 0}
        className="min-h-[52px] touch-manipulation rounded-xl bg-[#FF5722] px-10 py-3 text-base font-bold shadow-xl active:scale-95 disabled:opacity-40">
        {spinning ? "Spinning…" : spinsLeft <= 0 ? "Done" : "SPIN"}
      </button>
      <p className="text-xs text-white/50">Pair or better counts as a win. Finish with 2+ wins in 5 spins.</p>
    </div>
  );
}
