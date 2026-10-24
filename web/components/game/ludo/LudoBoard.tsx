"use client";
import React, { useMemo, useState } from "react";
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

const COLORS = ["#E53935", "#1E88E5", "#FDD835", "#43A047"]; 
const HEX_DARK = ["#B71C1C", "#1565C0", "#F9A825", "#2E7D32"];
const HEX_LIGHT = ["#FF8A80", "#82B1FF", "#FFF59D", "#A5D6A7"];

function colorOf(c: number) { return COLORS[c] || "#888"; }
function darkColorOf(c: number) { return HEX_DARK[c] || "#555"; }
function lightColorOf(c: number) { return HEX_LIGHT[c] || "#ccc"; }

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
    if (cell === null || cell === undefined) return { x: 7.5, y: 7.5 };
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

function Pawn({ color, size = 26 }: { color: number; size?: number }) {
  const baseBg = "linear-gradient(to bottom, " + colorOf(color) + ", " + darkColorOf(color) + ")";
  const bodyBg = "linear-gradient(to right, " + darkColorOf(color) + ", " + colorOf(color) + ", " + lightColorOf(color) + ")";
  const headBg = "radial-gradient(circle at 35% 35%, " + lightColorOf(color) + ", " + colorOf(color) + " 65%, " + darkColorOf(color) + ")";

  return (
    <div 
      className="relative flex flex-col items-center justify-end drop-shadow-[0_6px_8px_rgba(0,0,0,0.65)] pointer-events-none" 
      style={{ width: size, height: size * 1.2 }}
    >
      <div 
        className="w-[58%] h-[40%] rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.5),inset_2px_2px_4px_rgba(255,255,255,0.9)] z-30"
        style={{ background: headBg }}
      />
      <div 
        className="w-[45%] h-[12%] -mt-[5%] rounded-full z-20 opacity-90"
        style={{ background: lightColorOf(color) }}
      />
      <div 
        className="w-[68%] h-[45%] -mt-[5%] rounded-b-[45%] rounded-t-[20%] z-10 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.6)]"
        style={{ background: bodyBg }}
      />
      <div 
        className="w-[90%] h-[22%] -mt-[10%] rounded-[50%] shadow-[0_3px_5px_rgba(0,0,0,0.8)] z-0"
        style={{ background: baseBg }}
      />
    </div>
  );
}

const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 }, 2: { x: -90, y: 0 }, 3: { x: 0, y: -90 },
  4: { x: 0, y: 90 }, 5: { x: 90, y: 0 }, 6: { x: 0, y: 180 },
};

const PIPS: Record<number, readonly number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

const GLASS_FACE: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(255,255,255,.98) 0%, rgba(236,245,255,.82) 44%, rgba(178,206,238,.65) 100%)",
  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,.95)",
    "inset .1rem .1rem .32rem rgba(255,255,255,.95)",
    "inset -.12rem -.14rem .34rem rgba(23,53,99,.4)",
    "inset 0 0 .85rem rgba(126,175,232,.35)",
    "0 0 .45rem rgba(158,205,255,.3)",
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
  background: "linear-gradient(128deg, rgba(255,255,255,.85) 0%, rgba(255,255,255,.15) 30%, transparent 48%)",
};

function Face({ value, transform }: { value: number; transform: string }) {
  return (
    <div
      className="absolute grid h-full w-full grid-cols-3 grid-rows-3 gap-[8%] rounded-[15%] p-[12%]"
      style={{ ...GLASS_FACE, transform, backfaceVisibility: "hidden" }}
      aria-hidden
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {PIPS[value]!.includes(i) ? (
            <span className="h-[70%] w-[70%] rounded-full" style={PIP_STYLE} />
          ) : null}
        </span>
      ))}
      <span className="pointer-events-none absolute inset-0 rounded-[15%]" style={SPECULAR} />
    </div>
  );
}

