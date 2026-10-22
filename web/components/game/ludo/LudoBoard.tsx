"use client";
import React from "react";
import { motion } from "framer-motion";
import {
  FINISH_STEP,
  LUDO_COLORS,
  LUDO_NAMES,
  SAFE_CELLS,
  START_INDEX,
  trackCell,
  type LudoColor,
  type LudoGameState,
} from "@/lib/ludo/engine";
import { SEED_ANIMALS } from "./LudoSeedCustomizerModal";

/* ═══════════════════════════════════════════════════════════════
   Engine-agnostic accessors
   ═══════════════════════════════════════════════════════════════ */

const COLORS: readonly string[] = (() => {
  const src = LUDO_COLORS as unknown;
  if (Array.isArray(src)) return src as readonly string[];
  const rec = src as Record<number, string | undefined>;
  return [rec[0] ?? "#E53935", rec[1] ?? "#1E88E5", rec[2] ?? "#FDD835", rec[3] ?? "#43A047"];
})();

const NAMES: readonly string[] = (() => {
  const src = LUDO_NAMES as unknown;
  if (Array.isArray(src)) return src as readonly string[];
  const rec = src as Record<number, string | undefined>;
  return [rec[0] ?? "Red", rec[1] ?? "Blue", rec[2] ?? "Yellow", rec[3] ?? "Green"];
})();

const START_ARR: readonly number[] = START_INDEX as unknown as readonly number[];

function colorOf(c: LudoColor | number): string {
  return COLORS[Number(c)] ?? "#888888";
}
function nameOf(c: LudoColor | number): string {
  return NAMES[Number(c)] ?? "Player";
}

/* ═══════════════════════════════════════════════════════════════
   Geometry (Matching Image)
   ═══════════════════════════════════════════════════════════════ */

const GRID = 15;

const TRACK_PATH: ReadonlyArray<readonly [number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

const BASE_QUAD: Record<number, readonly [number, number]> = {
  0: [0, 9],  // Bottom-Left (Red)
  1: [9, 9],  // Bottom-Right (Blue)
  2: [9, 0],  // Top-Right (Yellow)
  3: [0, 0],  // Top-Left (Green)
};

const BASE_SPOTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1.8, 10.8], [4.2, 10.8], [1.8, 13.2], [4.2, 13.2]],
  1: [[10.8, 10.8], [13.2, 10.8], [10.8, 13.2], [13.2, 13.2]],
  2: [[10.8, 1.8], [13.2, 1.8], [10.8, 4.2], [13.2, 4.2]],
  3: [[1.8, 1.8], [4.2, 1.8], [1.8, 4.2], [4.2, 4.2]],
};

const HOME_PATH: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Red (Moves up)
  1: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Blue (Moves left)
  2: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Yellow (Moves down)
  3: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Green (Moves right)
};

const CENTRE = { x: 7.5, y: 7.5 } as const;
const START_SET: ReadonlySet<number> = new Set(START_ARR);

function trackXY(index: number): { x: number; y: number } {
  const n = TRACK_PATH.length;
  const c = TRACK_PATH[((index % n) + n) % n] ?? [0, 0];
  return { x: c[0] + 0.5, y: c[1] + 0.5 };
}

function posFor(color: LudoColor, tokenIdx: number, steps: number): { x: number; y: number } {
  if (steps < 0) {
    const s = (BASE_SPOTS[color as unknown as number] ?? [])[tokenIdx] ?? CENTRE;
    return { x: s[0], y: s[1] };
  }
  if (steps <= 50) {
    const cell = trackCell(color, steps);
    return cell == null ? CENTRE : trackXY(cell);
  }
  if (steps < FINISH_STEP) {
    const h = (HOME_PATH[color as unknown as number] ?? [])[steps - 51] ?? CENTRE;
    return { x: h[0] + 0.5, y: h[1] + 0.5 };
  }
  return CENTRE;
}

function starPoints(cx: number, cy: number, r: number): string {
  const inner = r * 0.45;
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : inner;
    pts.push(`${(cx + rad * Math.cos(ang)).toFixed(3)},${(cy + rad * Math.sin(ang)).toFixed(3)}`);
  }
  return pts.join(" ");
}

/* ═══════════════════════════════════════════════════════════════
   Board Surface (SVG)
   ═══════════════════════════════════════════════════════════════ */

