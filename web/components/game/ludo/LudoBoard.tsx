import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FINISH_STEP,
  trackCell,
  type LudoColor,
  type LudoGameState,
} from "@/lib/ludo/engine";

export interface Token {
  id: number;
  step: number;
}

export interface Player {
  color: 'red' | 'blue' | 'yellow' | 'green';
  name: string;
  tokens: Token[];
  avatar?: string;
  flag?: string;
}

const GRID = 15;

const START: Record<string, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};
const FINISH = 56;
const TRACK_LENGTH = 52;

// Standard Ludo Safe Star Tile Indices (Global track positions 0 to 51)
const SAFE_STAR_TILES = [0, 8, 13, 21, 26, 34, 39, 47];


// Exact color palette matching the reference board: Red, Blue, Yellow, Green
const COLORS = ["#D32F2F", "#1976D2", "#FBC02D", "#388E3C"]; 
const HEX_DARK = ["#9A0007", "#0D47A1", "#F57F17", "#1B5E20"];
const HEX_LIGHT = ["#FF6F60", "#63A4FF", "#FFF176", "#81C784"];

function colorOf(c: number) { return COLORS[c] || "#888"; }
function darkColorOf(c: number) { return HEX_DARK[c] || "#555"; }
function lightColorOf(c: number) { return HEX_LIGHT[c] || "#ccc"; }

const TRACK_PATH: ReadonlyArray<readonly [number, number]> = [
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5//, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
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
  0: [[2.1, 11.1], [3.9, 11.1], [2.1, 12.9], [3.9, 12.9]],
  1: [[11.1, 11.1], [12.9, 11.1], [11.1, 12.9], [12.9, 12.9]],
  2: [[11.1, 2.1], [12.9, 2.1], [11.1, 3.9], [12.9, 3.9]],
  3: [[2.1, 2.1], [3.9, 2.1], [2.1, 3.9], [3.9, 3.9]],
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
    const s = BASE_SPOTS[color]![tokenIdx]!;
    return { x: s[0], y: s[1] };
  }
  if (steps <= 50) {
    const cell = trackCell(color as LudoColor, steps);
    if (cell === null || cell === undefined) return { x: 7.5, y: 7.5 };
    const n = TRACK_PATH.length;
    const c = TRACK_PATH[((cell % n) + n) % n]!;
    return { x: c[0] + 0.5, y: c[1] + 0.5 };
  }
  if (steps < FINISH_STEP) {
    const h = HOME_PATH[color]![steps - 51]!;
    return { x: h[0] + 0.5, y: h[1] + 0.5 };
  }
  return { x: 7.5, y: 7.5 };
}

export function TempleSeed({ color, size = 30 }: { color: number; size?: number }) {
  const primary = colorOf(color);
  const dark = darkColorOf(color);
  const light = lightColorOf(color);

  return (
    <div 
      className="relative flex flex-col items-center justify-end pointer-events-none select-none drop-shadow-[0_8px_10px_rgba(0,0,0,0.8)]" 
      style={{ width: size, height: size * 1.45, transform: "translateY(-25%)" }}
    >
      <div 
        className="w-[52%] h-[36%] rounded-t-full rounded-b-sm z-30 shadow-[inset_-2px_-2px_5px_rgba(0,0,0,0.6),inset_2px_2px_5px_rgba(255,255,255,0.9)] border border-white/40"
        style={{ background: "radial-gradient(circle at center, ...)" }}
      />
      <div 
        className="w-[72%] h-[30%] -mt-[6%] rounded-sm z-20 shadow-[inset_0_0_6px_rgba(0,0,0,0.5)] border-t border-white/30"
        style={{ background: "linear-gradient(to right, " + dark + ", " + primary + ", " + light + ")" }}
      />
      <div 
        className="w-[96%] h-[34%] -mt-[4%] rounded-md z-10 shadow-[0_4px_8px_rgba(0,0,0,0.9)] border border-black/50"
        style={{ background: "linear-gradient(to bottom, " + primary + ", " + dark + ")" }}
      />
    </div>
  );
}

