"use client";
import { useCallback, useEffect, useRef, useState } from "react";
type Dir = "up" | "down" | "left" | "right";
function spawn(b: number[]): number[] {
  const e = b.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (e.length === 0) return b;
  const n = [...b]; n[e[Math.floor(Math.random() * e.length)]] = Math.random() < 0.9 ? 2 : 4;
  return n;
}
function slideRow(row: number[]): { row: number[]; gained: number } {
  const nz = row.filter((v) => v !== 0); const out: number[] = []; let gained = 0;
  for (let i = 0; i < nz.length; i++) {
    if (i + 1 < nz.length && nz[i] === nz[i + 1]) { out.push(nz[i] * 2); gained += nz[i] * 2; i++; }
    else out.push(nz[i]);
  }
  while (out.length < 4) out.push(0);
  return { row: out, gained };
}
function slide(board: number[], dir: Dir): { board: number[]; gained: number; moved: boolean } {
  const grid = [board.slice(0, 4), board.slice(4, 8), board.slice(8, 12), board.slice(12, 16)];
  const rot = (m: number[][]) => m[0].map((_, i) => m.map((r) => r[i]).reverse());
  const turns = dir === "left" ? 0 : dir === "up" ? 3 : dir === "right" ? 2 : 1;
  let m = grid;
  for (let i = 0; i < turns; i++) m = rot(m);
  let gained = 0;
  const moved2 = m.map((r) => { const s = slideRow(r); gained += s.gained; return s.row; });
  let back = moved2;
  for (let i = 0; i < (4 - turns) % 4; i++) back = rot(back);
  const flat = back.flat();
  return { board: flat, gained, moved: flat.some((v, i) => v !== board[i]) };
}
function canMove(b: number[]): boolean {
  if (b.includes(0)) return true;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const v = b[r * 4 + c];
    if (c < 3 && b[r * 4 + c + 1] === v) return true;
    if (r < 3 && b[(r + 1) * 4 + c] === v) return true;
  }
  return false;
}
export function SlideGame({ onGameOver }: { muted: boolean; onGameOver: (won: boolean) => void }) {
  const [tiles, setTiles] = useState<number[]>(() => spawn(spawn(Array(16).fill(0))));
  const [score, setScore] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const reportedRef = useRef(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (done !== null) return;
    if (tiles.includes(128)) {
      setDone("Reached 128 - you win!");
      if (!reportedRef.current) { reportedRef.current = true; window.setTimeout(() => onGameOver(true), 900); }
    } else if (!canMove(tiles)) {
      setDone("Board locked - try again!");
      if (!reportedRef.current) { reportedRef.current = true; window.setTimeout(() => onGameOver(false), 900); }
    }
  }, [tiles, done, onGameOver]);
  const move = useCallback((dir: Dir) => {
    if (done !== null) return;
    const r = slide(tiles, dir);
    if (!r.moved) return;
    setScore((s) => s + r.gained);
    setTiles(spawn(r.board));
  }, [done, tiles]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); move("up"); }
      else if (e.key === "ArrowDown") { e.preventDefault(); move("down"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); move("left"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); move("right"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);
  const restart = useCallback(() => {
    setTiles(spawn(spawn(Array(16).fill(0)))); setScore(0); setDone(null); reportedRef.current = false;
  }, []);
  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold" aria-live="polite">Score {score}</span>
        <button type="button" onClick={restart} className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-semibold hover:border-orange-400/60">Restart</button>
      </div>
      {done ? (<p role="status" className="font-bold">{done}</p>) : null}
      <div className="grid w-full max-w-sm touch-manipulation grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2"
        role="grid" aria-label="Slide board"
        onTouchStart={(e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          const t = touchRef.current; touchRef.current = null; if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x; const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
          move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
        }}>
        {tiles.map((v, i) => (
          <div key={i} role="gridcell" aria-label={v === 0 ? "Empty" : `Tile ${v}`}
            className={`flex aspect-square items-center justify-center rounded-xl text-xl font-extrabold ${v === 0 ? "bg-white/5" : v >= 64 ? "bg-orange-500 text-white" : v >= 16 ? "bg-amber-400/80 text-slate-900" : "bg-white/15"}`}>{v === 0 ? "" : v}</div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:hidden" aria-label="Move controls">
        <span /><button type="button" aria-label="Up" onClick={() => move("up")} className="min-h-[48px] rounded-xl border border-white/15 bg-white/5 px-5 text-xl">Up</button><span />
        <button type="button" aria-label="Left" onClick={() => move("left")} className="min-h-[48px] rounded-xl border border-white/15 bg-white/5 px-5 text-xl">Left</button>
        <button type="button" aria-label="Down" onClick={() => move("down")} className="min-h-[48px] rounded-xl border border-white/15 bg-white/5 px-5 text-xl">Down</button>
        <button type="button" aria-label="Right" onClick={() => move("right")} className="min-h-[48px] rounded-xl border border-white/15 bg-white/5 px-5 text-xl">Right</button>
      </div>
      <p className="text-xs text-white/50">Swipe, arrow keys, or pad. Reach 128 to win.</p>
    </div>
  );
}

