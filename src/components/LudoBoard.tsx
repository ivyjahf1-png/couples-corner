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

const COLORS = ["#E53935", "#1E88E5", "#FDD835", "#43A047"]; 
const HEX_DARK = ["#B71C1C", "#1565C0", "#F9A825", "#2E7D32"];
const HEX_LIGHT = ["#FF8A80", "#82B1FF", "#FFF59D", "#A5D6A7"];

function colorOf(c: number) { return COLORS[c] || "#888"; }
function darkColorOf(c: number) { return HEX_DARK[c] || "#555"; }
function lightColorOf(c: number) { return HEX_LIGHT[c] || "#ccc"; }

/* 
  EXACT INDUSTRY-STANDARD CLOCKWISE TRACK PATH
  Index 0 = Red Starting Gate [6, 13]
*/
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

export function TempleSeed({ color, size = 22 }: { color: number; size?: number }) {
  const primary = colorOf(color);
  const dark = darkColorOf(color);
  const light = lightColorOf(color);

  return (
    <div 
      className="relative flex flex-col items-center justify-end drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)] pointer-events-none select-none" 
      style={{ width: size, height: size * 1.15 }}
    >
      <div 
        className="w-[55%] h-[42%] rounded-t-full rounded-b-md z-30 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.5),inset_2px_2px_4px_rgba(255,255,255,0.8)] border border-white/30"
        style={{ background: "radial-gradient(circle at 35% 35%, " + light + ", " + primary + " 70%, " + dark + ")" }}
      />
      <div 
        className="w-[75%] h-[38%] -mt-[8%] rounded-sm z-20 shadow-[inset_0_0_6px_rgba(0,0,0,0.4)]"
        style={{ background: "linear-gradient(to right, " + dark + ", " + primary + ", " + light + ")" }}
      />
      <div 
        className="w-[95%] h-[24%] -mt-[4%] rounded-md z-10 shadow-[0_3px_5px_rgba(0,0,0,0.8)] border border-black/30"
        style={{ background: "linear-gradient(to bottom, " + primary + ", " + dark + ")" }}
      />
    </div>
  );
}

const BoardSurface = React.memo(({ isNeon }: { isNeon: boolean }) => {
  const gridStroke = isNeon ? "#1E293B" : "#111111";
  const bgFill = isNeon ? "#0A0F1D" : "#FFFFFF";

  return (
    <svg viewBox="0 0 15 15" className="block h-full w-full rounded-lg" style={{ backgroundColor: bgFill }} role="img">
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
                  fill="#FFD700" 
                  stroke="#B8860B"
                  strokeWidth="0.04"
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
  isNeon?: boolean;
  diceValue?: number;
  rolling?: boolean;
  onRoll?: () => void;
  canRoll?: boolean;
  names?: readonly string[];
}

export function LudoBoard({ state, selectable, onSelect, isNeon = false }: LudoBoardProps) {
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
          offsetX = index === 0 ? -0.15 : 0.15;
          offsetY = index === 0 ? -0.15 : 0.15;
        } else if (total === 3) {
          const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
          offsetX = Math.cos(angles[index]) * 0.18;
          offsetY = Math.sin(angles[index]) * 0.18;
        } else if (total >= 4) {
          const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
          offsetX = Math.cos(angles[index % 4]) * 0.2;
          offsetY = Math.sin(angles[index % 4]) * 0.2;
        }
        adjustedPawns.push({ ...p, offsetX, offsetY });
      });
    });

    return adjustedPawns;
  }, [state, selectable]);

  return (
    <div className="relative w-full aspect-square rounded-[1.2rem] bg-[#12192E] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/10 mx-auto">
      <div className="relative w-full h-full rounded-[1rem] bg-white p-0.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] overflow-visible">
        <BoardSurface isNeon={isNeon} />
        
        <div className="absolute inset-0 p-0.5 pointer-events-none">
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
                  initial={{ y: -12, scale: 0.6 }} 
                  animate={{ y: 0, scale: 1 }} 
                  transition={{ type: "spring", stiffness: 420, damping: 16 }}
                >
                  <TempleSeed color={p.color} size={22} />
                </motion.div>
                {p.movable && (
                  <motion.div 
                    className="pointer-events-none absolute inset-[-15%] rounded-full border-2 border-cyan-300 shadow-[0_0_8px_#22d3ee]" 
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
  );
}

// Default export added to resolve TS2613 module error when imported without curly braces
export default LudoBoard;