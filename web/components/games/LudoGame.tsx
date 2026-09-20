"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Couple's Ludo — built-in canvas Ludo engine with VS-Bot logic.
 *
 * The human plays Red against three bot opponents (Green, Yellow, Blue).
 * Full classic rules: roll a 6 to leave the yard, extra turn on a 6,
 * captures send tokens home, safe start squares, 57-step race to home.
 * The result (win/loss) is reported to the player container which settles
 * the coin stake server-side.
 */

/* ── Geometry ─────────────────────────────────────────────────────────
   The 52-cell main ring on a 15×15 grid, starting at Red's start (1,6). */
const RING: Array<[number, number]> = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0],
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7],
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14],
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7],
  [0, 6],
];

const STARTS = [0, 13, 26, 39]; // red, green, yellow, blue ring offsets
const HOME = 57; // total steps to finish (51 ring + 5 home column + center)

/** Home-column grid coordinates, entered after ring position 51. */
const HOME_COLUMNS: Array<Array<[number, number]>> = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],            // red
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],            // green
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],        // yellow
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],        // blue
];

const PLAYER_COLORS = ["#ef4444", "#22c55e", "#eab308", "#3b82f6"];
const PLAYER_NAMES = ["You (Red)", "Bot Green", "Bot Yellow", "Bot Blue"];
const YARD_SLOTS: Array<[number, number][]> = [
  [[2, 2], [3, 2], [2, 3], [3, 3]],
  [[11, 2], [12, 2], [11, 3], [12, 3]],
  [[11, 11], [12, 11], [11, 12], [12, 12]],
  [[2, 11], [3, 11], [2, 12], [3, 12]],
];

/** token position: -1 = yard, 0..56 = steps advanced from start. */
type Tokens = [number, number, number, number];

interface GameState {
  tokens: Tokens[]; // [player][tokenIndex]
  turn: number;
  dice: number | null;
  winner: number | null;
}

const SIZE = 600; // logical canvas size (CSS-scaled responsively)

function legalMoves(state: GameState, player: number, dice: number): number[] {
  if (state.winner !== null) return [];
  return state.tokens[player]
    .map((pos, token) => ({ pos, token }))
    .filter(({ pos }) => {
      if (pos === -1) return dice === 6; // need a 6 to leave the yard
      return pos + dice <= HOME;
    })
    .map(({ token }) => token);
}

function applyMove(state: GameState, player: number, token: number, dice: number): GameState {
  const tokens = state.tokens.map((t) => [...t] as Tokens);
  const from = tokens[player][token];
  const to = from === -1 ? 0 : from + dice;

  // Capture: opponents on the same non-safe ring square go home.
  if (to <= 51) {
    const ringIndex = (STARTS[player] + to) % 52;
    const safe = STARTS.includes(ringIndex);
    if (!safe) {
      for (let p = 0; p < 4; p += 1) {
        if (p === player) continue;
        for (let t = 0; t < 4; t += 1) {
          const pos = tokens[p][t];
          if (pos >= 0 && pos <= 51 && (STARTS[p] + pos) % 52 === ringIndex) {
            tokens[p][t] = -1;
          }
        }
      }
    }
  }
  tokens[player][token] = to;

  const finished = tokens[player].every((pos) => pos === HOME);
  const winner = finished ? player : null;
  // Rolling a 6 grants an extra turn.
  const extraTurn = dice === 6;

  return {
    tokens,
    turn: winner !== null ? state.turn : extraTurn ? player : (player + 1) % 4,
    dice: null,
    winner,
  };
}

/** Simple bot heuristic: capture > leave yard > farthest token. */

