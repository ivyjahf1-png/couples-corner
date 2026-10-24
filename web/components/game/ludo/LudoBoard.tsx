"use client";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FINISH_STEP,
  trackCell,
  type LudoColor,
  type LudoGameState,
} from "@/lib/ludo/engine";
import { 
  ArrowLeft, Heart, Users, Volume2, Settings, Home, 
  Compass, Image as ImageIcon, Gamepad2, MessageSquare, User, Smile 
} from "lucide-react";

const GRID = 15;

// 0=Red(BL), 1=Blue(BR), 2=Yellow(TR), 3=Green(TL)
const COLORS = ["#E53935", "#1E88E5", "#FDD835", "#43A047"]; 
const HEX_DARK = ["#B71C1C", "#1565C0", "#F9A825", "#2E7D32"];
const HEX_LIGHT = ["#FF8A80", "#82B1FF", "#FFF59D", "#A5D6A7"];

function colorOf(c: number) { return COLORS[c] || "#888"; }
function darkColorOf(c: number) { return HEX_DARK[c] || "#555"; }
function lightColorOf(c: number) { return HEX_LIGHT[c] || "#ccc"; }

// Standard Clockwise Pathway
const TRACK_PATH: ReadonlyArray<readonly [number, number]> = [
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6],
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0],
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14],
];

const BASE_QUAD: Record<number, readonly [number, number]> = {
  0: [0, 9], 1: [9, 9], 2: [9, 0], 3: [0, 0], 
};

const BASE_SPOTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1.8, 10.8], [4.2, 10.8], [1.8, 13.2], [4.2, 13.2]],
  1: [[10.8, 10.8], [13.2, 10.8], [10.8, 13.2], [13.2, 13.2]],
  2: [[10.8, 1.8], [13.2, 1.8], [10.8, 4.2], [13.2, 4.2]],
  3: [[1.8, 1.8], [4.2, 1.8], [1.8, 4.2], [4.2, 4.2]],
};

const HOME_PATH: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  1: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  2: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  3: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
};

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
   5D CSS PAWN
   ═══════════════════════════════════════════════════════════════ */
function Pawn({ color, size = 24 }: { color: number, size?: number }) {
  const baseBg = "linear-gradient(to bottom, " + colorOf(color) + ", " + darkColorOf(color) + ")";
  const bodyBg = "linear-gradient(to right, " + darkColorOf(color) + ", " + colorOf(color) + ", " + lightColorOf(color) + ")";
  const headBg = "radial-gradient(circle at 30% 30%, " + lightColorOf(color) + ", " + colorOf(color) + " 60%, " + darkColorOf(color) + ")";

  return (
    <div className="relative flex items-center justify-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]" style={{ width: size, height: size }}>
      {/* Base */}
      <div 
        className="absolute bottom-0 w-[80%] h-[20%] rounded-[50%]"
        style={{ background: baseBg }}
      />
      {/* Body/Stem */}
      <div 
        className="absolute bottom-[10%] w-[40%] h-[50%] rounded-b-[40%] rounded-t-[20%]"
        style={{ background: bodyBg }}
      />
      {/* Head */}
      <div 
        className="absolute top-0 w-[60%] h-[50%] rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.4),inset_2px_2px_4px_rgba(255,255,255,0.8)]"
        style={{ background: headBg }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   THE 5D GLASS DICE (Replaced with your premium code)
   ═══════════════════════════════════════════════════════════════ */
const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 }, 2: { x: -90, y: 0 }, 3: { x: 0, y: -90 },
  4: { x: 0, y: 90 }, 5: { x: 90, y: 0 }, 6: { x: 0, y: 180 },
};

const PIPS: Record<number, readonly number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

const GLASS_FACE: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(255,255,255,.95) 0%, rgba(236,245,255,.74) 44%, rgba(178,206,238,.58) 100%)",
  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,.9)",
    "inset .1rem .1rem .32rem rgba(255,255,255,.95)",
    "inset -.12rem -.14rem .34rem rgba(23,53,99,.4)",
    "inset 0 0 .85rem rgba(126,175,232,.3)",
    "0 0 .45rem rgba(158,205,255,.28)",
  ].join(", "),
};

const PIP_STYLE: React.CSSProperties = {
  background: "radial-gradient(circle at 32% 28%, #7b8494 0%, #232a36 52%, #05070c 100%)",
  boxShadow: [
    "inset 0 .07rem .09rem rgba(0,0,0,.95)",
    "inset 0 -.05rem .07rem rgba(255,255,255,.28)",
    "0 .05rem .06rem rgba(255,255,255,.8)",
  ].join(", "),
};

