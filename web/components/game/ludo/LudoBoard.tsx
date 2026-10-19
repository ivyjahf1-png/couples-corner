"use client";
import React from "react";
import { motion } from "framer-motion";
import { FINISH_STEP, LUDO_COLORS, LUDO_NAMES, SAFE_CELLS, START_INDEX, trackCell, type LudoColor, type LudoGameState } from "@/lib/ludo/engine";
import { SEED_ANIMALS } from "./LudoSeedCustomizerModal";

const GRID = 15;

/** 52-cell main track as (col,row) grid coordinates. */
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

/** Base block origins (col,row) per seat: 0 Red BL · 1 Blue BR · 2 Yellow TR · 3 Green TL. */
const BASE_QUAD: Record<number, readonly [number, number]> = { 0: [0, 9], 1: [9, 9], 2: [9, 0], 3: [0, 0] };

/** Pawn socket CENTRES (grid units) inside each 6×6 base. */
const BASE_SPOTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1.7, 10.7], [4.3, 10.7], [1.7, 13.3], [4.3, 13.3]], // BL (Red)
  1: [[10.7, 10.7], [13.3, 10.7], [10.7, 13.3], [13.3, 13.3]], // BR (Blue)
  2: [[10.7, 1.7], [13.3, 1.7], [10.7, 4.3], [13.3, 4.3]], // TR (Yellow)
  3: [[1.7, 1.7], [4.3, 1.7], [1.7, 4.3], [4.3, 4.3]], // TL (Green)
};

/** Home corridors (6 cells each; color-aligned perfectly to each quadrant). */
const HOME_PATH: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Red -> Left Arm
  1: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Blue -> Bottom Arm
  2: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Yellow -> Right Arm
  3: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Green -> Top Arm
};

const START_SET: ReadonlySet<number> = new Set(START_INDEX);

const WOOD_FRAME: React.CSSProperties = {
  background:
    "repeating-linear-gradient(93deg, rgba(0,0,0,.18) 0 3px, rgba(255,255,255,.06) 3px 7px), linear-gradient(150deg,#8a5e31 0%,#5a3d1d 50%,#2d1a08 100%)",
  boxShadow:
    "inset 0 3px 0 rgba(255,224,170,.4), inset 0 -6px 14px rgba(0,0,0,.7), inset 0 0 0 2px rgba(0,0,0,.5), 0 24px 52px rgba(0,0,0,.6)",
};

function trackXY(index: number): { x: number; y: number } {
  const n = TRACK_PATH.length;
  const c = TRACK_PATH[((index % n) + n) % n]!;
  return { x: c[0] + 0.5, y: c[1] + 0.5 };
}

function posFor(color: LudoColor, tokenIdx: number, steps: number): { x: number; y: number } {
  if (steps < 0) {
    const s = BASE_SPOTS[color]![tokenIdx]!;
    return { x: s[0], y: s[1] };
  }
  if (steps <= 50) {
    const cell = trackCell(color, steps);
    return cell === null ? { x: 7.5, y: 7.5 } : trackXY(cell);
  }
  if (steps < FINISH_STEP) {
    const h = HOME_PATH[color]![steps - 51]!;
    return { x: h[0] + 0.5, y: h[1] + 0.5 };
  }
  return { x: 7.5, y: 7.5 };
}

function starPoints(cx: number, cy: number, r: number): string {
  const inner = r * 0.42;
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : inner;
    pts.push(`${(cx + rad * Math.cos(ang)).toFixed(3)},${(cy + rad * Math.sin(ang)).toFixed(3)}`);
  }
  return pts.join(" ");
}

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