export function LudoGame({
  muted,
  onGameOver,
}: {
  muted: boolean;
  onGameOver: (won: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    tokens: [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]],
    turn: 0,
    dice: null,
    winner: null,
  });
  const [, forceRender] = useState(0);
  const [pendingMoves, setPendingMoves] = useState<number[]>([]);
  const [log, setLog] = useState<string>("You are Red. Roll a 6 to leave your yard!");
  const reportedRef = useRef(false);
  const state = stateRef.current;

  /** Tiny WebAudio blip for dice rolls. */
  const beep = useCallback(
    (frequency: number) => {
      if (muted) return;
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
        osc.onended = () => void ctx.close();
      } catch {
        // Audio is best-effort.
      }
    },
    [muted]
  );

  /* ── Board rendering ─────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cell = SIZE / 15;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Base
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Yards
    const yardOrigin: Array<[number, number]> = [[0, 0], [9, 0], [9, 9], [0, 9]];
    yardOrigin.forEach(([x, y], p) => {
      ctx.fillStyle = PLAYER_COLORS[p];
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x * cell, y * cell, cell * 6, cell * 6);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = PLAYER_COLORS[p];
      ctx.lineWidth = 3;
      ctx.strokeRect(x * cell, y * cell, cell * 6, cell * 6);
    });

    // Main track cells + coloured start squares
    RING.forEach(([x, y], i) => {
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cell, y * cell, cell, cell);
      const startOwner = STARTS.indexOf(i);
      if (startOwner !== -1) {
        ctx.fillStyle = PLAYER_COLORS[startOwner];
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x * cell, y * cell, cell, cell);
        ctx.globalAlpha = 1;
      }
    });

    // Home columns
    HOME_COLUMNS.forEach((column, p) => {
      column.forEach(([x, y]) => {
        ctx.fillStyle = PLAYER_COLORS[p];
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x * cell, y * cell, cell, cell);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cell, y * cell, cell, cell);
      });
    });

    // Center home + yard slot pads
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(6 * cell, 6 * cell, cell * 3, cell * 3);
    ctx.font = `${cell * 0.8}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🏠", 7.5 * cell, 7.5 * cell);
    YARD_SLOTS.forEach((slots, p) => {
      slots.forEach(([x, y]) => {
        ctx.fillStyle = PLAYER_COLORS[p];
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, cell * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    });

    // Tokens (stack offset so shared squares stay visible)
    for (let p = 0; p < 4; p += 1) {
      for (let t = 0; t < 4; t += 1) {
        const pos = state.tokens[p][t];
        let x: number;
        let y: number;
        if (pos === -1) {
          const slot = YARD_SLOTS[p][t];
          [x, y] = slot;
        } else {
          [x, y] = tokenCell(p, pos);
        }
        let shared = 0;
        for (let q = 0; q < 4; q += 1) {
          if (q === p) continue;
          for (let u = 0; u < 4; u += 1) {
            const other = state.tokens[q][u];
            if (other === -1) continue;
            const [ox, oy] = tokenCell(q, other);
            if (ox === x && oy === y) shared += 1;
          }
        }
        const px = (x + 0.5) * cell + (shared ? cell * 0.14 : 0);
        const py = (y + 0.5) * cell - (shared ? cell * 0.14 : 0);
        const movable = p === 0 && pendingMoves.includes(t);
        ctx.beginPath();
        ctx.arc(px, py, cell * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = PLAYER_COLORS[p];
        ctx.fill();
        ctx.lineWidth = movable ? 4 : 2.5;
        ctx.strokeStyle = movable ? "#f97316" : "#ffffff";
        ctx.stroke();
        if (movable) {
          ctx.beginPath();
          ctx.arc(px, py, cell * 0.44, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(249,115,22,0.55)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
  }, [state.tokens, pendingMoves]);

  /* ── Turn flow ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (state.winner !== null && !reportedRef.current) {
      reportedRef.current = true;
      setLog(state.winner === 0 ? "🏆 You win the Ludo crown!" : `🏆 ${PLAYER_NAMES[state.winner]} wins!`);
      onGameOver(state.winner === 0);
    }
  }, [state.winner, onGameOver]);

  const roll = useCallback(() => {
    const current = stateRef.current;
    if (current.winner !== null || current.dice !== null) return;
    const dice = 1 + Math.floor(Math.random() * 6);
    current.dice = dice;
    beep(dice === 6 ? 660 : 440);
    forceRender((n) => n + 1);

    const moves = legalMoves(current, current.turn, dice);
    if (moves.length === 0) {
      setLog(`${PLAYER_NAMES[current.turn]} rolled ${dice} — no legal move.`);
      window.setTimeout(() => {
        const s = stateRef.current;
        if (s.winner !== null) return;
        if (dice !== 6) s.turn = (s.turn + 1) % 4; // a 6 keeps the turn
        s.dice = null;
        forceRender((n) => n + 1);
      }, 900);
      return;
    }

    if (current.turn === 0) {
      // Human: auto-move when only one option, otherwise wait for a pick.
      if (moves.length === 1) {
        setLog(`You rolled ${dice}.`);
        window.setTimeout(() => {
          stateRef.current = applyMove(stateRef.current, 0, moves[0], dice);
          setPendingMoves([]);
          forceRender((n) => n + 1);
        }, 400);
      } else {
        setPendingMoves(moves);
        setLog(`You rolled ${dice} — choose a token to move.`);
      }
    } else {
      setLog(`${PLAYER_NAMES[current.turn]} rolled ${dice}…`);
      window.setTimeout(() => {
        const s = stateRef.current;
        if (s.winner !== null) return;
        const token = botChoose(s, s.turn, dice);
        if (token !== null) {
          stateRef.current = applyMove(s, s.turn, token, dice);
          setLog(`${PLAYER_NAMES[s.turn]} moved.`);
        }
        forceRender((n) => n + 1);
      }, 900);
    }
  }, [beep]);

  // Auto-roll for bot turns.
  useEffect(() => {
    if (state.winner !== null) return;
    if (state.turn !== 0 && state.dice === null) {
      const id = window.setTimeout(roll, 900);
      return () => window.clearTimeout(id);
    }
  }, [state.turn, state.dice, state.winner, roll]);

  const moveToken = useCallback((token: number) => {
    const s = stateRef.current;
    if (s.turn !== 0 || s.dice === null) return;
    stateRef.current = applyMove(s, 0, token, s.dice);
    setPendingMoves([]);
    setLog("You moved.");
    forceRender((n) => n + 1);
  }, []);

  const canRoll = state.turn === 0 && state.dice === null && state.winner === null;

  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
      <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold">
          {state.winner !== null
            ? state.winner === 0
              ? "🏆 You win!"
              : `🏆 ${PLAYER_NAMES[state.winner]} wins`
            : `Turn: ${PLAYER_NAMES[state.turn]}`}
        </span>
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-slate-900 text-2xl font-extrabold shadow-lg"
          aria-label={`Dice showing ${state.dice ?? "none"}`}
        >
          {state.dice ?? "🎲"}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="w-full max-w-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40"
        role="img"
        aria-label="Couple's Ludo board — you are red, playing against three bots"
      />

      {/* Human token picker (only when several moves are legal) */}
      {pendingMoves.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-white/60">Move token:</span>
          {pendingMoves.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => moveToken(token)}
              className="inline-flex items-center gap-2 rounded-xl border border-orange-400/60 bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/40 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[0] }}
                aria-hidden="true"
              />
              Token {token + 1}
              <span className="text-xs font-normal text-white/60">
                {state.tokens[0][token] === -1 ? "(yard)" : `step ${state.tokens[0][token]}`}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex w-full max-w-xl flex-col items-center gap-3">
        <p className="text-sm text-white/60" role="status">{log}</p>
        <button
          type="button"
          onClick={roll}
          disabled={!canRoll}
          className="rounded-xl bg-[#FF5722] px-8 py-3 text-base font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:bg-[#F4511E] focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {canRoll ? "Roll dice 🎲" : state.dice !== null ? "Moving…" : "Waiting…"}
        </button>
      </div>
    </div>
  );
}

function botChoose(state: GameState, player: number, dice: number): number | null {
  const moves = legalMoves(state, player, dice);
  if (moves.length === 0) return null;
  for (const token of moves) {
    const pos = state.tokens[player][token];
    const to = pos === -1 ? 0 : pos + dice;
    if (to <= 51) {
      const ringIndex = (STARTS[player] + to) % 52;
      if (!STARTS.includes(ringIndex)) {
        const captures = state.tokens.some((other, p) =>
          p !== player &&
          other.some((op) => op >= 0 && op <= 51 && (STARTS[p] + op) % 52 === ringIndex)
        );
        if (captures) return token;
      }
    }
  }
  const yard = moves.find((token) => state.tokens[player][token] === -1);
  if (yard !== undefined) return yard;
  return moves.reduce((best, token) =>
    state.tokens[player][token] > state.tokens[player][best] ? token : best, moves[0]);
}

/** Grid coordinates for a token's current position. */
function tokenCell(player: number, pos: number): [number, number] {
  if (pos === -1) return [-1, -1]; // rendered in the yard
  if (pos === HOME) return [7, 7];
  if (pos <= 51) return RING[(STARTS[player] + pos) % 52];
  return HOME_COLUMNS[player][pos - 52];
}
