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

/* ═══════════════════════════════════════════════════════════════════
   AAA 5D LUDO BOARD — Geometry & Constants (game logic preserved)
   ═══════════════════════════════════════════════════════════════════ */

const GRID = 15;

/** 52-cell main track as (col,row) grid coordinates, clockwise from top. */
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

/** Base block origins per quadrant (col,row): 0=Red BL · 1=Blue BR · 2=Yellow TR · 3=Green TL. */
const BASE_QUAD: Record<number, readonly [number, number]> = {
  0: [0, 9],
  1: [9, 9],
  2: [9, 0],
  3: [0, 0],
};

/** Pawn socket centres inside each 6×6 base. */
const BASE_SPOTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1.7, 10.7], [4.3, 10.7], [1.7, 13.3], [4.3, 13.3]], // BL (Red)
  1: [[10.7, 10.7], [13.3, 10.7], [10.7, 13.3], [13.3, 13.3]], // BR (Blue)
  2: [[10.7, 1.7], [13.3, 1.7], [10.7, 4.3], [13.3, 4.3]], // TR (Yellow)
  3: [[1.7, 1.7], [4.3, 1.7], [1.7, 4.3], [4.3, 4.3]], // TL (Green)
};

/** Home corridors (6 cells each) — clockwise arms into the centre triangles. */
const HOME_PATH: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Red  → horizontal LEFT arm, into centre from left
  1: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Blue → vertical BOTTOM arm, into centre from below
  2: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Yellow → horizontal RIGHT arm, into centre from right
  3: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Green → vertical TOP arm, into centre from above
};

const START_SET: ReadonlySet<number> = new Set(START_INDEX);
const CENTRE = { x: 7.5, y: 7.5 };

/** Deep-walnut outer frame styling for the board housing. */
const WOOD_FRAME: React.CSSProperties = {
  background:
    "repeating-linear-gradient(93deg, rgba(0,0,0,.18) 0 3px, rgba(255,255,255,.06) 3px 7px), linear-gradient(150deg,#8a5e31 0%,#5a3d1d 50%,#2d1a08 100%)",
  boxShadow:
    "inset 0 3px 0 rgba(255,224,170,.4), inset 0 -6px 14px rgba(0,0,0,.7), inset 0 0 0 2px rgba(0,0,0,.5), 0 24px 52px rgba(0,0,0,.6)",
};

/* ═══════════════════════════════════════════════════════════════════
   Colour palette (5D glossy)
   ═══════════════════════════════════════════════════════════════════ */

const COLOR_META: Record<number, { glow: string; dark: string; light: string }> = {
  0: { glow: "#ef4444", dark: "#b91c1c", light: "#fca5a5" },   // Red
  1: { glow: "#3b82f6", dark: "#1d4ed8", light: "#93c5fd" },   // Blue
  2: { glow: "#eab308", dark: "#ca8a04", light: "#fde047" },   // Yellow
  3: { glow: "#22c55e", dark: "#15803d", light: "#86efac" },   // Green
};

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

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
    return cell === null ? CENTRE : trackXY(cell);
  }
  if (steps < FINISH_STEP) {
    const h = HOME_PATH[color]![steps - 51]!;
    return { x: h[0] + 0.5, y: h[1] + 0.5 };
  }
  return CENTRE;
}

function starPoints(cx: number, cy: number, r: number): string {
  const inner = r * 0.42;
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const ang = (-Math.PI / 2) + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : inner;
    pts.push(
      `${(cx + rad * Math.cos(ang)).toFixed(3)},${(cy + rad * Math.sin(ang)).toFixed(3)}`
    );
  }
  return pts.join(" ");
}

/* ═══════════════════════════════════════════════════════════════════
   Board geometry rendering (SVG)
   ═══════════════════════════════════════════════════════════════════ */

