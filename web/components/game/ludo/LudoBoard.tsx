"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LUDO_COLORS,
  SAFE_CELLS,
  START_INDEX,
  trackCell,
  type LudoColor,
  type LudoGameState,
} from "@/lib/ludo/engine";
import { getSeedStyle, type SeedStyleId } from "@/lib/game/seedStyles";

const CELL = 34;
const GRID = 15;
const SIZE = CELL * GRID;

// 52-cell main track as grid coordinates (col, row) in a 15x15 board.
const TRACK_PATH: Array<[number, number]> = [
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

function trackXY(index: number): { x: number; y: number } {
  const c = TRACK_PATH[((index % 52) + 52) % 52]!;
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

const CORNERS: Record<number, { x: number; y: number }> = {
  0: { x: 0, y: 0 },
  1: { x: 9, y: 0 },
  2: { x: 9, y: 9 },
  3: { x: 0, y: 9 },
};

// Direction of travel along each color's home corridor (entry → center goal).
// Rendered as a chevron on the corridor's entry tile.
const HOME_ARROW: Record<number, string> = {
  0: "↓", // column 7, rows 1→5 (downward)
  1: "→", // row 7, cols 1→5 (rightward)
  2: "↑", // column 7, rows 13→9 (upward)
  3: "←", // row 7, cols 13→9 (leftward)
};

function posFor(color: LudoColor, tokenIdx: number, steps: number): { x: number; y: number } {
  if (steps === -1) {
    const s = BASE_SPOTS[color]![tokenIdx]!;
    return { x: s[0] * CELL, y: s[1] * CELL };
  }
  if (steps <= 50) {
    const cell = trackCell(color, steps);
    return cell === null ? { x: 7 * CELL, y: 7 * CELL } : trackXY(cell);
  }
  if (steps < 57) {
    const h = HOME_PATH[color]![steps - 51]!;
    return { x: h[0] * CELL, y: h[1] * CELL };
  }
  return { x: 7 * CELL, y: 7 * CELL };
}

interface Pawn {
  color: LudoColor;
  idx: number;
  steps: number;
  x: number;
  y: number;
  movable: boolean;
  stackIndex: number;
  stackCount: number;
}

interface Burst { id: number; x: number; y: number; }

const WOOD_TILE: React.CSSProperties = {
  background: "linear-gradient(150deg,#5b4326 0%,#3a2a14 45%,#241708 100%)",
  boxShadow:
    "inset 0 2px 0 rgba(255,225,170,.28), inset 0 -3px 6px rgba(0,0,0,.55), 0 4px 8px rgba(0,0,0,.45)",
};

export function LudoBoard({
  state,
  selectable,
  onSelect,
  activeSeat = 0,
  seedStyleId,
}: {
  state: LudoGameState;
  selectable: number[];
  onSelect: (i: number) => void;
  /** Seat whose turn it is — the board animates to re-orient so that player's home
   * base sits bottom-left, matching Ludo Superstar's client-centric view. */
  activeSeat?: number;
  /** Pawn theme chosen in the lobby; applied to the local player's (seat 0) pawns. */
  seedStyleId?: SeedStyleId;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // Player-centric orientation: rotate the board so the active player's home
  // base always sits on the bottom-left of the screen. The CSS transition on
  // the board element smooths the re-orient between turns.
  const orientDeg = ((3 - (((activeSeat % 4) + 4) % 4)) % 4) * 90;
  const skin = seedStyleId ? getSeedStyle(seedStyleId) : null;
  const prevSteps = useRef<number[]>([]);
  // Sticky per-pawn hop animations: once a hop keyframe sequence is built it must
  // survive re-renders (burst cleanup, dice ticks, AI turns) until it finishes,
  // otherwise flipping `animate` back to a scalar target mid-flight truncates it.
  const hopAnims = useRef<Record<string, { xs: number[]; ys: number[]; dur: number }>>({});
  const [bursts, setBursts] = useState<Burst[]>([]);

  // Responsively scale the fixed-size board down to fit its container.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setScale(Math.min(1, el.clientWidth / SIZE));
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Detect captures (a token returning to base) and spawn particle bursts.
  useEffect(() => {
    const cur: number[] = [];
    (state.players as Array<{ tokens: Array<{ steps: number }> }>).forEach((p) =>
      p.tokens.forEach((t) => cur.push(t.steps)),
    );
    const prev = prevSteps.current;
    if (prev.length === cur.length) {
      const fresh: Burst[] = [];
      cur.forEach((s, k) => {
        if (prev[k]! >= 0 && s === -1) {
          const color = Math.floor(k / 4) as LudoColor;
          const i = k % 4;
          const p = posFor(color, i, prev[k]!);
          fresh.push({ id: Date.now() + k * 7 + Math.random(), x: p.x + CELL / 2, y: p.y + CELL / 2 });
        }
      });
      if (fresh.length) {
        setBursts((b) => [...b, ...fresh]);
        const ids = new Set(fresh.map((f) => f.id));
        window.setTimeout(() => setBursts((b) => b.filter((x) => !ids.has(x.id))), 800);
      }
    }
    prevSteps.current = cur;
  }, [state]);

  // Build pawn list with stacking offsets.
  const pawns: Pawn[] = [];
  (state.players as Array<{ tokens: Array<{ steps: number }> }>).forEach((p, c) => {
    p.tokens.forEach((t, i) => {
      const pos = posFor(c as LudoColor, i, t.steps);
      pawns.push({
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
  const counts: Record<string, number> = {};
  pawns.forEach((t) => {
    const k = `${t.x},${t.y}`;
    counts[k] = (counts[k] ?? 0) + 1;
  });
  const seen: Record<string, number> = {};
  pawns.forEach((t) => {
    const k = `${t.x},${t.y}`;
    const si = seen[k] ?? 0;
    seen[k] = si + 1;
    t.stackIndex = si;
    t.stackCount = counts[k]!;
  });

  return (
    <div ref={wrapRef} className="w-full" style={{ perspective: "1000px" }}>
      <div style={{ height: SIZE * scale }} className="relative w-full">
        <div
          className="absolute left-0 top-0"
          style={{
            width: SIZE,
            height: SIZE,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="relative h-full w-full rounded-[26px]"
            style={{
              transform: `rotate(${orientDeg}deg) rotateX(15deg)`,
              transition: "transform .65s cubic-bezier(.34,1.25,.5,1)",
              transformStyle: "preserve-3d",
              background:
                "radial-gradient(120% 120% at 30% 20%, #4a3418 0%, #2a1c0c 55%, #150d04 100%)",
              boxShadow:
                "0 30px 60px rgba(0,0,0,.6), inset 0 0 0 3px rgba(246,211,101,.5), inset 0 0 40px rgba(0,0,0,.6)",
            }}
          >
            {/* ---- Colored home base quadrants ---- */}
            {([0, 1, 2, 3] as LudoColor[]).map((c) => {
              const corner = CORNERS[c]!;
              const col = LUDO_COLORS[c];
              return (
                <div key={`base-${c}`}>
                  <div
                    className="absolute rounded-[18px]"
                    style={{
                      left: corner.x * CELL,
                      top: corner.y * CELL,
                      width: 6 * CELL,
                      height: 6 * CELL,
                      background: `linear-gradient(150deg, ${col} 0%, ${col}cc 60%, #00000055 100%)`,
                      boxShadow:
                        "inset 0 3px 0 rgba(255,255,255,.35), inset 0 -4px 10px rgba(0,0,0,.5), 0 6px 14px rgba(0,0,0,.5)",
                    }}
                  />
                  <div
                    className="absolute rounded-[16px]"
                    style={{
                      left: (corner.x + 1) * CELL,
                      top: (corner.y + 1) * CELL,
                      width: 4 * CELL,
                      height: 4 * CELL,
                      background:
                        "linear-gradient(160deg,#fdf6e3 0%,#e7dcc2 60%,#cbbf9d 100%)",
                      boxShadow: "inset 0 2px 6px rgba(0,0,0,.25)",
                    }}
                  />
                  {BASE_SPOTS[c]!.map((s, i) => (
                    <div
                      key={`pad-${c}-${i}`}
                      className="absolute rounded-full"
                      style={{
                        left: s[0] * CELL + 4,
                        top: s[1] * CELL + 4,
                        width: CELL - 8,
                        height: CELL - 8,
                        background: `radial-gradient(circle at 40% 35%, ${col}, ${col}aa 70%, #00000066)`,
                        boxShadow: "inset 0 -3px 6px rgba(0,0,0,.5), 0 2px 4px rgba(0,0,0,.4)",
                      }}
                    />
                  ))}
                </div>
              );
            })}

            {/* ---- Center gold home ---- */}
            <div
              className="absolute"
              style={{ left: 6 * CELL, top: 6 * CELL, width: 3 * CELL, height: 3 * CELL, transformStyle: "preserve-3d" }}
            >
              <div
                className="h-full w-full"
                style={{
                  background: "linear-gradient(150deg,#fde68a 0%,#f6d365 40%,#b8860b 100%)",
                  clipPath: "polygon(50% 4%, 96% 50%, 50% 96%, 4% 50%)",
                  boxShadow: "0 8px 20px rgba(0,0,0,.5), inset 0 0 20px rgba(255,255,255,.35)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-lg">★</div>
            </div>

            {/* ---- Home columns (colored final runs) with arrows + locks ---- */}
            {([0, 1, 2, 3] as LudoColor[]).map((c) =>
              HOME_PATH[c]!.map((h, i) => (
                <div key={`home-${c}-${i}`} className="absolute">
                  <div
                    className="rounded-[6px]"
                    style={{
                      left: h[0] * CELL + 2,
                      top: h[1] * CELL + 2,
                      width: CELL - 4,
                      height: CELL - 4,
                      background: `linear-gradient(150deg, ${LUDO_COLORS[c]}, ${LUDO_COLORS[c]}99)`,
                      boxShadow:
                        "inset 0 2px 0 rgba(255,255,255,.35), inset 0 -2px 4px rgba(0,0,0,.45), 0 2px 5px rgba(0,0,0,.45)",
                    }}
                  />
                  {/* metallic lock badge — the corridor is only traversed by the owner's pawns */}
                  <span
                    className="absolute flex items-center justify-center text-[10px] leading-none"
                    style={{
                      left: h[0] * CELL + 2,
                      top: h[1] * CELL + 2,
                      width: CELL - 4,
                      height: CELL - 4,
                      color: "rgba(255,240,200,0.85)",
                      textShadow: "0 1px 2px rgba(0,0,0,.8)",
                      filter: "drop-shadow(0 0 2px rgba(246,211,101,0.8))",
                    }}
                  >
                    🔒
                  </span>
                  {/* directional entry arrow on the first corridor tile */}
                  {i === 0 ? (
                    <span
                      className="absolute flex items-center justify-center font-black"
                      style={{
                        left: h[0] * CELL + 2,
                        top: h[1] * CELL + 2,
                        width: CELL - 4,
                        height: CELL - 4,
                        color: "#fde68a",
                        fontSize: 16,
                        textShadow: "0 0 6px rgba(251,191,36,0.9), 0 1px 2px rgba(0,0,0,.9)",
                      }}
                    >
                      {HOME_ARROW[c]}
                    </span>
                  ) : null}
                </div>
              )),
            )}

            {/* ---- Main 52-cell track ---- */}
            {Array.from({ length: 52 }, (_, i) => {
              const { x, y } = trackXY(i);
              const isStart = (START_INDEX as readonly number[]).includes(i);
              const isSafe = SAFE_CELLS.has(i);
              const startColor = (START_INDEX as readonly number[]).indexOf(i);
              return (
                <div key={`cell-${i}`}>
                  {isStart ? (
                    <div
                      className="absolute rounded-[7px]"
                      style={{
                        left: x + 1,
                        top: y + 1,
                        width: CELL - 2,
                        height: CELL - 2,
                        background: `linear-gradient(150deg, ${LUDO_COLORS[startColor as LudoColor]}, #00000055)`,
                        boxShadow:
                          "inset 0 2px 0 rgba(255,255,255,.35), inset 0 -2px 5px rgba(0,0,0,.5), 0 3px 6px rgba(0,0,0,.45)",
                      }}
                    />
                  ) : isSafe ? (
                    <div
                      className="absolute flex items-center justify-center rounded-[7px] text-[13px] font-black text-amber-900"
                      style={{
                        left: x + 1,
                        top: y + 1,
                        width: CELL - 2,
                        height: CELL - 2,
                        background: "linear-gradient(150deg,#fff7d6 0%,#f6d365 45%,#caa53a 100%)",
                        boxShadow:
                          "inset 0 2px 0 rgba(255,255,255,.6), inset 0 -3px 6px rgba(120,80,10,.5), 0 3px 7px rgba(0,0,0,.5)",
                        textShadow: "0 1px 0 rgba(255,255,255,.5)",
                      }}
                    >
                      ★
                    </div>
                  ) : (
                    <div
                      className="absolute rounded-[7px]"
                      style={{ ...WOOD_TILE, left: x + 1, top: y + 1, width: CELL - 2, height: CELL - 2 }}
                    />
                  )}
                </div>
              );
            })}

            {/* ---- Glass sheen overlay ---- */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[26px]"
              style={{
                background:
                  "linear-gradient(115deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 70%, rgba(255,255,255,.06) 100%)",
              }}
            />

            {/* ---- Capture particle bursts ---- */}
            <AnimatePresence>
              {bursts.map((b) => (
                <div key={b.id} className="pointer-events-none absolute" style={{ left: b.x, top: b.y }}>
                  {Array.from({ length: 10 }, (_, d) => {
                    const ang = (d / 10) * Math.PI * 2;
                    const dist = 26 + Math.random() * 18;
                    return (
                      <motion.span
                        key={d}
                        className="absolute h-2 w-2 rounded-full"
                        style={{
                          background: "radial-gradient(circle,#fff,#fbbf24 60%,#f97316)",
                          boxShadow: "0 0 8px #fbbf24",
                        }}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, opacity: 0, scale: 0.2 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    );
                  })}
                </div>
              ))}
            </AnimatePresence>

            {/* ---- Pawns ---- */}
            {pawns.map((t) => {
              const dx = (t.stackIndex - (t.stackCount - 1) / 2) * (t.stackCount > 1 ? 7 : 0);
              const dy = (t.stackIndex - (t.stackCount - 1) / 2) * (t.stackCount > 1 ? 5 : 0);
              const col = LUDO_COLORS[t.color];
              const mine = t.color === 0 && skin !== null;
              // Per-cell parabolic hop: when this pawn advanced since the last render
              // (prevSteps still holds the pre-move values until the capture-detect
              // effect below commits), animate through each intermediate cell with an
              // apex between cells instead of gliding linearly across the board.
              const flatIdx = t.color * 4 + t.idx;
              const prevS = prevSteps.current[flatIdx];
              const pawnKey = `${t.color}-${t.idx}`;
              if (
                typeof prevS === "number" &&
                t.steps > prevS &&
                t.steps >= 0 &&
                prevS >= -1
              ) {
                const xs: number[] = [];
                const ys: number[] = [];
                const start = posFor(t.color, t.idx, prevS);
                xs.push(start.x + CELL / 2 + dx);
                ys.push(start.y + CELL / 2 + dy);
                for (let s = prevS + 1; s <= t.steps; s += 1) {
                  const p = posFor(t.color, t.idx, s);
                  const tx = p.x + CELL / 2 + dx;
                  const ty = p.y + CELL / 2 + dy;
                  const px = xs[xs.length - 1]!;
                  const py = ys[ys.length - 1]!;
                  // Midpoint apex then landing — a parabola per cell.
                  xs.push((px + tx) / 2, tx);
                  ys.push(Math.min(py, ty) - 20, ty);
                }
                hopAnims.current[pawnKey] = {
                  xs,
                  ys,
                  dur: Math.min(1.8, (t.steps - prevS) * 0.26),
                };
              }
              const hopPath = hopAnims.current[pawnKey];
              return (
                <motion.div
                  key={`pawn-${t.color}-${t.idx}`}
                  className="absolute"
                  style={{ left: 0, top: 0 }}
                  animate={
                    hopPath
                      ? { x: hopPath.xs, y: hopPath.ys }
                      : { x: t.x + CELL / 2 + dx, y: t.y + CELL / 2 + dy }
                  }
                  transition={
                    hopPath
                      ? { duration: hopPath.dur, ease: "easeInOut" }
                      : { type: "spring", stiffness: 320, damping: 24, mass: 0.7 }
                  }
                  onAnimationComplete={() => {
                    delete hopAnims.current[pawnKey];
                  }}
                >
                  <div
                    className="absolute"
                    style={{ transform: "translate(-50%,-50%) translateZ(20px)", transformStyle: "preserve-3d" }}
                  >
                    {t.movable ? (
                      <motion.div
                        className="absolute rounded-full"
                        style={{
                          left: -17,
                          top: -17,
                          width: 34,
                          height: 34,
                          border: "2.5px solid #fff",
                          boxShadow: "0 0 14px rgba(255,255,255,.9)",
                        }}
                        animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ) : null}
                    {/* landing drop-shadow — shrinks + fades as the pawn hops up */}
                    <motion.div
                      key={`shadow-${t.color}-${t.idx}-${t.steps}`}
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        left: -11,
                        top: 8,
                        width: 22,
                        height: 7,
                        background: "radial-gradient(ellipse at center, rgba(0,0,0,.55), rgba(0,0,0,0) 70%)",
                      }}
                      initial={{ scale: 1, opacity: 0.85 }}
                      animate={{ scale: [1, 0.55, 0.8, 1], opacity: [0.85, 0.3, 0.5, 0.85] }}
                      transition={{ duration: 0.55, times: [0, 0.35, 0.72, 1], ease: "easeOut" }}
                    />
                    <motion.div
                      key={`hop-${t.color}-${t.idx}-${t.steps}`}
                      className="relative cursor-pointer"
                      style={{ width: 26, height: 26 }}
                      initial={{ y: 0, scaleX: 1, scaleY: 1 }}
                      animate={{ y: [0, -30, -6, 0], scaleY: [1, 1.2, 0.8, 1], scaleX: [1, 0.9, 1.12, 1] }}
                      transition={{ duration: 0.55, times: [0, 0.35, 0.72, 1], ease: "easeOut" }}
                      onClick={() => {
                        if (t.movable) onSelect(t.idx);
                      }}
                    >
                      <div
                        className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 rounded-full"
                        style={{
                          background: mine
                            ? skin!.swatch
                            : `radial-gradient(circle at 38% 30%, #ffffffcc, ${col} 55%, #00000066 130%)`,
                          boxShadow: mine
                            ? `${skin!.glow}, ${skin!.shadow}`
                            : "0 2px 3px rgba(0,0,0,.5), inset 0 -1px 2px rgba(0,0,0,.4)",
                        }}
                      />
                      <div
                        className="absolute bottom-0 left-0 h-[18px] w-[26px]"
                        style={{
                          background: mine
                            ? skin!.swatch
                            : `radial-gradient(circle at 36% 28%, #ffffffb3, ${col} 48%, #00000077 135%)`,
                          borderRadius: "48% 48% 50% 50% / 60% 60% 40% 40%",
                          boxShadow: mine
                            ? `${skin!.glow}, ${skin!.shadow}`
                            : "0 6px 10px rgba(0,0,0,.55), inset 0 -3px 6px rgba(0,0,0,.45), inset 0 3px 6px rgba(255,255,255,.35)",
                        }}
                      >
                        {/* high-gloss highlight streak for the selected seed theme */}
                        {mine ? (
                          <span
                            className="pointer-events-none absolute inset-x-1 top-[2px] h-[7px] rounded-full opacity-80"
                            style={{ background: skin!.gloss }}
                          />
                        ) : null}
                      </div>
                    </motion.div>
                    {t.stackCount > 1 && t.stackIndex === t.stackCount - 1 ? (
                      <div
                        className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-black/80 px-1 text-[9px] font-black text-amber-300"
                        style={{ transform: "translateZ(24px)" }}
                      >
                        ×{t.stackCount}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
