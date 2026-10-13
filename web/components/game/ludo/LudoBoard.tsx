"use client";
import { LUDO_COLORS, SAFE_CELLS, START_INDEX, trackCell, type LudoColor, type LudoGameState } from "@/lib/ludo/engine";

const CELL = 34;
const GRID = 15;
const SIZE = CELL * GRID;

function cellXY(index: number): { x: number; y: number } {
  const path: Array<[number, number]> = [
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
  const c = path[index % 52]!;
  return { x: c[0] * CELL, y: c[1] * CELL };
}

const BASE_SPOTS: Record<number, Array<[number, number]>> = {
  0: [[2, 2], [3.6, 2], [2, 3.6], [3.6, 3.6]],
  1: [[11, 2], [12.6, 2], [11, 3.6], [12.6, 3.6]],
  2: [[11, 11], [12.6, 11], [11, 12.6], [12.6, 12.6]],
  3: [[2, 11], [3.6, 11], [2, 12.6], [3.6, 12.6]],
};

const HOME_PATH: Record<number, Array<[number, number]>> = {
  0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

export function LudoBoard({ state, selectable, onSelect }: { state: LudoGameState; selectable: number[]; onSelect: (i: number) => void }) {
  const tokens: Array<{ color: LudoColor; idx: number; x: number; y: number; movable: boolean }> = [];
  (state.players as Array<{ tokens: Array<{ steps: number }> }>).forEach((p, c) => {
    p.tokens.forEach((t, i) => {
      let x = 0;
      let y = 0;
      if (t.steps === -1) {
        const s = BASE_SPOTS[c]![i]!;
        x = s[0] * CELL;
        y = s[1] * CELL;
      } else if (t.steps <= 50) {
        const cell = trackCell(c as LudoColor, t.steps)!;
        const p2 = cellXY(cell);
        x = p2.x;
        y = p2.y;
      } else if (t.steps < 57) {
        const h = HOME_PATH[c]![t.steps - 51]!;
        x = h[0] * CELL;
        y = h[1] * CELL;
      } else {
        x = 7 * CELL;
        y = 7 * CELL;
      }
      tokens.push({ color: c as LudoColor, idx: i, x, y, movable: c === state.turn && selectable.includes(i) });
    });
  });
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full rounded-2xl" role="img" aria-label="Ludo board">
      <rect x={0} y={0} width={SIZE} height={SIZE} fill="#0f172a" rx={18} />
      {([0, 1, 2, 3] as LudoColor[]).map((c) => (
        <g key={c}>
          <rect x={(c === 0 || c === 3 ? 0 : 9) * CELL} y={(c === 0 || c === 1 ? 0 : 9) * CELL} width={6 * CELL} height={6 * CELL} fill={LUDO_COLORS[c]} opacity={0.9} rx={12} />
          <rect x={(c === 0 || c === 3 ? 1 : 10) * CELL} y={(c === 0 || c === 1 ? 1 : 10) * CELL} width={4 * CELL} height={4 * CELL} fill="#f8fafc" rx={10} />
        </g>
      ))}
      {Array.from({ length: 52 }, (_, i) => {
        const { x, y } = cellXY(i);
        const isStart = (START_INDEX as readonly number[]).includes(i);
        const isSafe = SAFE_CELLS.has(i);
        return (
          <g key={i}>
            <rect x={x + 1} y={y + 1} width={CELL - 2} height={CELL - 2} fill={isStart ? "#fbbf24" : isSafe ? "#e2e8f0" : "#ffffff"} stroke="#cbd5e1" rx={6} />
            {isSafe && !isStart ? <text x={x + CELL / 2} y={y + CELL / 2 + 5} textAnchor="middle" fontSize={14}>★</text> : null}
          </g>
        );
      })}
      <rect x={6 * CELL} y={6 * CELL} width={3 * CELL} height={3 * CELL} fill="#f59e0b" rx={10} />
      {tokens.map((t, k) => (
        <g key={k} onClick={() => { if (t.movable) onSelect(t.idx); }} style={{ cursor: t.movable ? "pointer" : "default" }}>
          {t.movable ? <circle cx={t.x + CELL / 2} cy={t.y + CELL / 2} r={15} fill="none" stroke="#fff" strokeWidth={2.5} /> : null}
          <circle cx={t.x + CELL / 2} cy={t.y + CELL / 2} r={11} fill={LUDO_COLORS[t.color]} stroke="#fff" strokeWidth={2.5} />
        </g>
      ))}
    </svg>
  );
}