function buildPawns(state: LudoGameState, selectable: readonly number[]): Pawn[] {
  const raw: Pawn[] = [];
  (state.players as LudoGameState["players"][number][]).forEach((p, c) => {
    p.tokens.forEach((t, i) => {
      if (t.steps >= FINISH_STEP) return;
      const pos = posFor(c as LudoColor, i, t.steps);
      raw.push({
        key: `${c}-${i}`,
        color: c as LudoColor,
        idx: i,
        steps: t.steps,
        x: pos.x,
        y: pos.y,
        movable: c === state.turn && selectable.includes(i),
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
  return (
    <div className="relative select-none mx-auto w-full max-w-[460px] p-1 sm:p-2">
      <div className="relative rounded-[6%] p-[2.5%]" style={WOOD_FRAME}>
        <div className="relative overflow-hidden rounded-[4%] shadow-[inset_0_2px_16px_rgba(0,0,0,.7)] ring-2 ring-black/70">
          <svg viewBox="0 0 15 15" className="block h-auto w-full" role="img" aria-label="AAA 5D Ludo Board">
            <defs>
              <linearGradient id="ls-track" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#EAE1CC" />
              </linearGradient>
              <linearGradient id="ls-yard" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FFFDF9" />
                <stop offset="1" stopColor="#E2D7BE" />
              </linearGradient>
              {([0, 1, 2, 3] as const).map((c) => (
                <linearGradient key={c} id={`ls-c${c}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="0.4" stopColor={LUDO_COLORS[c]!} />
                  <stop offset="1" stopColor={LUDO_COLORS[c]!} />
                </linearGradient>
              ))}
            </defs>

            {/* Board Background Surface */}
            <rect x="0" y="0" width="15" height="15" fill="#1A1107" />

            {/* Corner Bases */}
            {([0, 1, 2, 3] as const).map((c) => {
              const q = BASE_QUAD[c]!;
              const active = state.turn === c && state.winner === null;
              return (
                <g key={`base-${c}`}>
                  <rect x={q[0]} y={q[1]} width={6} height={6} fill={`url(#ls-c${c})`} stroke="#1F140A" strokeWidth={0.08} />
                  <rect
                    x={q[0] + 0.65}
                    y={q[1] + 0.65}
                    width={4.7}
                    height={4.7}
                    rx={0.5}
                    fill="url(#ls-yard)"
                    stroke="rgba(0,0,0,.35)"
                    strokeWidth={0.06}
                  />
                  {BASE_SPOTS[c]!.map(([sx, sy], i) => (
                    <circle
                      key={i}
                      cx={sx}
                      cy={sy}
                      r={0.68}
                      fill={LUDO_COLORS[c]!}
                      stroke="rgba(255,255,255,.9)"
                      strokeWidth={0.08}
                      opacity={0.95}
                    />
                  ))}
                  {active && (
                    <rect
                      x={q[0] + 0.1}
                      y={q[1] + 0.1}
                      width={5.8}
                      height={5.8}
                      rx={0.3}
                      fill="none"
                      stroke={LUDO_COLORS[c]!}
                      strokeWidth={0.16}
                      style={{ filter: `drop-shadow(0 0 6px ${LUDO_COLORS[c]!})` }}
                    />
                  )}
                </g>
              );
            })}

            {/* Track Path without messy diagonal line overlays */}
            {TRACK_PATH.map(([col, row], i) => {
              const isStart = START_SET.has(i);
              const isSafe = SAFE_CELLS.has(i);
              return (
                <g key={`trk-${i}`}>
                  <rect
                    x={col}
                    y={row}
                    width={1}
                    height={1}
                    fill={isStart ? LUDO_COLORS[START_INDEX.indexOf(i)]! : "url(#ls-track)"}
                    stroke="#2D1F0C"
                    strokeWidth={0.06}
                  />
                  {isSafe && (
                    <polygon
                      points={starPoints(col + 0.5, row + 0.5, isStart ? 0.38 : 0.32)}
                      fill={isStart ? "#FFFFFF" : "#1F140A"}
                      opacity={0.9}
                    />
                  )}
                </g>
              );
            })}

            {/* Home Corridors */}
            {([0, 1, 2, 3] as const).flatMap((c) =>
              HOME_PATH[c]!.map(([col, row], j) => {
                const inCentre = col >= 6 && col <= 8 && row >= 6 && row <= 8;
                if (inCentre) return null;
                return (
                  <g key={`home-${c}-${j}`}>
                    <rect x={col} y={row} width={1} height={1} fill={`url(#ls-c${c})`} stroke="#2D1F0C" strokeWidth={0.06} />
                  </g>
                );
              }),
            )}

            {/* Center Goal Triangles */}
            <polygon points="6,6 9,6 7.5,7.5" fill={LUDO_COLORS[3]!} stroke="#1F140A" strokeWidth={0.06} />
            <polygon points="9,6 9,9 7.5,7.5" fill={LUDO_COLORS[2]!} stroke="#1F140A" strokeWidth={0.06} />
            <polygon points="9,9 6,9 7.5,7.5" fill={LUDO_COLORS[1]!} stroke="#1F140A" strokeWidth={0.06} />
            <polygon points="6,9 6,6 7.5,7.5" fill={LUDO_COLORS[0]!} stroke="#1F140A" strokeWidth={0.06} />
            <polygon points={starPoints(7.5, 7.5, 1.0)} fill="#FFF9E6" stroke="rgba(0,0,0,.4)" strokeWidth={0.05} />
          </svg>

          {/* HTML Overlay Layer for Pawns */}
          <div className="absolute inset-0">
            {pawns.map((p) => {
              const dx = p.stackCount > 1 ? (p.stackIndex - (p.stackCount - 1) / 2) * 0.28 : 0;
              const col = LUDO_COLORS[p.color]!;
              const customAnimal = p.color === 0 && seedCustom?.animal ? seedCustom.animal : null;
              const animalEmoji = SEED_ANIMALS.find((a) => a.key === customAnimal)?.emoji ?? "🦁";

              return (
                <motion.button
                  key={p.key}
                  type="button"
                  aria-label={`${LUDO_NAMES[p.color]} pawn ${p.idx + 1}`}
                  disabled={!p.movable}
                  onClick={() => p.movable && onSelect(p.idx)}
                  initial={false}
                  animate={{ left: `${((p.x + dx) / GRID) * 100}%`, top: `${(p.y / GRID) * 100}%` }}
                  transition={{ type: "spring", stiffness: 240, damping: 22, mass: 0.55 }}
                  className="absolute z-20 aspect-square cursor-default place-items-center"
                  style={{ width: `${(100 / GRID) * 1.05}%`, transform: "translate(-50%,-62%)" }}
                >
                  <motion.span
                    key={`hop-${p.steps}`}
                    className="relative flex flex-col items-center h-full w-full justify-end"
                    initial={{ scale: 0.8, y: -8 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 14 }}
                  >
                    <span className="absolute bottom-0 h-[22%] w-[80%] rounded-[50%] bg-black/60 blur-[1px]" />
                    <span
                      className="relative z-10 flex h-[48%] w-[58%] items-center justify-center rounded-full border-2 border-white/80 shadow-md"
                      style={{
                        background: `radial-gradient(circle at 35% 30%, #fff, ${col} 65%, rgba(0,0,0,.6) 130%)`,
                      }}
                    >
                      <span className="text-xs sm:text-sm drop-shadow-sm">{p.color === 0 ? animalEmoji : "♟️"}</span>
                    </span>
                    <span
                      className="relative -mt-1 h-[36%] w-[38%] border-x border-white/40 shadow-inner"
                      style={{
                        background: `linear-gradient(90deg, rgba(0,0,0,.3), ${col} 50%, rgba(255,255,255,.4))`,
                      }}
                    />
                    <span
                      className="relative -mt-0.5 h-[20%] w-[85%] rounded-full border border-white/70 shadow-lg"
                      style={{
                        background: `linear-gradient(180deg, ${col}, rgba(0,0,0,.6))`,
                      }}
                    />
                  </motion.span>

                  {p.movable && (
                    <motion.span
                      className="pointer-events-none absolute inset-[-25%] rounded-full ring-2"
                      animate={{ scale: [1, 1.18, 1], opacity: [0.95, 0.4, 0.95] }}
                      transition={{ repeat: Infinity, duration: 1.1 }}
                      style={{ borderColor: col, boxShadow: `0 0 16px ${col}` }}
                    />
                  )}

                  {p.stackCount > 1 && p.stackIndex === p.stackCount - 1 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-black/90 px-1.5 text-[9px] font-black leading-4 text-amber-300">
                      ×{p.stackCount}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