function BoardSurface({ activeSeat }: { activeSeat: LudoColor | null }) {
  const activeNum = activeSeat == null ? -1 : Number(activeSeat);

  return (
    <svg viewBox="0 0 15 15" className="block h-full w-full drop-shadow-md" role="img" aria-label="Ludo Board">
      <defs>
        {([0, 1, 2, 3] as const).map((c) => (
          <linearGradient key={`base-grad-${c}`} id={`base-grad-${c}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={colorOf(c)} stopOpacity="0.9" />
            <stop offset="1" stopColor={colorOf(c)} />
          </linearGradient>
        ))}
        <linearGradient id="track-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F0F0F0" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="15" height="15" fill="#FFFFFF" rx="0.5" stroke="#E0E0E0" strokeWidth="0.1" />

      {/* Center 4 Triangles */}
      <g>
        <polygon points="6,6 9,6 7.5,7.5" fill={colorOf(2)} stroke="#333" strokeWidth="0.05" />
        <polygon points="9,6 9,9 7.5,7.5" fill={colorOf(1)} stroke="#333" strokeWidth="0.05" />
        <polygon points="6,9 9,9 7.5,7.5" fill={colorOf(0)} stroke="#333" strokeWidth="0.05" />
        <polygon points="6,6 6,9 7.5,7.5" fill={colorOf(3)} stroke="#333" strokeWidth="0.05" />
      </g>

      {/* Home Paths */}
      <g>
        {([0, 1, 2, 3] as const).flatMap((c) =>
          (HOME_PATH[c] ?? []).map((cell, j) => {
            const cx = cell[0];
            const cy = cell[1];
            return (
              <rect
                key={`home-${c}-${j}`}
                x={cx}
                y={cy}
                width={1}
                height={1}
                fill={colorOf(c)}
                stroke="#333"
                strokeWidth="0.05"
              />
            );
          })
        )}
      </g>

      {/* Track Cells */}
      <g>
        {TRACK_PATH.map((cell, i) => {
          const col = cell[0];
          const row = cell[1];
          const isSafe = SAFE_CELLS.has(i);
          const isStart = START_SET.has(i);
          const playerIdx = START_ARR.indexOf(i);
          const cellColor = isStart && playerIdx >= 0 ? colorOf(playerIdx) : "url(#track-grad)";
          
          let rotation = 0;
          if (i === START_ARR[0]) rotation = 0;
          if (i === START_ARR[1]) rotation = 90;
          if (i === START_ARR[2]) rotation = 180;
          if (i === START_ARR[3]) rotation = 270;
          
          return (
            <g key={`trk-${i}`}>
              <rect
                x={col}
                y={row}
                width={1}
                height={1}
                fill={cellColor}
                stroke="#333"
                strokeWidth="0.04"
              />
              {isStart && (
                <>
                  <path
                    d={`M${col + 0.5},${row + 0.2} L${col + 0.8},${row + 0.6} L${col + 0.2},${row + 0.6} Z`}
                    fill="rgba(255,255,255,0.8)"
                    transform={`rotate(${rotation}, ${col + 0.5}, ${row + 0.5})`}
                  />
                  <text x={col + 0.5} y={row + 0.75} fontSize="0.4" textAnchor="middle" fill="#fff">🔒</text>
                </>
              )}
              {isSafe && !isStart && (
                <polygon
                  points={starPoints(col + 0.5, row + 0.5, 0.3)}
                  fill="#FFC107"
                  stroke="#B8860B"
                  strokeWidth="0.03"
                />
              )}
            </g>
          );
        })}
      </g>

      {/* Base Quadrants */}
      <g>
        {([0, 1, 2, 3] as const).map((c) => {
          const q = BASE_QUAD[c] ?? [0, 0];
          const col = colorOf(c);
          return (
            <g key={`base-quad-${c}`}>
              <rect
                x={q[0] + 0.05}
                y={q[1] + 0.05}
                width={5.9}
                height={5.9}
                fill={col}
                rx="1.2"
                stroke="#333"
                strokeWidth="0.1"
              />
              <rect
                x={q[0] + 0.6}
                y={q[1] + 0.6}
                width={4.8}
                height={4.8}
                fill="#FFFFFF"
                rx="0.8"
                stroke="#ddd"
                strokeWidth="0.05"
              />
              {(BASE_SPOTS[c] ?? []).map((spot, i) => {
                const sx = spot[0];
                const sy = spot[1];
                return (
                  <circle
                    key={`socket-${c}-${i}`}
                    cx={sx}
                    cy={sy}
                    r={0.55}
                    fill="#FFFFFF"
                    stroke={col}
                    strokeWidth="0.2"
                  />
                );
              })}
              {activeNum === c && (
                <rect
                  x={q[0] + 0.05}
                  y={q[1] + 0.05}
                  width={5.9}
                  height={5.9}
                  rx={1.2}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={0.2}
                  style={{ filter: `drop-shadow(0 0 4px ${col})` }}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Pawn Builder
   ═══════════════════════════════════════════════════════════════ */

interface Pawn {
  key: string;
  color: LudoColor;
  idx: number;
  steps: number;
  x: number;
  y: number;
  movable: boolean;
  stackIndex: number;
  stackCount: number;
}

type PlayerShape = { tokens: ReadonlyArray<{ steps: number }> };

function buildPawns(state: LudoGameState, selectable: readonly number[]): Pawn[] {
  const raw: Pawn[] = [];
  const players = (state.players as unknown as ReadonlyArray<PlayerShape>) ?? [];

  players.forEach((p, c) => {
    if (!p || !Array.isArray(p.tokens)) return;
    p.tokens.forEach((t, i) => {
      if (t.steps >= FINISH_STEP) return;
      const color = c as unknown as LudoColor;
      const pos = posFor(color, i, t.steps);
      raw.push({
        key: `${c}-${i}`,
        color,
        idx: i,
        steps: t.steps,
        x: pos.x,
        y: pos.y,
        movable: Number(color) === Number(state.turn) && selectable.includes(i),
        stackIndex: 0,
        stackCount: 1,
      });
    });
  });

  const groups = new Map<string, Pawn[]>();
  for (const p of raw) {
    const k = `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    const g = groups.get(k);
    if (g) g.push(p);
    else groups.set(k, [p]);
  }
  for (const g of groups.values()) {
    g.forEach((p, i) => {
      p.stackIndex = i;
      p.stackCount = g.length;
    });
  }
  return raw;
}

/* ═══════════════════════════════════════════════════════════════
   Player HUD
   ═══════════════════════════════════════════════════════════════ */

const PLAYER_INFO = [
  { name: "busybrai...", flag: "🇳🇬", pos: "bottom-[-30px] left-0", avatar: "🧔🏽‍♂️" },
  { name: "Azeel", flag: "🇦🇪", pos: "bottom-[-30px] right-0", avatar: "👦🏽" },
  { name: "Miray", flag: "🇺🇸", pos: "top-[-30px] right-0", avatar: "👩🏼" },
  { name: "Manish", flag: "🇮🇳", pos: "top-[-30px] left-0", avatar: "👨🏽" },
];

function PlayerHUD() {
  return (
    <>
      {PLAYER_INFO.map((p, i) => (
        <div key={i} className={`absolute ${p.pos} flex items-center gap-2 z-30`}>
          <div className="flex items-center gap-1 rounded-full bg-[#1a1642]/80 border border-white/20 px-3 py-1 shadow-lg backdrop-blur-md">
            <span className="text-sm">{p.flag}</span>
            <span className="text-xs font-bold text-white tracking-wide">{p.name}</span>
          </div>
        </div>
      ))}
      <div className="absolute top-[-80px] left-0 w-16 h-16 rounded-2xl overflow-hidden border-2 border-green-500 bg-gray-800 flex items-center justify-center text-3xl shadow-xl z-30">{PLAYER_INFO[3].avatar}</div>
      <div className="absolute top-[-80px] right-0 w-16 h-16 rounded-2xl overflow-hidden border-2 border-yellow-500 bg-gray-800 flex items-center justify-center text-3xl shadow-xl z-30">{PLAYER_INFO[2].avatar}</div>
      <div className="absolute bottom-[-80px] left-0 w-16 h-16 rounded-2xl overflow-hidden border-2 border-red-500 bg-gray-800 flex items-center justify-center text-3xl shadow-xl z-30">{PLAYER_INFO[0].avatar}</div>
      <div className="absolute bottom-[-80px] right-0 w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-500 bg-gray-800 flex items-center justify-center text-3xl shadow-xl z-30">{PLAYER_INFO[1].avatar}</div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

const STACK_DX = 0.22;
const STACK_DY = 0.22;

export function LudoBoard({
  state,
  selectable,
  onSelect,
  seedCustom,
}: {
  state: LudoGameState;
  selectable: readonly number[];
  onSelect: (tokenIdx: number) => void;
  seedCustom?: { animal?: string | null; color?: string | null } | null;
}) {
  const pawns = buildPawns(state, selectable);

  const winnerVal = (state as unknown as { winner?: LudoColor | null }).winner;
  const activeSeat: LudoColor | null = winnerVal == null ? state.turn : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#2D2B7C] to-[#1C154A] p-8 font-sans">
      <div className="relative mx-auto w-full max-w-[500px]">
        
        <PlayerHUD />

        <div className="relative rounded-[12px] bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-gray-200">
          <div className="relative w-full aspect-square overflow-hidden rounded-md">
            <BoardSurface activeSeat={activeSeat} />

            <div className="absolute inset-0">
              {pawns.map((p) => {
                const scale = p.stackCount > 1 ? Math.max(0.6, 1 - (p.stackCount - 1) * 0.15) : 1;
                const mid = (p.stackCount - 1) / 2;
                const dx = p.stackCount > 1 ? (p.stackIndex - mid) * STACK_DX : 0;
                const dy = p.stackCount > 1 ? (p.stackIndex - mid) * STACK_DY : 0;

                const col = colorOf(p.color);
                const customAnimal = Number(p.color) === 0 && seedCustom?.animal ? seedCustom.animal : null;
                const animalEmoji = SEED_ANIMALS.find((a) => a.key === customAnimal)?.emoji;

                let tokenVisual = "";
                if (p.color === 0) tokenVisual = animalEmoji ?? "💂🏽"; 
                if (p.color === 1) tokenVisual = "💧"; 
                if (p.color === 2) tokenVisual = "🏰"; 
                if (p.color === 3) tokenVisual = "🟢"; 

                return (
                  <motion.button
                    key={p.key}
                    type="button"
                    aria-label={`${nameOf(p.color)} pawn ${p.idx + 1}`}
                    aria-disabled={!p.movable}
                    disabled={!p.movable}
                    onClick={() => {
                      if (p.movable) onSelect(p.idx);
                    }}
                    initial={false}
                    animate={{
                      left: `${((p.x + dx) / GRID) * 100}%`,
                      top: `${((p.y + dy) / GRID) * 100}%`,
                      scale,
                      x: "-50%",
                      y: "-50%",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={[
                      "absolute z-20 flex items-center justify-center focus:outline-none transition-transform",
                      p.movable ? "cursor-pointer hover:scale-110" : "cursor-default",
                    ].join(" ")}
                    style={{ width: `${(100 / GRID) * 1.1}%`, height: `${(100 / GRID) * 1.1}%` }}
                  >
                    <motion.div
                      key={`hop-${p.steps}`}
                      className="relative flex h-full w-full items-center justify-center"
                      initial={{ y: -10, scale: 0.8 }}
                      animate={{ y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <div className="absolute bottom-0 h-1/3 w-3/4 rounded-[50%] bg-black/40 blur-[1px]" />
                      
                      <div 
                        className="relative z-10 flex aspect-square h-[80%] items-center justify-center rounded-full border-2 border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_-2px_6px_rgba(0,0,0,0.3),inset_0_2px_6px_rgba(255,255,255,0.6)]"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, #ffffff, ${col} 70%, rgba(0,0,0,0.8) 120%)`,
                          fontSize: "1.2rem",
                          lineHeight: 1,
                        }}
                      >
                         {p.color === 1 ? (
                           <div className="h-[80%] w-[70%] bg-blue-400 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-inner" />
                         ) : (
                           <span className="drop-shadow-md">{tokenVisual}</span>
                         )}
                      </div>
                    </motion.div>

                    {p.movable && (
                      <motion.div
                        className="pointer-events-none absolute inset-[-15%] rounded-full border-2"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ borderColor: "#FFFFFF", boxShadow: `0 0 10px ${col}` }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}