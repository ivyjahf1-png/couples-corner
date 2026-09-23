"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Cell = "X" | "O" | null;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winnerOf(board: Cell[]): Cell {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

/** Minimax-lite bot: win > block > center > corner > side. */
function botPick(board: Cell[]): number {
  const empty = board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  for (const i of empty) {
    const trial = [...board];
    trial[i] = "O";
    if (winnerOf(trial) === "O") return i;
  }
  for (const i of empty) {
    const trial = [...board];
    trial[i] = "X";
    if (winnerOf(trial) === "X") return i;
  }
  if (board[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

/**
 * Tic Tac Toe Duet — you are X vs the bot (O).
 * Win = three in a row. Full touch + keyboard support.
 */
export function TicTacToeGame({
  muted,
  onGameOver,
}: {
  muted: boolean;
  onGameOver: (won: boolean) => void;
}) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [result, setResult] = useState<string | null>(null);
  const reportedRef = useRef(false);

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

  useEffect(() => {
    const w = winnerOf(board);
    const full = board.every((c) => c !== null);
    if ((w || full) && !reportedRef.current) {
      reportedRef.current = true;
      if (w === "X") {
        setResult("🏆 You win — three in a row!");
        blip(880);
      } else if (w === "O") {
        setResult("🤖 Bot wins this round.");
        blip(220);
      } else {
        setResult("🤝 Draw — nobody takes it.");
        blip(440);
      }
      const t = window.setTimeout(() => onGameOver(w === "X"), 900);
      return () => window.clearTimeout(t);
    }
  }, [board, onGameOver, blip]);

  useEffect(() => {
    if (turn !== "O" || result) return;
    if (winnerOf(board) || board.every((c) => c !== null)) return;
    const id = window.setTimeout(() => {
      setBoard((prev) => {
        if (winnerOf(prev)) return prev;
        const pick = botPick(prev);
        const next = [...prev];
        next[pick] = "O";
        return next;
      });
      blip(330);
      setTurn("X");
    }, 650);
    return () => window.clearTimeout(id);
  }, [turn, board, result, blip]);

  const play = useCallback(
    (i: number) => {
      if (turn !== "X" || result || board[i] !== null) return;
      blip(520);
      setBoard((prev) => {
        const next = [...prev];
        next[i] = "X";
        return next;
      });
      setTurn("O");
    },
    [turn, result, board, blip]
  );

  const restart = useCallback(() => {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setResult(null);
    reportedRef.current = false;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold" aria-live="polite">
          {result ?? (turn === "X" ? "❌ Your move" : "⭕ Bot thinking…")}
        </span>
        <button
          type="button"
          onClick={restart}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-white/90 transition hover:border-orange-400/60 hover:text-orange-200"
        >
          ↻ Restart
        </button>
      </div>
      <div
        className="grid w-full max-w-sm grid-cols-3 gap-2 sm:gap-3"
        role="grid"
        aria-label="Tic tac toe board"
      >
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            role="gridcell"
            aria-label={cell ? `Cell ${i + 1}: ${cell}` : `Empty cell ${i + 1}`}
            onClick={() => play(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                play(i);
              }
            }}
            disabled={cell !== null || turn !== "X" || result !== null}
            className="flex aspect-square min-h-[88px] touch-manipulation items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-5xl font-extrabold transition active:scale-95 hover:border-orange-400/50 disabled:cursor-default disabled:opacity-90"
          >
            <span aria-hidden="true" className={cell === "X" ? "text-rose-300" : "text-sky-300"}>
              {cell === "X" ? "❌" : cell === "O" ? "⭕" : ""}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-white/50">You are ❌. Tap any empty square — bot replies as ⭕.</p>
    </div>
  );
}
