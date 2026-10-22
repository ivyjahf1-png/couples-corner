"use client";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FINISH_STEP,
  trackCell,
  type LudoColor,
  type LudoGameState,
} from "@/lib/ludo/engine";

const GRID = 15;
// 0=Red(BL), 1=Blue(BR), 2=Yellow(TR), 3=Green(TL)
const COLORS = ["#E53935", "#1E88E5", "#FDD835", "#43A047"]; 
const HEX_DARK = ["#B71C1C", "#1565C0", "#F9A825", "#2E7D32"];

function colorOf(c: number) { return COLORS[c] || "#888"; }
function darkColorOf(c: number) { return HEX_DARK[c] || "#555"; }

// AAA STANDARD SEEDS
// Map these to your actual image paths in the public folder!
const SEED_IMAGES = [
  "/assets/red-soldier.png",
  "/assets/blue-drop.png",
  "/assets/yellow-castle.png",
  "/assets/green-disc.png"
];

// Exact clockwise pathway mapped to your screenshot
const TRACK_PATH: ReadonlyArray<readonly [number, number]> = [
  // Red (Bottom-Left) Start moving UP
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  // Turn LEFT
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  // Turn UP
  [0, 7], [0, 6],
  // Turn RIGHT
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
  // Turn UP
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  // Turn RIGHT
  [7, 0], [8, 0],
  // Turn DOWN
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6],
  // Turn RIGHT
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  // Turn DOWN
  [14, 7], [14, 8],
  // Turn LEFT
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 8],
  // Turn DOWN
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  // Turn LEFT
  [7, 14], [6, 14],
];

const BASE_QUAD: Record<number, readonly [number, number]> = {
  0: [0, 9],  // Red (Bottom-Left)
  1: [9, 9],  // Blue (Bottom-Right)
  2: [9, 0],  // Yellow (Top-Right)
  3: [0, 0],  // Green (Top-Left)
};

const BASE_SPOTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1.8, 10.8], [4.2, 10.8], [1.8, 13.2], [4.2, 13.2]],
  1: [[10.8, 10.8], [13.2, 10.8], [10.8, 13.2], [13.2, 13.2]],
  2: [[10.8, 1.8], [13.2, 1.8], [10.8, 4.2], [13.2, 4.2]],
  3: [[1.8, 1.8], [4.2, 1.8], [1.8, 4.2], [4.2, 4.2]],
};

const HOME_PATH: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Red
  1: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Blue
  2: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Yellow
  3: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Green
};

// Start indices and Safe Star indices based on the path
const START_SET = new Set([0, 14, 28, 42]);
const SAFE_STARS = new Set([8, 21, 34, 47]);

function posFor(color: number, tokenIdx: number, steps: number) {
  if (steps < 0) {
    const s = BASE_SPOTS[color][tokenIdx];
    return { x: s[0], y: s[1] };
  }
  if (steps <= 50) {
    const cell = trackCell(color as LudoColor, steps);
    if (!cell) return { x: 7.5, y: 7.5 };
    const n = TRACK_PATH.length;
    const c = TRACK_PATH[((cell % n) + n) % n];
    return { x: c[0] + 0.5, y: c[1] + 0.5 };
  }
  if (steps < FINISH_STEP) {
    const h = HOME_PATH[color][steps - 51];
    return { x: h[0] + 0.5, y: h[1] + 0.5 };
  }
  return { x: 7.5, y: 7.5 };
}

/* ═══════════════════════════════════════════════════════════════
   Dice Component
   ═══════════════════════════════════════════════════════════════ */

