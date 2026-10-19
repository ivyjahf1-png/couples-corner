"use client";
import { motion } from "framer-motion";
import { FINISH_STEP, LUDO_COLORS, LUDO_NAMES, SAFE_CELLS, START_INDEX, trackCell, type LudoColor, type LudoGameState } from "@/lib/ludo/engine";
import { LudoDice } from "./LudoDice";

/**
 * LudoBoard — the beveled 3D wood board.
 *
 * Geometry: a 15×15 SVG grid (viewBox units = cells) painted under a floating
 * HTML layer for pawns + the glowing centre dice hub.
 *  - 52-cell main track (TRACK_PATH) indexed exactly like engine.trackCell:
 *    cell 0 = (6,1) Blue start … cell 13 = (1,8) Red start … etc.
 *  - Four 6×6 corner bases with white yards + sockets.
 *  - 6-cell home corridors per colour; the last corridor cell sits on the
 *    matching centre triangle, so corridors read as continuous to the goal.
 *  - Star tiles on every SAFE cell; coloured fill + white star on starts.
 *
 * The centre holds a frosted glass hub with the 3D die and a "Tap to Roll"
 * label — click it to roll (enabled only when the local side may act).
 */
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

/** Base block origins (col,row) per seat: 0 TL · 1 BL · 2 BR · 3 TR. */
const BASE_QUAD: Record<number, readonly [number, number]> = { 0: [0, 0], 1: [0, 9], 2: [9, 9], 3: [9, 0] };

/** Pawn socket CENTRES (grid units) inside each 6×6 base. */
const BASE_SPOTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1.7, 1.7], [4.3, 1.7], [1.7, 4.3], [4.3, 4.3]], // TL (Red)
  1: [[1.7, 10.7], [4.3, 10.7], [1.7, 13.3], [4.3, 13.3]], // BL (Blue)
  2: [[10.7, 10.7], [13.3, 10.7], [10.7, 13.3], [13.3, 13.3]], // BR (Yellow)
  3: [[10.7, 1.7], [13.3, 1.7], [10.7, 4.3], [13.3, 4.3]], // TR (Green)
};

/** Home corridors (5 cells each, last cell sits on the centre triangle).
 *  Canonical arms (match the engine's BASE_QUAD geometry): Red TL row 7 ·
 *  Green TR col 7 · Yellow BR row 7 · Blue BL col 7. Heads touch their
 *  yard-side track. */
const HOME_PATH: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],  // Red → TL
  1: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],  // Green → TR (seat 1 renders green here)
  2: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // Yellow → BR
  3: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],  // Blue → BL
};

const START_SET: ReadonlySet<number> = new Set(START_INDEX);

const WOOD_FRAME: React.CSSProperties = {
  background:
    "repeating-linear-gradient(93deg, rgba(0,0,0,.16) 0 3px, rgba(255,255,255,.05) 3px 7px), linear-gradient(150deg,#7c5a31 0%,#5a3d1d 45%,#3f2a12 100%)",
  boxShadow:
    "inset 0 3px 0 rgba(255,224,170,.35), inset 0 -6px 12px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.4), 0 22px 48px rgba(0,0,0,.55)",
};

function trackXY(index: number): { x: number; y: number } {
  const n = TRACK_PATH.length;
  const c = TRACK_PATH[((index % n) + n) % n]!;
  return { x: c[0] + 0.5, y: c[1] + 0.5 };
}

/** Pawn CENTRE coordinates (grid units) for any token position. */
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

/** 5-pointed star polygon points around (cx, cy). */
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