function BoardSurface({ activeSeat }: { activeSeat: LudoColor | null }) {
  return (
    <svg
      viewBox="0 0 15 15"
      className="block h-auto w-full max-w-[460px] aspect-square"
      role="img"
      aria-label="AAA 5D Ludo Board"
    >
      <defs>
        {/* Glossy base gradients per colour */}
        {([0, 1, 2, 3] as const).map((c) => {
          const col = LUDO_COLORS[c]!;
          const meta = COLOR_META[c]!;
          return (
            <linearGradient
              key={`base-${c}`}
              id={`base-grad-${c}`}
              x1="0" y1="0" x2="1" y2="1"
            >
              <stop offset="0" stopColor={meta.light} stopOpacity="0.9" />
              <stop offset="0.35" stopColor={col} />
              <stop offset="1" stopColor={meta.dark} />
            </linearGradient>
          );
        })}

        {/* Track tile gradient */}
        <linearGradient id="track-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFDF9" stopOpacity="0.92" />
          <stop offset="1" stopColor="#E2D7BE" />
        </linearGradient>

        {/* Yard / base block gradient */}
        <linearGradient id="yard-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EAE1CC" />
        </linearGradient>

        {/* Centre triangle gradients */}
        {([0, 1, 2, 3] as const).map((c) => {
          const col = LUDO_COLORS[c]!;
          const meta = COLOR_META[c]!;
          return (
            <linearGradient
              key={`centre-${c}`}
              id={`centre-grad-${c}`}
              x1="0" y1="0" x2="1" y2="1"
            >
              <stop offset="0" stopColor={meta.light} stopOpacity="0.95" />
              <stop offset="1" stopColor={col} />
            </linearGradient>
          );
        })}

        {/* Drop shadow filter for tokens */}
        <filter id="token-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
          <feOffset dx="0.5" dy="0.8" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.45" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer board surface — deep wood */}
      <rect
        x="0" y="0" width="15" height="15"
        fill="#1A1107"
        rx="1.2"
        stroke="#2D1F0C"
        strokeWidth="0.14"
      />

      {/* ═══════════════════════════════════════════════════════════════
          CENTRE HOME — four colour triangles meeting at centre point
          ══════════════════════════════════════════════════════════════ */}
      <g>
        {/* Green — top triangle */}
        <polygon
          points="7.5,1 7.5,6 1,6"
          fill="url(#centre-grad-3)"
          stroke="#2D1F0C"
          strokeWidth="0.08"
        />
        {/* Yellow — right triangle */}
        <polygon
          points="14,7.5 9,7.5 9,14"
          fill="url(#centre-grad-2)"
          stroke="#2D1F0C"
          strokeWidth="0.08"
        />
        {/* Blue — bottom triangle */}
        <polygon
          points="7.5,14 7.5,9 14,9"
          fill="url(#centre-grad-1)"
          stroke="#2D1F0C"
          strokeWidth="0.08"
        />
        {/* Red — left triangle */}
        <polygon
          points="1,7.5 1,1 6,1 6,7.5"
          fill="url(#centre-grad-0)"
          stroke="#2D1F0C"
          strokeWidth="0.08"
        />
        {/* Centre pinwheel seam */}
        <path
          d="M7.5,1 L7.5,7.5 L1,7.5 M7.5,14 L7.5,7.5 L14,7.5 M1,7.5 L7.5,7.5 L7.5,1 M14,7.5 L7.5,7.5 L7.5,14"
          stroke="#2D1F0C"
          strokeWidth="0.1"
          fill="none"
        />
      </g>

      {/* ═══════════════════════════════════════════════════════════════
          HOME CORRIDORS / ARMS — 6-cell colour paths into centre
          ══════════════════════════════════════════════════════════════ */}
      <g>
        {([0, 1, 2, 3] as const).flatMap((c) => {
          const col = LUDO_COLORS[c]!;
          return HOME_PATH[c]!.map(([colX, rowY], j) => (
            <rect
              key={`home-${c}-${j}`}
              x={colX} y={rowY} width={1} height={1}
              fill={col}
              fillOpacity="0.92"
              stroke="#2D1F0C"
              strokeWidth="0.06"
            />
          ));
        })}
      </g>

      {/* ═══════════════════════════════════════════════════════════════
          BASE ZONES — 6×6 glossy colour blocks in each corner
          ══════════════════════════════════════════════════════════════ */}
      <g>
        {([0, 1, 2, 3] as const).map((c) => {
          const q = BASE_QUAD[c]!;
          const col = LUDO_COLORS[c]!;
          return (
            <g key={`base-${c}`}>
              <rect
                x={q[0]} y={q[1]} width={6} height={6}
                fill={`url(#base-grad-${c})`}
                stroke="#1F140A"
                strokeWidth="0.08"
                rx="0.9"
              />
              {/* Token socket positions (subtle rings) */}
              {BASE_SPOTS[c]!.map(([sx, sy], i) => (
                <circle
                  key={`socket-${c}-${i}`}
                  cx={sx} cy={sy} r={0.62}
                  fill="none"
                  stroke="rgba(255,255,255,.25)"
                  strokeWidth="0.05"
                  strokeDasharray="0.4 0.4"
                />
              ))}
              {/* Active-player halo */}
              {activeSeat === c && (
                <rect
                  x={q[0] + 0.15}
                  y={q[1] + 0.15}
                  width={5.7}
                  height={5.7}
                  rx={0.8}
                  fill="none"
                  stroke={col}
                  strokeWidth={0.18}
                  style={{ filter: `drop-shadow(0 0 5px ${col})` }}
                />
              )}
            </g>
          );
        })}
      </g>

      {/* ══════════════════════════════════════════════════════════════
          TRACK PATH — 52 high-contrast cells around the perimeter
          ══════════════════════════════════════════════════════════════ */}
      <g>
        {TRACK_PATH.map(([col, row], i) => {
          const isSafe = SAFE_CELLS.has(i);
          const isStart = START_SET.has(i);
          const cellColor = isStart
            ? LUDO_COLORS[START_INDEX.indexOf(i)]!
            : "url(#track-grad)";
          return (
            <g key={`trk-${i}`}>
              <rect
                x={col} y={row} width={1} height={1}
                fill={cellColor}
                fillOpacity={isStart ? 0.98 : 0.92}
                stroke="#2D1F0C"
                strokeWidth="0.06"
              />
              {/* Safe-house shield icon */}
              {isSafe && (
                <path
                  d={`M${col + 0.5},${row + 0.28} L${col + 0.72},${row + 0.62} L${col + 0.28},${row + 0.62} Z`}
                  fill="#FFFFFF"
                  stroke="none"
                />
              )}
              {/* Start-gate star */}
              {isStart && (
                <polygon
                  points={starPoints(col + 0.5, row + 0.5, 0.34)}
                  fill="#FFFFFF"
                  stroke="#2D1F0C"
                  strokeWidth="0.04"
                />
              )}
            </g>
          );
        })}
      </g>

      {/* ══════════════════════════════════════════════════════════════
          DIRECTIONAL ARROWS — clockwise movement cues on each track side
          ══════════════════════════════════════════════════════════════ */}
      <g>
        {/* Left side (going down) */}
        {([6, 4, 2] as const).map((i) => {
          const [cx, cy] = TRACK_PATH[i];
          return (
            <path
              key={`arr-l-${i}`}
              d={`M${cx + 0.5},${cy + 0.35} L${cx + 0.5},${cy + 0.65}`}
              stroke="#FFFFFF"
              strokeWidth="0.07"
              strokeLinecap="round"
              markerEnd="url(#arrow-head-white)"
            />
          );
        })}
        {/* Bottom side (going right) */}
        {([12, 10, 8] as const).map((i) => {
          const [cx, cy] = TRACK_PATH[i];
          return (
            <path
              key={`arr-b-${i}`}
              d={`M${cx + 0.35},${cy + 0.5} L${cx + 0.65},${cy + 0.5}`}
              stroke="#FFFFFF"
              strokeWidth="0.07"
              strokeLinecap="round"
              markerEnd="url(#arrow-head-white)"
            />
          );
        })}
        {/* Right side (going up) */}
        {([24, 26, 28] as const).map((i) => {
          const [cx, cy] = TRACK_PATH[i];
          return (
            <path
              key={`arr-r-${i}`}
              d={`M${cx + 0.5},${cy + 0.65} L${cx + 0.5},${cy + 0.35}`}
              stroke="#FFFFFF"
              strokeWidth="0.07"
              strokeLinecap="round"
              markerEnd="url(#arrow-head-white)"
            />
          );
        })}
        {/* Top side (going left) */}
        {([36, 38, 40] as const).map((i) => {
          const [cx, cy] = TRACK_PATH[i];
          return (
            <path
              key={`arr-t-${i}`}
              d={`M${cx + 0.65},${cy + 0.5} L${cx + 0.35},${cy + 0.5}`}
              stroke="#FFFFFF"
              strokeWidth="0.07"
              strokeLinecap="round"
              markerEnd="url(#arrow-head-white)"
            />
          );
        })}
      </g>

      {/* White arrow-head marker (defined once) */}
      <defs>
        <marker id="arrow-head-white" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 Z" fill="#FFFFFF" />
        </marker>
      </defs>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Pawn computation (game logic — unchanged)
   ═══════════════════════════════════════════════════════════════════ */

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
  const activeSeat: LudoColor | null = state.winner === null ? state.turn : null;
  return (
    <div className="relative select-none mx-auto w-full max-w-[460px] p-1 sm:p-2">
      <div className="relative rounded-[6%] p-[2.5%]" style={WOOD_FRAME}>
        <div className="relative overflow-hidden rounded-[4%] shadow-[inset_0_2px_16px_rgba(0,0,0,.7)] ring-2 ring-black/70">
          <BoardSurface activeSeat={activeSeat} />

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
                  animate={{
                    left: `${((p.x + dx) / GRID) * 100}%`,
                    top: `${(p.y / GRID) * 100}%`,
                    x: "-50%",
                    y: "-62%",
                  }}
                  transition={{ type: "spring", stiffness: 240, damping: 22, mass: 0.55 }}
                  className="absolute z-20 grid aspect-square cursor-default place-items-center"
                  style={{ width: `${(100 / GRID) * 1.05}%` }}
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