function Dice({ color, positionClass, value, isRolling, onRoll }: { color: string, positionClass: string, value: number, isRolling: boolean, onRoll?: () => void }) {
  const dots = useMemo(() => {
    const dot = "w-2.5 h-2.5 bg-gray-800 rounded-full shadow-inner";
    if (value === 1) return <div className={dot} />;
    if (value === 2) return <div className="grid grid-cols-2 gap-3"><div className={dot}/><div className={dot}/></div>;
    if (value === 3) return <div className="grid grid-cols-3 gap-1"><div className={dot}/><div className={dot}/><div className={dot}/></div>;
    if (value === 4) return <div className="grid grid-cols-2 gap-3"><div className={dot}/><div className={dot}/><div className={dot}/><div className={dot}/></div>;
    if (value === 5) return <div className="grid grid-cols-2 gap-3 relative"><div className={dot}/><div className={dot}/><div className={dot}/><div className={dot}/><div className={dot + " absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"}/></div>;
    return <div className="grid grid-cols-2 gap-3"><div className={dot}/><div className={dot}/><div className={dot}/><div className={dot}/><div className={dot}/><div className={dot}/></div>;
  }, [value]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className={"absolute z-50 cursor-pointer " + positionClass}
      onClick={onRoll}
      style={{ filter: "drop-shadow(0 0 15px " + color + ")" }}
    >
      <motion.div 
        className="w-14 h-14 bg-white rounded-xl border border-gray-300 shadow-xl flex items-center justify-center p-2 will-change-transform"
        animate={isRolling ? { rotate: [0, 360, 720], scale: [1, 1.2, 1] } : { rotate: 12, y: [0, -8, 0] }}
        transition={isRolling ? { duration: 1 } : { repeat: Infinity, duration: 2 }}
      >
        {dots}
      </motion.div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-md">
        Roll
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Board Surface (Memoized for Performance)
   ═══════════════════════════════════════════════════════════════ */

const BoardSurface = React.memo(() => {
  return (
    <svg viewBox="0 0 15 15" className="block h-full w-full drop-shadow-md bg-white rounded-lg p-1" role="img">
      {/* Center Triangles */}
      <g>
        <polygon points="6,6 9,6 7.5,7.5" fill={colorOf(2)} stroke="#222" strokeWidth="0.08" />
        <polygon points="9,6 9,9 7.5,7.5" fill={colorOf(1)} stroke="#222" strokeWidth="0.08" />
        <polygon points="6,9 9,9 7.5,7.5" fill={colorOf(0)} stroke="#222" strokeWidth="0.08" />
        <polygon points="6,6 6,9 7.5,7.5" fill={colorOf(3)} stroke="#222" strokeWidth="0.08" />
      </g>

      {/* Home Paths */}
      <g>
        {[0, 1, 2, 3].map((c) => (
          <g key={"home-" + c}>
            {HOME_PATH[c].map((cell, j) => (
              <rect key={"h-" + c + "-" + j} x={cell[0]} y={cell[1]} width={1} height={1} fill={colorOf(c)} stroke="#222" strokeWidth="0.05" />
            ))}
          </g>
        ))}
      </g>

      {/* Track Cells, Gates, Locks & Stars */}
      <g>
        {TRACK_PATH.map((cell, i) => {
          const col = cell[0];
          const row = cell[1];
          const isSafe = SAFE_STARS.has(i);
          const isStart = START_SET.has(i);
          
          let cellColor = "#FFFFFF";
          if (isStart) {
            if (i === 0) cellColor = colorOf(0);
            if (i === 14) cellColor = colorOf(1);
            if (i === 28) cellColor = colorOf(2);
            if (i === 42) cellColor = colorOf(3);
          }

          // Arrow Rotations (Pointing Clockwise)
          let rot = 0;
          if (i === 0) rot = 0;     // Red (up)
          if (i === 14) rot = 90;   // Green (right)
          if (i === 28) rot = 180;  // Yellow (down)
          if (i === 42) rot = 270;  // Blue (left)

          return (
            <g key={"trk-" + i}>
              <rect x={col} y={row} width={1} height={1} fill={cellColor} stroke="#222" strokeWidth="0.05" />
              
              {/* Safe Star */}
              {(isSafe || isStart) && (
                <path d={"M" + (col+0.5) + "," + (row+0.25) + " L" + (col+0.6) + "," + (row+0.45) + " L" + (col+0.8) + "," + (row+0.45) + " L" + (col+0.65) + "," + (row+0.6) + " L" + (col+0.7) + "," + (row+0.8) + " L" + (col+0.5) + "," + (row+0.7) + " L" + (col+0.3) + "," + (row+0.8) + " L" + (col+0.35) + "," + (row+0.6) + " L" + (col+0.2) + "," + (row+0.45) + " L" + (col+0.4) + "," + (row+0.45) + " Z"} fill={isStart ? "#FFF" : "#FFC107"} stroke="#222" strokeWidth="0.02" />
              )}
              
              {/* Gate Arrow & Lock */}
              {isStart && (
                <>
                  <path d={"M" + (col+0.5) + "," + (row+0.2) + " L" + (col+0.7) + "," + (row+0.5) + " L" + (col+0.3) + "," + (row+0.5) + " Z"} fill="#FFF" transform={"rotate(" + rot + "," + (col+0.5) + "," + (row+0.5) + ")"} />
                  <text x={col+0.5} y={row+0.9} fontSize="0.45" textAnchor="middle" fill="#222">🔒</text>
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* Base Quadrants */}
      <g>
        {[0, 1, 2, 3].map((c) => {
          const q = BASE_QUAD[c];
          const col = colorOf(c);
          return (
            <g key={"base-" + c}>
              <rect x={q[0] + 0.1} y={q[1] + 0.1} width={5.8} height={5.8} fill={col} rx="1.5" stroke="#222" strokeWidth="0.1" />
              <rect x={q[0] + 0.6} y={q[1] + 0.6} width={4.8} height={4.8} fill="#FFF" rx="1" stroke="#222" strokeWidth="0.05" />
              {BASE_SPOTS[c].map((spot, i) => (
                <g key={"spot-" + c + "-" + i}>
                  <circle cx={spot[0]} cy={spot[1] + 0.05} r={0.6} fill="rgba(0,0,0,0.15)" />
                  <circle cx={spot[0]} cy={spot[1]} r={0.6} fill="#FFF" stroke={darkColorOf(c)} strokeWidth="0.15" />
                </g>
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
});
BoardSurface.displayName = "BoardSurface";

/* ═══════════════════════════════════════════════════════════════
   Main Aero Board Component
   ═══════════════════════════════════════════════════════════════ */

interface Pawn {
  key: string;
  color: number;
  idx: number;
  steps: number;
  x: number;
  y: number;
  movable: boolean;
}

interface LudoBoardProps {
  state: LudoGameState;
  selectable: readonly number[];
  onSelect: (tokenIdx: number) => void;
  diceValue?: number;
  rolling?: boolean;
  onRoll?: () => void;
}

export function LudoBoard({ state, selectable, onSelect, diceValue, rolling, onRoll }: LudoBoardProps) {
  
  const pawns = useMemo(() => {
    const result: Pawn[] = [];
    const players = (state.players as unknown as ReadonlyArray<{ tokens: ReadonlyArray<{ steps: number }> }>) || [];
    
    players.forEach((p, c) => {
      if (!p || !Array.isArray(p.tokens)) return;
      p.tokens.forEach((t, i) => {
        if (t.steps >= FINISH_STEP) return;
        const pos = posFor(c, i, t.steps);
        result.push({
          key: c + "-" + i, color: c, idx: i, steps: t.steps,
          x: pos.x, y: pos.y,
          movable: c === Number(state.turn) && selectable.includes(i),
        });
      });
    });
    return result;
  }, [state, selectable]);

  const winnerVal = (state as unknown as { winner?: number | null }).winner;
  const activeSeat = winnerVal == null ? Number(state.turn) : null;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#2C2563] overflow-hidden font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#3b3283] to-[#1a153d] opacity-80 pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between p-3 pt-6 px-4">
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded bg-[#4a438a]/60 flex items-center justify-center text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
          <button className="w-8 h-8 rounded bg-[#4a438a]/60 flex items-center justify-center text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z"/></svg></button>
          <button className="w-8 h-8 rounded bg-[#4a438a]/60 flex items-center justify-center text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></button>
        </div>
        <div className="bg-[#4a438a]/60 px-6 py-1.5 rounded-md text-white font-bold text-sm border border-white/10">Aero</div>
        <div className="bg-black/40 rounded-full flex items-center gap-1 px-3 py-1 border border-white/10">
          <span className="text-cyan-400 text-lg leading-none">💎</span>
          <span className="text-white text-sm font-bold">0</span>
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-bold text-white ml-1">+</div>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="relative z-10 flex-1 flex flex-col justify-between px-4 pb-4">
        
        {/* Top Row: Manish & Miray */}
        <div className="flex justify-between items-start mt-6">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-gray-800 border-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] flex items-center justify-center overflow-hidden z-10 relative">
              <span className="text-3xl">👨🏽</span>
            </div>
            <div className="absolute top-1/2 -right-4 -translate-y-1/2 bg-[#1a153d] px-3 py-0.5 rounded-full border border-white/20 flex items-center gap-1 whitespace-nowrap z-0 pl-4">
              <span className="text-[10px]">🇮🇳</span><span className="text-[10px] text-white font-bold">Manish</span>
            </div>
            {activeSeat === 3 && <Dice color={colorOf(3)} positionClass="top-16 left-4" value={diceValue || 1} isRolling={rolling || false} onRoll={onRoll} />}
          </div>

          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-gray-800 border-2 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] flex items-center justify-center overflow-hidden z-10 relative">
              <span className="text-3xl">👩🏼</span>
            </div>
            <div className="absolute top-1/2 -left-4 -translate-y-1/2 bg-[#1a153d] px-3 py-0.5 rounded-full border border-white/20 flex items-center gap-1 whitespace-nowrap z-0 pr-4">
              <span className="text-[10px]">🇺🇸</span><span className="text-[10px] text-white font-bold">Miray</span>
            </div>
            {activeSeat === 2 && <Dice color={colorOf(2)} positionClass="top-16 right-4" value={diceValue || 1} isRolling={rolling || false} onRoll={onRoll} />}
          </div>
        </div>

        {/* BOARD */}
        <div className="relative w-full max-w-[420px] mx-auto aspect-square my-2 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] border-4 border-white/20 p-0.5 bg-white">
          <BoardSurface />
          
          <div className="absolute inset-0 p-1">
            {pawns.map((p) => {
              return (
                <motion.button
                  key={p.key} type="button" disabled={!p.movable}
                  onClick={() => { if (p.movable) onSelect(p.idx); }}
                  initial={false}
                  style={{ 
                    left: ((p.x / GRID) * 100) + "%", 
                    top: ((p.y / GRID) * 100) + "%",
                    width: ((100 / GRID) * 1.6) + "%", 
                    height: ((100 / GRID) * 1.6) + "%" 
                  }}
                  className="absolute z-20 flex items-center justify-center focus:outline-none -translate-x-1/2 -translate-y-1/2"
                >
                  <motion.div 
                    key={"hop-" + p.steps} 
                    className="relative flex h-full w-full items-center justify-center drop-shadow-xl will-change-transform" 
                    initial={{ y: -15, scale: 0.8 }} 
                    animate={{ y: 0, scale: 1 }} 
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    {/* AAA SEEDS (Images instead of Emojis) */}
                    <img 
                      src={SEED_IMAGES[p.color]} 
                      alt="pawn" 
                      className="w-[95%] h-[95%] object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]" 
                      onError={(e) => {
                        // Fallback if image is missing
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = '<span class="text-2xl">♟️</span>';
                        }
                      }}
                    />
                  </motion.div>
                  {p.movable && (
                    <motion.div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white shadow-[0_0_10px_#fff]" animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Bottom Row: busybrai... & Azeel */}
        <div className="flex justify-between items-end mb-2">
          
          {/* busybrai... (Red) */}
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-gray-800 border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] flex items-center justify-center overflow-hidden z-10 relative">
              <span className="text-3xl">🧔🏽‍♂️</span>
            </div>
            <div className="absolute top-1/2 -right-4 -translate-y-1/2 bg-[#1a153d] px-3 py-0.5 rounded-full border border-white/20 flex items-center gap-1 whitespace-nowrap z-0 pl-4">
              <span className="text-[10px]">🇳🇬</span><span className="text-[10px] text-white font-bold">busybrai...</span>
            </div>
            {/* Green Turn Arrow */}
            {activeSeat === 0 && (
              <motion.div 
                className="absolute -top-12 left-1/2 -translate-x-1/2 text-green-500 z-30 filter drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1 }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21L4 9h16L12 21z" /></svg>
              </motion.div>
            )}
            {activeSeat === 0 && <Dice color={colorOf(0)} positionClass="bottom-16 left-4" value={diceValue || 1} isRolling={rolling || false} onRoll={onRoll} />}
          </div>

          {/* Azeel (Blue) */}
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-gray-800 border-2 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] flex items-center justify-center overflow-hidden z-10 relative">
              <span className="text-3xl">👦🏽</span>
            </div>
            <div className="absolute top-1/2 -left-4 -translate-y-1/2 bg-[#1a153d] px-3 py-0.5 rounded-full border border-white/20 flex items-center gap-1 whitespace-nowrap z-0 pr-4">
              <span className="text-[10px]">🇦🇪</span><span className="text-[10px] text-white font-bold">Azeel</span>
            </div>
            {activeSeat === 1 && <Dice color={colorOf(1)} positionClass="bottom-16 right-4" value={diceValue || 1} isRolling={rolling || false} onRoll={onRoll} />}
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <div className="relative z-10 flex items-center justify-between px-4 pb-4">
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-xl bg-gray-800 border border-white/20 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" /></div>
          <div className="w-10 h-10 rounded-xl bg-gray-800 border border-white/20 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Max" alt="avatar" /></div>
          <div className="w-10 h-10 rounded-xl bg-[#1a153d] border border-white/20 flex flex-col items-center justify-center relative">
            <span className="text-cyan-400 text-[8px] leading-none">💎 2</span>
            <span className="text-white text-[10px] font-bold">↺</span>
            <div className="absolute -top-1 -right-1 bg-red-500 text-[8px] font-bold text-white px-1 rounded-full">25</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-1.5 rounded-full bg-[#4a438a]/60 text-white text-xs font-bold border border-white/10 uppercase">Emoji</button>
          <button className="px-4 py-1.5 rounded-full bg-[#4a438a]/60 text-white text-xs font-bold border border-white/10 uppercase">Chat</button>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gray-800 border-2 border-orange-500 overflow-hidden flex items-center justify-center text-2xl">🦌</div>
      </div>
    </div>
  );
}