/** Direction chevron for a corridor's first cell (toward the centre goal). */
function chevronPoints(color: number, col: number, row: number): string {
  // Seat mapping after geometry fix: 0 Red (TL), 1 Blue (BL), 2 Yellow (BR), 3 Green (TR)
  if (color === 0) return `${col + 0.32},${row + 0.18} ${col + 0.82},${row + 0.5} ${col + 0.32},${row + 0.82}`; // right
  if (color === 1) return `${col + 0.18},${row + 0.32} ${col + 0.5},${row + 0.82} ${col + 0.82},${row + 0.32}`; // up
  if (color === 2) return `${col + 0.18},${row + 0.18} ${col + 0.5},${row + 0.5} ${col + 0.82},${row + 0.18}`;   // left
  return `${col + 0.18},${row + 0.18} ${col + 0.5},${row + 0.5} ${col + 0.18},${row + 0.82}`;                       // down
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
  // Stack pawns that share a cell (safe-tile alliances / post-capture guards).
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

/**
 * Rotation (clockwise degrees) applied to the whole board — frame, track,
 * yards, and the centre dice hub — so the local player's seat is anchored to
 * the bottom edge of the screen, per the reference layout.
 *
 * The SVG draws seat bases at 0 TL · 1 BL · 2 BR · 3 TR (BASE_QUAD), while
 * the pods pin seats to 3 TL · 2 TR · 0 BL · 1 BR. Rotating the board 270°
 * clockwise lands each base exactly under its own pod — seat 0 (the local
 * player) ends bottom-left, matching engine.ts's documented geometry
 * ("seat 0 Red → BOTTOM-LEFT base"). The hub label and stack badges
 * counter-rotate so their text stays upright.
 */
const BOARD_ROTATION = 270;

export function LudoBoard({
  state,
  selectable,
  onSelect,
  dice,
  rolling,
  canRollNow,
  onRoll,
  hubLabel,
}: {
  state: LudoGameState;
  selectable: readonly number[];
  onSelect: (tokenIdx: number) => void;
  dice: number;
  rolling: boolean;
  canRollNow: boolean;
  onRoll: () => void;
  /** Centre-hub caption: "Tap to Roll" / "Rolling…" / "{Name} to roll". */
  hubLabel: string;
}) {
  const rotation = BOARD_ROTATION;
  const pawns = buildPawns(state, selectable);
  return (
    <div className="relative select-none">
      {/* Beveled wooden frame (grain + light/shadow bevel via layered CSS) */}
      <div
        className="relative rounded-[7%] p-[3.4%]"
        style={{
          ...WOOD_FRAME,
          transform: `rotate(${rotation}deg)`,
          transition: "transform 0.3s ease",
        }}
      >
        <div className="relative overflow-hidden rounded-[4%] shadow-[inset_0_2px_12px_rgba(0,0,0,.6)] ring-1 ring-black/60">
          <svg viewBox="0 0 15 15" className="block h-auto w-full" role="img" aria-label="Ludo Superstar 3D board">
            <defs>
  <linearGradient id="ls-track" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stopColor="#FFFDF4" />
    <stop offset="1" stopColor="#EDE4CC" />
  </linearGradient>
  <linearGradient id="ls-yard" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stopColor="#FFFDF6" />
    <stop offset="1" stopColor="#E9E0C9" />
  </linearGradient>
  {([0, 1, 2, 3] as const).map((c) => (
    <linearGradient key={c} id={`ls-c${c}`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
      <stop offset="0.38" stopColor={LUDO_COLORS[c]!} />
      <stop offset="1" stopColor={LUDO_COLORS[c]!} />
    </linearGradient>
  ))}
</defs>
{/* surface base (guards hairline seams between tiles) */}
<rect x="0" y="0" width="15" height="15" fill="#241708" />
{/* corner bases: coloured block + white yard + sockets + active glow */}
{([0, 1, 2, 3] as const).map((c) => {
  const q = BASE_QUAD[c]!;
  const active = state.turn === c && state.winner === null;
  return (
    <g key={`base-${c}`}>
      <rect x={q[0]} y={q[1]} width={6} height={6} fill={`url(#ls-c${c})`} stroke="#2A1E0F" strokeWidth={0.07} />
      <rect
        x={q[0] + 0.7}
        y={q[1] + 0.7}
        width={4.6}
        height={4.6}
        rx={0.45}
        fill="url(#ls-yard)"
        stroke="rgba(0,0,0,.3)"
        strokeWidth={0.06}
      />
      {BASE_SPOTS[c]!.map(([sx, sy], i) => (
        <circle
          key={i}
          cx={sx}
          cy={sy}
          r={0.62}
          fill={LUDO_COLORS[c]!}
          stroke="rgba(255,255,255,.8)"
          strokeWidth={0.07}
          opacity={0.92}
        />
      ))}
      {active ? (
        <rect
          x={q[0] + 0.14}
          y={q[1] + 0.14}
          width={5.72}
          height={5.72}
          rx={0.22}
          fill="none"
          stroke="#FDE68A"
          strokeWidth={0.14}
          style={{ filter: "drop-shadow(0 0 2px rgba(253,230,138,.95))" }}
        />
      ) : null}
    </g>
  );
})}
{/* 52 track cells: ivory tiles, dark star tiles, coloured start squares */}
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
        stroke="#3A2B15"
        strokeWidth={0.05}
      />
      {isSafe ? (
        <polygon
          points={starPoints(col + 0.5, row + 0.5, isStart ? 0.36 : 0.3)}
          fill={isStart ? "#FFFFFF" : "#2A1E0F"}
          opacity={isStart ? 0.95 : 0.85}
        />
      ) : null}
      {isStart ? (
        <g fill="none">
          <rect x={col + 0.4} y={row + 0.34} width={0.2} height={0.22} rx={0.05} fill="#B45309" stroke="#2A1E0F" strokeWidth={0.05} />
          <path d={`M${col + 0.42} ${row + 0.38} Q${col + 0.5} ${row + 0.2} ${col + 0.58} ${row + 0.38}`} stroke="#B45309" strokeWidth={0.06} strokeLinecap="round" />
          <circle cx={col + 0.5} cy={row + 0.49} r={0.04} fill="#2A1E0F" />
        </g>
      ) : null}
    </g>
  );
})}
{/* home corridors (outer cells) with direction chevrons on the entry tile */}
{([0, 1, 2, 3] as const).flatMap((c) =>
  HOME_PATH[c]!.map(([col, row], j) => {
    const inCentre = col >= 6 && col <= 8 && row >= 6 && row <= 8;
    if (inCentre) return null; // corridor tip sits on the matching centre triangle
    return (
      <g key={`home-${c}-${j}`}>
        <rect x={col} y={row} width={1} height={1} fill={`url(#ls-c${c})`} stroke="#3A2B15" strokeWidth={0.05} />
        {j === 0 ? <polygon points={chevronPoints(c, col, row)} fill="#FFFFFF" opacity={0.9} /> : null}
      </g>
    );
  }),
)}
{/* centre goal: four triangles meeting at the star emblem */}
<polygon points="6,6 9,6 7.5,7.5" fill={LUDO_COLORS[3]!} stroke="#2A1E0F" strokeWidth={0.05} />
<polygon points="9,6 9,9 7.5,7.5" fill={LUDO_COLORS[2]!} stroke="#2A1E0F" strokeWidth={0.05} />
<polygon points="9,9 6,9 7.5,7.5" fill={LUDO_COLORS[1]!} stroke="#2A1E0F" strokeWidth={0.05} />
<polygon points="6,9 6,6 7.5,7.5" fill={LUDO_COLORS[0]!} stroke="#2A1E0F" strokeWidth={0.05} />
<polygon points={starPoints(7.5, 7.5, 0.92)} fill="#FFF7E0" stroke="rgba(0,0,0,.3)" strokeWidth={0.04} opacity={0.95} />
          </svg>
          <div className="absolute inset-0">
            {pawns.map((p) => {
  const dx = p.stackCount > 1 ? (p.stackIndex - (p.stackCount - 1) / 2) * 0.24 : 0;
  const col = LUDO_COLORS[p.color]!;
  return (
    <motion.button
      key={p.key}
      type="button"
      aria-label={`${LUDO_NAMES[p.color]} pawn ${p.idx + 1}`}
      disabled={!p.movable}
      onClick={() => {
        if (p.movable) onSelect(p.idx);
      }}
      initial={false}
      animate={{ left: `${((p.x + dx) / GRID) * 100}%`, top: `${(p.y / GRID) * 100}%` }}
      transition={{ type: "spring", stiffness: 230, damping: 24, mass: 0.6 }}
      className="absolute z-20 aspect-square cursor-default place-items-center"
      style={{ width: `${(100 / GRID) * 0.74}%`, transform: "translate(-50%,-50%)" }}
    >
      <motion.span
        key={`hop-${p.steps}`}
        className="relative block h-full w-full"
        initial={{ scale: 0.78, y: -7 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 430, damping: 15 }}
      >
        <span
          className="absolute bottom-[2%] left-1/2 h-[24%] w-[86%] -translate-x-1/2 rounded-[50%]"
          style={{ background: "radial-gradient(ellipse, rgba(0,0,0,.5), transparent 70%)" }}
        />
        <span
          className="absolute left-1/2 top-0 h-[46%] w-[46%] -translate-x-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, #fff, ${col} 62%, rgba(0,0,0,.55) 130%)`,
            boxShadow: "0 2px 3px rgba(0,0,0,.5), inset 0 -1px 2px rgba(0,0,0,.4)",
          }}
        />
        <span
          className="absolute bottom-0 left-1/2 h-[56%] w-[84%] -translate-x-1/2"
          style={{
            borderRadius: "48% 48% 50% 50% / 62% 62% 38% 38%",
            background: `radial-gradient(circle at 36% 26%, rgba(255,255,255,.8), ${col} 55%, rgba(0,0,0,.55) 135%)`,
            boxShadow:
              "0 6px 10px rgba(0,0,0,.55), inset 0 -3px 5px rgba(0,0,0,.45), inset 0 3px 5px rgba(255,255,255,.4)",
          }}
        />
        <span
          className="absolute bottom-[16%] left-1/2 h-[14%] w-[42%] -translate-x-1/2 rounded-full opacity-70"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,0))" }}
        />
      </motion.span>
      {p.movable ? (
        <motion.span
          className="pointer-events-none absolute inset-[-22%] rounded-full ring-2 ring-amber-300"
          animate={{ scale: [1, 1.16, 1], opacity: [0.95, 0.4, 0.95] }}
          transition={{ repeat: Infinity, duration: 1.1 }}
        />
      ) : null}
      {p.stackCount > 1 && p.stackIndex === p.stackCount - 1 ? (
        <span
          className="absolute -right-1 -top-1 rounded-full bg-black/80 px-1 text-[8px] font-black leading-4 text-amber-300"
          style={{ transform: `rotate(${-BOARD_ROTATION}deg)` }}
        >
          ×{p.stackCount}
        </span>
      ) : null}
    </motion.button>
  );
})}
{/* Glowing centre dice hub — tap to roll */}
<button
  type="button"
  onClick={onRoll}
  disabled={!canRollNow}
  aria-label="Roll the dice"
  className={`absolute left-1/2 top-1/2 z-10 flex aspect-square w-[31%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full border backdrop-blur-md transition active:scale-95 ${
    canRollNow
      ? "cursor-pointer border-sky-300/70 bg-slate-900/60 shadow-[0_0_36px_rgba(56,189,248,.55),inset_0_0_26px_rgba(56,189,248,.22)]"
      : "cursor-default border-white/15 bg-slate-900/50 shadow-[inset_0_0_20px_rgba(0,0,0,.5)]"
  }`}
>
    {/* The whole board is rotated; flip the hub contents back upright. */}
    <span
      className="flex flex-col items-center gap-0.5"
      style={{ transform: `rotate(${-BOARD_ROTATION}deg)` }}
    >
      <LudoDice value={dice} rolling={rolling} active={canRollNow} size={44} />
      <span
        className={`text-[9px] font-black uppercase tracking-[.14em] sm:text-[10px] ${
          canRollNow ? "text-sky-200" : "text-white/70"
        }`}
      >
        {hubLabel}
      </span>
    </span>
</button>
          </div>
        </div>
      </div>
    </div>
  );
}