const BoardSurface = React.memo(() => {
  const gridStroke = "#E2E8F0"; // Clean light borders between track cells

  return (
    <svg viewBox="0 0 15 15" className="block h-full w-full rounded-2xl shadow-inner" style={{ backgroundColor: "#FFFFFF" }} role="img">
      {/* Center Home Triangles */}
      <g>
        <polygon points="6,6 9,6 7.5,7.5" fill={colorOf(2)} stroke="#CBD5E1" strokeWidth="0.02" />
        <polygon points="9,6 9,9 7.5,7.5" fill={colorOf(1)} stroke="#CBD5E1" strokeWidth="0.02" />
        <polygon points="6,9 9,9 7.5,7.5" fill={colorOf(0)} stroke="#CBD5E1" strokeWidth="0.02" />
        <polygon points="6,6 6,9 7.5,7.5" fill={colorOf(3)} stroke="#CBD5E1" strokeWidth="0.02" />
      </g>

      {/* Home Stretch Lanes */}
      <g>
        {[0, 1, 2, 3].map((c) => (
          <g key={"home-" + c}>
            {HOME_PATH[c]!.map((cell, j) => (
              <rect 
                key={"h-" + c + "-" + j} 
                x={cell[0]} y={cell[1]} 
                width={1} height={1} 
                fill={colorOf(c)} 
                stroke={gridStroke} 
                strokeWidth="0.03" 
              />
            ))}
          </g>
        ))}
      </g>

      {/* Main Outer Track */}
      <g>
        {TRACK_PATH.map((cell, i) => {
          const col = cell[0]!;
          const row = cell[1]!;
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
          if (i === 14) rot = 90;
          if (i === 28) rot = 180;
          if (i === 42) rot = 270;

          return (
            <g key={"trk-" + i}>
              <rect x={col} y={row} width={1} height={1} fill={cellColor} stroke={gridStroke} strokeWidth="0.03" />
              {(isSafe || isStart) && (
                <path 
                  d={"M" + (col+0.5) + "," + (row+0.2) + " L" + (col+0.6) + "," + (row+0.45) + " L" + (col+0.8) + "," + (row+0.45) + " L" + (col+0.65) + "," + (row+0.65) + " L" + (col+0.7) + "," + (row+0.8) + " L" + (col+0.5) + "," + (row+0.7) + " L" + (col+0.3) + "," + (row+0.8) + " L" + (col+0.35) + "," + (row+0.65) + " L" + (col+0.2) + "," + (row+0.45) + " L" + (col+0.4) + "," + (row+0.45) + " Z"} 
                  fill={isStart ? "#FFFFFF" : "#F59E0B"} 
                  stroke="#CBD5E1" 
                  strokeWidth="0.02" 
                />
              )}
              {isStart && (
                <path 
                  d={"M" + (col+0.5) + "," + (row+0.25) + " L" + (col+0.75) + "," + (row+0.6) + " L" + (col+0.25) + "," + (row+0.6) + " Z"} 
                  fill="#FCD34D" 
                  stroke="#D97706"
                  strokeWidth="0.03"
                  transform={"rotate(" + rot + "," + (col+0.5) + "," + (row+0.5) + ")"} 
                />
              )}
            </g>
          );
        })}
      </g>

      {/* Four Color Base Quadrants with Exact Rounded White Cards */}
      <g>
        {[0, 1, 2, 3].map((c) => {
          const q = BASE_QUAD[c]!;
          const col = colorOf(c);
          return (
            <g key={"base-" + c}>
              {/* Outer Solid Quadrant Background */}
              <rect 
                x={q[0]} y={q[1]} 
                width={6} height={6} 
                fill={col} 
              />
              {/* Large Heavily-Rounded White Card Container (Matching Reference) */}
              <rect 
                x={q[0] + 0.6} y={q[1] + 0.6} 
                width={4.8} height={4.8} 
                fill="#FFFFFF" 
                rx="1.2" 
                ry="1.2"
                filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))"
              />
              {/* 4 Inner Colored Pawn Destination Circles */}
              {BASE_SPOTS[c]!.map((spot, i) => (
                <circle 
                  key={"spot-" + c + "-" + i}
                  cx={spot[0]} cy={spot[1]} r={0.65} 
                  fill={col} 
                />
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
  offsetX?: number;
  offsetY?: number;
}

export interface LudoBoardProps {
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

export function LudoBoard({ state, selectable, onSelect }: LudoBoardProps) {
  const pawns = useMemo(() => {
    const rawPawns: PawnData[] = [];
    const players = (state.players as unknown as ReadonlyArray<{ tokens: ReadonlyArray<{ steps: number }> }>) || [];
    
    players.forEach((p: { tokens: ReadonlyArray<{ steps: number }> }, c: number) => {
      if (!p || !Array.isArray(p.tokens)) return;
      p.tokens.forEach((t: { steps: number }, i: number) => {
        if (t.steps >= FINISH_STEP) return;
        const pos = posFor(c, i, t.steps);
        rawPawnRecord(rawPawns, {
          key: c + "-" + i, color: c, idx: i, steps: t.steps,
          x: pos.x, y: pos.y,
          movable: c === Number(state.turn) && selectable.includes(i),
        });
      });
    });

    function rawPawnRecord(arr: PawnData[], item: PawnData) {
      arr.push(item);
    }

    const coordMap = new Map<string, PawnData[]>();
    rawPawns.forEach((p) => {
      const keyStr = p.x.toFixed(2) + "_" + p.y.toFixed(2);
      if (!coordMap.has(keyStr)) coordMap.set(keyStr, []);
      coordMap.get(keyStr)!.push(p);
    });

    const adjustedPawns: PawnData[] = [];
    coordMap.forEach((group) => {
      const total = group.length;
      group.forEach((p, index) => {
        let offsetX = 0, offsetY = 0;
        if (total === 2) {
          offsetX = index === 0 ? -0.15 : 0.15;
          offsetY = index === 0 ? -0.15 : 0.15;
        } else if (total === 3) {
          const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
          offsetX = Math.cos(angles[index]!) * 0.18;
          offsetY = Math.sin(angles[index]!) * 0.18;
        } else if (total >= 4) {
          const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
          offsetX = Math.cos(angles[index % 4]!) * 0.2;
          offsetY = Math.sin(angles[index % 4]!) * 0.2;
        }
        adjustedPawns.push({ ...p, offsetX, offsetY });
      });
    });
    return adjustedPawns;
  }, [state, selectable]);

  return (
    <div className="relative w-full aspect-square rounded-[24px] bg-[#1E293B]/90 p-2 shadow-2xl border border-white/15 mx-auto flex items-center justify-center">
      <div className="relative w-full h-full rounded-2xl bg-white overflow-hidden shadow-inner flex items-center justify-center">
        <BoardSurface />
        <div className="absolute inset-0 pointer-events-none">
          {pawns.map((p) => {
            const posX = p.x + (p.offsetX ?? 0);
            const posY = p.y + (p.offsetY ?? 0);

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
                  width: ((100 / GRID) * 1.25) + "%", 
                  height: ((100 / GRID) * 1.25) + "%" 
                }}
                className="absolute z-20 flex items-center justify-center focus:outline-none -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              >
                <motion.div 
                  key={"hop-" + p.steps} 
                  className="relative flex h-full w-full items-center justify-center will-change-transform" 
                  initial={{ y: -18, scale: 0.5 }} 
                  animate={{ y: 0, scale: 1 }} 
                  transition={{ type: "spring", stiffness: 480, damping: 14 }}
                >
                  <TempleSeed color={p.color} size={30} />
                </motion.div>
                {p.movable && (
                  <motion.div 
                    className="pointer-events-none absolute inset-[-20%] rounded-full border-2 border-cyan-400 shadow-[0_0_15px_#22d3ee]" 
                    animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0.3, 0.9] }} 
                    transition={{ repeat: Infinity, duration: 1.0 }} 
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

export default LudoBoard;

type LudoTokenState = { step: number };

function getValidMoves(player: Player, diceVal: number): number[] {
  const validSeedIds: number[] = [];

  player.tokens.forEach((token: LudoTokenState, index: number) => {
    // Case 1: Token is in base. Needs a 6 to exit.
    if (token.step === -1) {
      if (diceVal === 6) {
        validSeedIds.push(index);
      }
    } 
    // Case 2: Token is active on the board or home stretch
    else if (token.step < 58) {
      const targetPosition = token.step + diceVal;
      // Cannot exceed the final victory index (58)
      if (targetPosition <= 58) {
        validSeedIds.push(index);
      }
    }
  });

  return validSeedIds;
}
