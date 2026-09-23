"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const EMOJI = ["💞", "🌹", "💍", "🕊️", "🍷", "🌙", "⭐", "🎶"];

function shuffledPairs(): string[] {
  const deck = [...EMOJI, ...EMOJI];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Memory Match Hearts — flip pairs against the clock.
 * Win = clear the board in ≤ 40 moves. Touch + mouse + keyboard accessible.
 */
export function MemoryMatchGame({
  muted,
  onGameOver,
}: {
  muted: boolean;
  onGameOver: (won: boolean) => void;
}) {
  const [deck, setDeck] = useState<string[]>(() => shuffledPairs());
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [done, setDone] = useState<boolean | null>(null);

  const blip = useCallback(
    (freq: number) => {
      if (muted) return;
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
        osc.onended = () => void ctx.close();
      } catch {
        /* best-effort */
      }
    },
    [muted]
  );

  const flip = useCallback(
    (index: number) => {
      if (lock || done !== null) return;
      if (open.includes(index) || matched.has(index)) return;
      blip(520);
      const next = [...open, index];
      setOpen(next);
      if (next.length === 2) {
        setMoves((m) => m + 1);
        setLock(true);
        const [a, b] = next;
        window.setTimeout(() => {
          if (deck[a] === deck[b]) {
            blip(760);
            setMatched((prev) => new Set(prev).add(a).add(b));
          }
          setOpen([]);
          setLock(false);
        }, 550);
      }
    },
    [lock, done, open, matched, deck, blip]
  );

  useEffect(() => {
    if (matched.size === deck.length && done === null) {
      const won = moves <= 40;
      setDone(won);
      blip(won ? 880 : 220);
      const t = window.setTimeout(() => onGameOver(won), 900);
      return () => window.clearTimeout(t);
    }
  }, [matched, deck.length, moves, done, onGameOver, blip]);

  const restart = useCallback(() => {
    setDeck(shuffledPairs());
    setOpen([]);
    setMatched(new Set());
    setMoves(0);
    setLock(false);
    setDone(null);
  }, []);

  const progress = useMemo(() => Math.round((matched.size / deck.length) * 100), [matched, deck]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
      <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold" aria-live="polite">
          💞 {matched.size / 2}/{deck.length / 2} pairs · {moves} moves
        </span>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/70">
          {progress}% cleared
        </span>
        <button
          type="button"
          onClick={restart}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-white/90 transition hover:border-orange-400/60 hover:text-orange-200"
        >
          ↻ Restart
        </button>
      </div>
      {done !== null ? (
        <p role="status" className="text-base font-bold text-white">
          {done ? "🏆 All pairs found — you win!" : "💔 Out of moves — try again!"}
        </p>
      ) : null}
      <div
        className="grid w-full max-w-xl grid-cols-4 gap-2 sm:gap-3"
        role="grid"
        aria-label="Memory match board"
      >
        {deck.map((card, i) => {
          const faceUp = open.includes(i) || matched.has(i);
          const isMatched = matched.has(i);
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={faceUp ? `Card ${card}` : `Hidden card ${i + 1}`}
              onClick={() => flip(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  flip(i);
                }
              }}
              className={`flex aspect-square min-h-[64px] touch-manipulation items-center justify-center rounded-2xl border text-3xl transition active:scale-95 sm:text-4xl ${
                isMatched
                  ? "border-emerald-400/50 bg-emerald-500/15"
                  : faceUp
                    ? "border-orange-400/60 bg-white/15"
                    : "border-white/10 bg-gradient-to-br from-slate-700 to-slate-900 hover:border-orange-400/50"
              }`}
            >
              <span aria-hidden="true">{faceUp ? card : "💝"}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-white/50">Tap a card to flip it. Clear all 8 pairs in 40 moves or fewer.</p>
    </div>
  );
}