const SPECULAR: React.CSSProperties = {
  background: "linear-gradient(128deg, rgba(255,255,255,.8) 0%, rgba(255,255,255,.12) 30%, transparent 48%)",
};

function Face({ value, transform }: { value: number; transform: string }) {
  return (
    <div
      className="absolute grid h-full w-full grid-cols-3 grid-rows-3 gap-[8%] rounded-[13%] p-[12%]"
      style={{ ...GLASS_FACE, transform, backfaceVisibility: "hidden" }}
      aria-hidden
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {PIPS[value]!.includes(i) ? (
            <span className="h-[68%] w-[68%] rounded-full" style={PIP_STYLE} />
          ) : null}
        </span>
      ))}
      <span className="pointer-events-none absolute inset-0 rounded-[13%]" style={SPECULAR} />
    </div>
  );
}

function LudoDice({ value, rolling, active = false, size = 46 }: { value: number; rolling: boolean; active?: boolean; size?: number; }) {
  const face = FACE_ROT[Math.min(6, Math.max(1, value))] ?? FACE_ROT[1]!;
  const idle = { rotateX: face.x, rotateY: face.y };
  const animate = rolling
    ? {
        rotateX: [0, 900 + face.x, face.x],
        rotateY: [0, 1080 + face.y, face.y],
        y: [0, -22, 0, -9, 0],
        scaleY: [1, 1, 0.93, 1, 1],
      }
    : idle;

  return (
    <div className="relative grid place-items-center" style={{ perspective: 640, width: size, height: size }} aria-hidden>
      <span
        className="pointer-events-none absolute -inset-[14%] rounded-[26%] blur-[3px]"
        style={{
          background: active
            ? "radial-gradient(circle, rgba(96,165,250,.45), transparent 68%)"
            : "radial-gradient(circle, rgba(255,255,255,.14), transparent 70%)",
        }}
      />
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={idle}
        animate={animate}
        transition={
          rolling
            ? { duration: 1.05, times: [0, 0.6, 0.8, 0.92, 1], ease: [0.22, 0.9, 0.3, 1] }
            : { type: "spring", stiffness: 130, damping: 14 }
        }
      >
        {/* FIX: Replaced backticks with string concatenation to prevent TS errors */}
        <Face value={1} transform={"translateZ(" + (size / 2) + "px)"} />
        <Face value={6} transform={"rotateY(180deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={3} transform={"rotateY(90deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={4} transform={"rotateY(-90deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={2} transform={"rotateX(90deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={5} transform={"rotateX(-90deg) translateZ(" + (size / 2) + "px)"} />
      </motion.div>
      <span
        className={`pointer-events-none absolute -bottom-[16%] left-1/2 h-[15%] w-[80%] -translate-x-1/2 rounded-[50%] ${
          rolling ? "animate-[cc-ludo-die-shadow_520ms_ease-in-out_infinite]" : ""
        }`}
        style={{
          background: `radial-gradient(ellipse at center, ${
            active ? "rgba(56,189,248,.6)" : "rgba(0,0,0,.6)"
          } , transparent 70%)`,
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   THE 5D BOARD SURFACE
   ═══════════════════════════════════════════════════════════════ */
const BoardSurface = React.memo(() => {
  return (
    <svg viewBox="0 0 15 15" className="block h-full w-full bg-white rounded-sm" role="img">
      <g>
        <polygon points="6,6 9,6 7.5,7.5" fill={colorOf(2)} stroke="#111" strokeWidth="0.05" />
        <polygon points="9,6 9,9 7.5,7.5" fill={colorOf(1)} stroke="#111" strokeWidth="0.05" />
        <polygon points="6,9 9,9 7.5,7.5" fill={colorOf(0)} stroke="#111" strokeWidth="0.05" />
        <polygon points="6,6 6,9 7.5,7.5" fill={colorOf(3)} stroke="#111" strokeWidth="0.05" />
      </g>
      <g>
        {[0, 1, 2, 3].map((c) => (
          <g key={"home-" + c}>
            {HOME_PATH[c].map((cell, j) => (
              <rect key={"h-" + c + "-" + j} x={cell[0]} y={cell[1]} width={1} height={1} fill={colorOf(c)} stroke="#111" strokeWidth="0.05" />
            ))}
          </g>
        ))}
      </g>
      <g>
        {TRACK_PATH.map((cell, i) => {
          const col = cell[0];
          const row = cell[1];
          const isSafe = SAFE_STARS.has(i);
          const isStart = START_SET.has(i);
          
          let cellColor = "#FFFFFF";
          if (isStart) {
            if (i === 0) cellColor = colorOf(0);
            if (i === 14) cellColor = colorOf(3);
            if (i === 28) cellColor = colorOf(2);
            if (i === 42) cellColor = colorOf(1);
          }

          let rot = 0;
          if (i === 0) rot = 0;
          if (i === 14) rot = 90;
          if (i === 28) rot = 180;
          if (i === 42) rot = 270;

          return (
            <g key={"trk-" + i}>
              <rect x={col} y={row} width={1} height={1} fill={cellColor} stroke="#111" strokeWidth="0.05" />
              {(isSafe || isStart) && (
                <path d={"M" + (col+0.5) + "," + (row+0.2) + " L" + (col+0.6) + "," + (row+0.45) + " L" + (col+0.8) + "," + (row+0.45) + " L" + (col+0.65) + "," + (row+0.65) + " L" + (col+0.7) + "," + (row+0.8) + " L" + (col+0.5) + "," + (row+0.7) + " L" + (col+0.3) + "," + (row+0.8) + " L" + (col+0.35) + "," + (row+0.65) + " L" + (col+0.2) + "," + (row+0.45) + " L" + (col+0.4) + "," + (row+0.45) + " Z"} fill={isStart ? "#FFF" : "#FFC107"} stroke="#111" strokeWidth="0.03" />
              )}
              {isStart && (
                <path d={"M" + (col+0.5) + "," + (row+0.2) + " L" + (col+0.8) + "," + (row+0.6) + " L" + (col+0.2) + "," + (row+0.6) + " Z"} fill="rgba(255,255,255,0.7)" transform={"rotate(" + rot + "," + (col+0.5) + "," + (row+0.5) + ")"} />
              )}
            </g>
          );
        })}
      </g>
      <g>
        {[0, 1, 2, 3].map((c) => {
          const q = BASE_QUAD[c];
          const col = colorOf(c);
          const dark = darkColorOf(c);
          return (
            <g key={"base-" + c}>
              <rect x={q[0] + 0.05} y={q[1] + 0.05} width={5.9} height={5.9} fill={col} rx="1.5" stroke="#111" strokeWidth="0.1" />
              <rect x={q[0] + 0.5} y={q[1] + 0.5} width={5} height={5} fill="#F8F9FA" rx="1" stroke="#DDD" strokeWidth="0.05" />
              {BASE_SPOTS[c].map((spot, i) => (
                <g key={"spot-" + c + "-" + i}>
                  <circle cx={spot[0]} cy={spot[1]} r={0.65} fill="transparent" stroke={dark} strokeWidth="0.1" strokeDasharray="0.2 0.1" />
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
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
interface PawnData {
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
  seedCustom?: { animal?: string | null; color?: string | null } | null;
  diceValue?: number;
  rolling?: boolean;
  onRoll?: () => void;
}

export function LudoBoard({ state, selectable, onSelect, diceValue, rolling, onRoll }: LudoBoardProps) {
  
  const pawns = useMemo(() => {
    const result: PawnData[] = [];
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
    <div className="flex flex-col h-[100dvh] w-full bg-[#050814] overflow-hidden font-sans relative select-none">
      
      {/* INJECT CUSTOM KEYFRAMES FOR THE 5D DICE SHADOW */}
      <style>{`
        @keyframes cc-ludo-die-shadow {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.8; }
          50% { transform: translateX(-50%) scale(1.3); opacity: 0.3; }
        }
      `}</style>

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#1A2342] to-[#050814] opacity-90 pointer-events-none" />

      {/* ─── TOP HEADER ─── */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-6 pb-2">
        <button className="w-9 h-9 rounded-xl bg-[#1A2342] flex items-center justify-center text-white border border-white/10">
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-white font-black text-lg tracking-wide">
            <Heart size={18} className="text-red-500 fill-red-500" /> Couples Corner
          </div>
          <div className="flex items-center gap-1 text-[10px] text-blue-300 font-semibold">
            <Users size={12} /> 4 Players • 3D Ludo
          </div>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-full bg-[#1A2342] flex items-center justify-center text-white border border-white/10"><Volume2 size={16} /></button>
          <button className="w-9 h-9 rounded-full bg-[#1A2342] flex items-center justify-center text-white border border-white/10"><Settings size={16} /></button>
        </div>
      </div>

      {/* ─── TOP OPPONENTS ─── */}
      <div className="relative z-20 flex justify-between items-start px-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-green-500 p-0.5 bg-black overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=David" alt="David" className="w-full h-full rounded-full bg-blue-900" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050814]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1"><span className="text-white text-xs font-bold">David</span></div>
            <span className="bg-blue-600 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full w-max">Lv.9</span>
            <span className="text-[10px] text-gray-300 mt-0.5 flex items-center gap-1">🇳🇬 Nigeria</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-[#1A2342] border border-white/10 rounded-2xl px-4 py-2">
          <Home size={16} className="text-white mb-1" />
          <span className="text-white text-xs font-bold">Meet Here</span>
          <span className="text-[10px] text-gray-400">(No Drop)</span>
        </div>

        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-pink-500 p-0.5 bg-black overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bella" alt="Bella" className="w-full h-full rounded-full bg-pink-900" />
            </div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050814]" />
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1"><span className="text-white text-xs font-bold">Bella</span></div>
            <span className="bg-pink-600 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full w-max">Lv.7</span>
            <span className="text-[10px] text-gray-300 mt-0.5 flex items-center gap-1">🇬🇧 UK</span>
          </div>
        </div>
      </div>

      {/* ─── THE 5D BOARD (Perfectly Centered) ─── */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-[380px] aspect-square rounded-[2rem] bg-[#2A1D11] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_4px_10px_rgba(255,255,255,0.2)]">
          <div className="relative w-full h-full rounded-[1.5rem] bg-white p-1 shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)] overflow-hidden">
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
                      width: ((100 / GRID) * 1.2) + "%", 
                      height: ((100 / GRID) * 1.2) + "%" 
                    }}
                    className="absolute z-20 flex items-center justify-center focus:outline-none -translate-x-1/2 -translate-y-1/2"
                  >
                    <motion.div 
                      key={"hop-" + p.steps} 
                      className="relative flex h-full w-full items-center justify-center will-change-transform" 
                      initial={{ y: -20, scale: 0.5 }} 
                      animate={{ y: 0, scale: 1 }} 
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Pawn color={p.color} size={24} />
                    </motion.div>
                    {p.movable && (
                      <motion.div className="pointer-events-none absolute inset-[-20%] rounded-full border-2 border-cyan-400 shadow-[0_0_15px_#22d3ee]" animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* ─── BOTTOM PLAYERS & 5D DICE ─── */}
      <div className="relative z-20 flex items-center justify-between px-4 mb-2">
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500 p-0.5 bg-black overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Tunde" alt="Tunde" className="w-full h-full rounded-full bg-green-900" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050814]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1"><span className="text-white text-xs font-bold">Tunde</span></div>
            <span className="bg-emerald-600 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full w-max">Lv.5</span>
            <span className="text-[10px] text-gray-300 mt-0.5 flex items-center gap-1">🇳🇬 Nigeria</span>
          </div>
        </div>

        {/* INTEGRATED 5D DICE */}
        <div className="relative -mt-10 flex flex-col items-center cursor-pointer" onClick={onRoll}>
          <LudoDice value={diceValue || 1} rolling={rolling || false} active={true} size={54} />
          <span className="mt-2 text-[10px] font-bold text-cyan-400 uppercase tracking-widest z-10 drop-shadow-md">
            Tap to Roll
          </span>
        </div>

        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-yellow-500 p-0.5 bg-black overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha" alt="Aisha" className="w-full h-full rounded-full bg-yellow-900" />
            </div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050814]" />
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1"><span className="text-white text-xs font-bold">Aisha</span></div>
            <span className="bg-yellow-600 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full w-max">Lv.10</span>
            <span className="text-[10px] text-gray-300 mt-0.5 flex items-center gap-1">🇨🇦 Canada</span>
          </div>
        </div>

      </div>

      {/* ─── STATUS BAR ─── */}
      <div className="relative z-20 px-4 mb-2">
        <div className="flex items-center justify-between bg-[#1A2342] border border-white/10 rounded-full px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-300 font-semibold">Tunde is thinking...</span>
          </div>
          <Smile size={16} className="text-gray-400" />
        </div>
      </div>

      {/* ─── BOTTOM NAVIGATION ─── */}
      <div className="relative z-20 w-full flex justify-between items-center px-6 pb-6 pt-2">
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <Compass size={22} />
          <span className="text-[10px] font-bold">Explore</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <ImageIcon size={22} />
          <span className="text-[10px] font-bold">Moments</span>
        </div>
        
        <div className="relative -top-4 flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full bg-[#E53935] flex items-center justify-center shadow-[0_0_20px_rgba(229,57,53,0.6)] border-4 border-[#050814]">
            <Gamepad2 size={28} className="text-white" />
          </div>
          <span className="text-[10px] text-white font-bold">Games</span>
        </div>

        <div className="flex flex-col items-center gap-1 text-gray-400 relative">
          <MessageSquare size={22} />
          <div className="absolute -top-1 -right-2 bg-red-500 text-[10px] font-bold text-white w-4 h-4 flex items-center justify-center rounded-full border border-[#050814]">2</div>
          <span className="text-[10px] font-bold">Messages</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <User size={22} />
          <span className="text-[10px] font-bold">Profile</span>
        </div>
      </div>

    </div>
  );
}