function LudoDice({ value, rolling, active = false, size = 52 }: { value: number; rolling: boolean; active?: boolean; size?: number; }) {
  const face = FACE_ROT[Math.min(6, Math.max(1, value))] ?? FACE_ROT[1]!;
  const idle = { rotateX: face.x, rotateY: face.y };
  const animate = rolling
    ? {
        rotateX: [0, 900 + face.x, face.x],
        rotateY: [0, 1080 + face.y, face.y],
        y: [0, -24, 0, -10, 0],
        scaleY: [1, 1, 0.92, 1, 1],
      }
    : idle;

  return (
    <div className="relative grid place-items-center" style={{ perspective: 640, width: size, height: size }}>
      <span
        className="pointer-events-none absolute -inset-[16%] rounded-[28%] blur-[4px]"
        style={{
          background: active
            ? "radial-gradient(circle, rgba(96,165,250,.55), transparent 70%)"
            : "radial-gradient(circle, rgba(255,255,255,.15), transparent 70%)",
        }}
      />
      <motion.div
        className="relative h-full w-full cursor-pointer"
        style={{ transformStyle: "preserve-3d" }}
        initial={idle}
        animate={animate}
        transition={
          rolling
            ? { duration: 1.05, times: [0, 0.6, 0.8, 0.92, 1], ease: [0.22, 0.9, 0.3, 1] }
            : { type: "spring", stiffness: 140, damping: 15 }
        }
      >
        <Face value={1} transform={"translateZ(" + (size / 2) + "px)"} />
        <Face value={6} transform={"rotateY(180deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={3} transform={"rotateY(90deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={4} transform={"rotateY(-90deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={2} transform={"rotateX(90deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={5} transform={"rotateX(-90deg) translateZ(" + (size / 2) + "px)"} />
      </motion.div>
      <span
        className={"pointer-events-none absolute -bottom-[18%] left-1/2 h-[15%] w-[82%] -translate-x-1/2 rounded-[50%] " + (rolling ? "animate-[cc-ludo-die-shadow_520ms_ease-in-out_infinite]" : "")}
        style={{
          background: "radial-gradient(ellipse at center, " + (active ? "rgba(56,189,248,.7)" : "rgba(0,0,0,.65)") + " , transparent 70%)",
        }}
      />
    </div>
  );
}

const BoardSurface = React.memo(({ isNeon }: { isNeon: boolean }) => {
  const gridStroke = isNeon ? "#1E293B" : "#111111";
  const bgFill = isNeon ? "#0A0F1D" : "#FFFFFF";

  return (
    <svg viewBox="0 0 15 15" className="block h-full w-full rounded-md" style={{ backgroundColor: bgFill }} role="img">
      <g>
        <polygon points="6,6 9,6 7.5,7.5" fill={colorOf(2)} stroke={gridStroke} strokeWidth="0.05" />
        <polygon points="9,6 9,9 7.5,7.5" fill={colorOf(1)} stroke={gridStroke} strokeWidth="0.05" />
        <polygon points="6,9 9,9 7.5,7.5" fill={colorOf(0)} stroke={gridStroke} strokeWidth="0.05" />
        <polygon points="6,6 6,9 7.5,7.5" fill={colorOf(3)} stroke={gridStroke} strokeWidth="0.05" />
      </g>
      <g>
        {[0, 1, 2, 3].map((c) => (
          <g key={"home-" + c}>
            {HOME_PATH[c].map((cell, j) => (
              <rect 
                key={"h-" + c + "-" + j} 
                x={cell[0]} y={cell[1]} 
                width={1} height={1} 
                fill={isNeon ? darkColorOf(c) : colorOf(c)} 
                stroke={gridStroke} 
                strokeWidth="0.05" 
              />
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
          
          let cellColor = isNeon ? "#0F172A" : "#FFFFFF";
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
              <rect x={col} y={row} width={1} height={1} fill={cellColor} stroke={gridStroke} strokeWidth="0.05" />
              {(isSafe || isStart) && (
                <path 
                  d={"M" + (col+0.5) + "," + (row+0.2) + " L" + (col+0.6) + "," + (row+0.45) + " L" + (col+0.8) + "," + (row+0.45) + " L" + (col+0.65) + "," + (row+0.65) + " L" + (col+0.7) + "," + (row+0.8) + " L" + (col+0.5) + "," + (row+0.7) + " L" + (col+0.3) + "," + (row+0.8) + " L" + (col+0.35) + "," + (row+0.65) + " L" + (col+0.2) + "," + (row+0.45) + " L" + (col+0.4) + "," + (row+0.45) + " Z"} 
                  fill={isStart ? "#FFF" : "#FFC107"} 
                  stroke="#111" 
                  strokeWidth="0.03" 
                />
              )}
              {isStart && (
                <path 
                  d={"M" + (col+0.5) + "," + (row+0.2) + " L" + (col+0.8) + "," + (row+0.6) + " L" + (col+0.2) + "," + (row+0.6) + " Z"} 
                  fill="rgba(255,255,255,0.85)" 
                  transform={"rotate(" + rot + "," + (col+0.5) + "," + (row+0.5) + ")"} 
                />
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
              <rect 
                x={q[0] + 0.05} y={q[1] + 0.05} 
                width={5.9} height={5.9} 
                fill={isNeon ? "#0B132B" : col} 
                rx="1.2" 
                stroke={isNeon ? col : "#111"} 
                strokeWidth={isNeon ? "0.2" : "0.1"} 
              />
              <rect 
                x={q[0] + 0.5} y={q[1] + 0.5} 
                width={5} height={5} 
                fill={isNeon ? "#050814" : "#F8F9FA"} 
                rx="0.8" 
                stroke={isNeon ? col : "#DDD"} 
                strokeWidth="0.05" 
              />
              {BASE_SPOTS[c].map((spot, i) => (
                <g key={"spot-" + c + "-" + i}>
                  <circle 
                    cx={spot[0]} cy={spot[1]} r={0.7} 
                    fill={isNeon ? "transparent" : col} 
                    stroke={isNeon ? col : dark} 
                    strokeWidth="0.12" 
                  />
                  {!isNeon && (
                    <circle cx={spot[0]} cy={spot[1]} r={0.5} fill="#FFFFFF" />
                  )}
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

export function LudoBoard({ state, selectable, onSelect, diceValue = 1, rolling = false, onRoll }: LudoBoardProps) {
  const [mode, setMode] = useState<"Aero" | "Classic">("Aero");

  const pawns = useMemo(() => {
    const rawPawns: PawnData[] = [];
    const players = (state.players as unknown as ReadonlyArray<{ tokens: ReadonlyArray<{ steps: number }> }>) || [];
    
    players.forEach((p, c) => {
      if (!p || !Array.isArray(p.tokens)) return;
      p.tokens.forEach((t, i) => {
        if (t.steps >= FINISH_STEP) return;
        const pos = posFor(c, i, t.steps);
        rawPawns.push({
          key: c + "-" + i, color: c, idx: i, steps: t.steps,
          x: pos.x, y: pos.y,
          movable: c === Number(state.turn) && selectable.includes(i),
        });
      });
    });

    const coordMap = new Map<string, PawnData[]>();
    rawPawns.forEach((p) => {
      const keyStr = p.x.toFixed(2) + "_" + p.y.toFixed(2);
      if (!coordMap.has(keyStr)) coordMap.set(keyStr, []);
      coordMap.get(keyStr)!.push(p);
    });

    const adjustedPawns: (PawnData & { offsetX: number; offsetY: number })[] = [];

    coordMap.forEach((group) => {
      const total = group.length;
      group.forEach((p, index) => {
        let offsetX = 0;
        let offsetY = 0;
        if (total === 2) {
          offsetX = index === 0 ? -0.18 : 0.18;
          offsetY = index === 0 ? -0.18 : 0.18;
        } else if (total === 3) {
          const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
          offsetX = Math.cos(angles[index]) * 0.22;
          offsetY = Math.sin(angles[index]) * 0.22;
        } else if (total >= 4) {
          const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
          offsetX = Math.cos(angles[index % 4]) * 0.24;
          offsetY = Math.sin(angles[index % 4]) * 0.24;
        }

        adjustedPawns.push({
          ...p,
          offsetX,
          offsetY,
        });
      });
    });

    return adjustedPawns;
  }, [state, selectable]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#050814] overflow-hidden font-sans relative select-none">
      
      <style>{`
        @keyframes cc-ludo-die-shadow {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.8; }
          50% { transform: translateX(-50%) scale(1.3); opacity: 0.3; }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#1A2342] to-[#050814] opacity-90 pointer-events-none" />

      {/* TOP HEADER */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-1">
        <button className="w-8 h-8 rounded-xl bg-[#1A2342] flex items-center justify-center text-white border border-white/10 shadow-sm">
          <ArrowLeft size={16} />
        </button>

        <div className="flex items-center gap-1 bg-[#121A33] p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setMode("Aero")}
            className={"px-3 py-1 rounded-lg text-xs font-extrabold transition-all " + (mode === "Aero" ? "bg-blue-600 text-white shadow-md" : "text-gray-400")}
          >
            Aero
          </button>
          <button 
            onClick={() => setMode("Classic")}
            className={"px-3 py-1 rounded-lg text-xs font-extrabold transition-all " + (mode === "Classic" ? "bg-purple-600 text-white shadow-md" : "text-gray-400")}
          >
            Classic
          </button>
        </div>

        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-[#1A2342] flex items-center justify-center text-white border border-white/10"><Volume2 size={15} /></button>
          <button className="w-8 h-8 rounded-full bg-[#1A2342] flex items-center justify-center text-white border border-white/10"><Settings size={15} /></button>
        </div>
      </div>

      {/* TOP OPPONENTS */}
      <div className="relative z-20 flex justify-between items-start px-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-11 h-11 rounded-full border-2 border-green-500 p-0.5 bg-black overflow-hidden shadow-lg">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Martin" alt="Martin" className="w-full h-full rounded-full bg-blue-900" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#050814]" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold">Martin</span>
            <span className="text-[10px] text-gray-300 flex items-center gap-1">🇮🇳 India</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-[#1A2342]/90 border border-white/10 rounded-2xl px-3 py-1.5 shadow-md">
          <Home size={14} className="text-white mb-0.5" />
          <span className="text-white text-[11px] font-bold">Meet Here</span>
        </div>

        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="relative">
            <div className="w-11 h-11 rounded-full border-2 border-yellow-500 p-0.5 bg-black overflow-hidden shadow-lg">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Zaki" alt="Zaki" className="w-full h-full rounded-full bg-yellow-900" />
            </div>
            <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#050814]" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-white text-xs font-bold">Zaki</span>
            <span className="text-[10px] text-gray-300 flex items-center gap-1">🇸🇦 KSA</span>
          </div>
        </div>
      </div>

      {/* THE 5D BOARD */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-2 my-auto">
        <div className="relative w-full max-w-[360px] aspect-square rounded-[2rem] bg-[#12192E] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_4px_10px_rgba(255,255,255,0.15)] border border-white/10">
          <div className="relative w-full h-full rounded-[1.4rem] bg-white p-1 shadow-[inset_0_4px_15px_rgba(0,0,0,0.6)] overflow-hidden">
            <BoardSurface isNeon={mode === "Classic"} />
            
            <div className="absolute inset-0 p-1">
              {pawns.map((p) => {
                const posX = p.x + p.offsetX;
                const posY = p.y + p.offsetY;
                return (
                  <motion.button
                    key={p.key}
                    type="button"
                    disabled={!p.movable}
                    onClick={() => { if (p.movable) onSelect(p.idx); }}
                    initial={false}
                    style={{ 
                      left: ((posX / GRID) * 100) + "%", 
                      top: ((posY / GRID) * 100) + "%",
                      width: ((100 / GRID) * 1.1) + "%", 
                      height: ((100 / GRID) * 1.1) + "%" 
                    }}
                    className="absolute z-20 flex items-center justify-center focus:outline-none -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                  >
                    <motion.div 
                      key={"hop-" + p.steps} 
                      className="relative flex h-full w-full items-center justify-center will-change-transform" 
                      initial={{ y: -16, scale: 0.6 }} 
                      animate={{ y: 0, scale: 1 }} 
                      transition={{ type: "spring", stiffness: 420, damping: 16 }}
                    >
                      <Pawn color={p.color} size={24} />
                    </motion.div>
                    {p.movable && (
                      <motion.div 
                        className="pointer-events-none absolute inset-[-15%] rounded-full border-2 border-cyan-300 shadow-[0_0_12px_#22d3ee]" 
                        animate={{ scale: [1, 1.25, 1], opacity: [0.9, 0.3, 0.9] }} 
                        transition={{ repeat: Infinity, duration: 1.1 }} 
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM PLAYERS & 5D DICE */}
      <div className="relative z-20 flex items-center justify-between px-4 mb-1">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-11 h-11 rounded-full border-2 border-red-500 p-0.5 bg-black overflow-hidden shadow-lg">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=busybrain" alt="busybrain" className="w-full h-full rounded-full bg-red-900" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#050814]" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold">busybrain</span>
            <span className="text-[10px] text-gray-300 flex items-center gap-1">🇳🇬 Nigeria</span>
          </div>
        </div>

        <div className="relative -mt-8 flex flex-col items-center cursor-pointer" onClick={onRoll}>
          <LudoDice value={diceValue} rolling={rolling} active={true} size={50} />
          <span className="mt-1.5 text-[9px] font-black text-cyan-400 uppercase tracking-widest z-10 drop-shadow">
            Tap to Roll
          </span>
        </div>

        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="relative">
            <div className="w-11 h-11 rounded-full border-2 border-blue-500 p-0.5 bg-black overflow-hidden shadow-lg">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bella" alt="Bella" className="w-full h-full rounded-full bg-blue-900" />
            </div>
            <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#050814]" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-white text-xs font-bold">Bella</span>
            <span className="text-[10px] text-gray-300 flex items-center gap-1">🇬🇧 UK</span>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="relative z-20 px-4 mb-2">
        <div className="flex items-center justify-between bg-[#1A2342] border border-white/10 rounded-full px-4 py-1.5 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-300 font-medium">Your turn to roll...</span>
          </div>
          <Smile size={16} className="text-gray-400" />
        </div>
      </div>

      {/* BOTTOM NAVIGATION DOCK */}
      <div className="relative z-20 w-full flex justify-between items-center px-6 pb-4 pt-1 border-t border-white/5 bg-[#050814]">
        <div className="flex flex-col items-center gap-0.5 text-gray-400">
          <Compass size={20} />
          <span className="text-[9px] font-bold">Explore</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-gray-400">
          <ImageIcon size={20} />
          <span className="text-[9px] font-bold">Moments</span>
        </div>
        
        <div className="relative -top-3 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-[0_0_18px_rgba(239,68,68,0.7)] border-2 border-[#050814]">
            <Gamepad2 size={24} className="text-white" />
          </div>
          <span className="text-[9px] text-white font-bold mt-0.5">Games</span>
        </div>

        <div className="flex flex-col items-center gap-0.5 text-gray-400 relative">
          <MessageSquare size={20} />
          <span className="text-[9px] font-bold">Messages</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-gray-400">
          <User size={20} />
          <span className="text-[9px] font-bold">Profile</span>
        </div>
      </div>

    </div>
  );
}