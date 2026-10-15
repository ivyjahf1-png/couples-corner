export type LudoColor = 0 | 1 | 2 | 3;
/**
 * Quadrant-consistent geometry (15×15 board, see TRACK_PATH in LudoBoard):
 * seat 0 Red   → BOTTOM-LEFT base, left home corridor,  start cell 13 = (1,8)
 * seat 1 Blue  → BOTTOM-RIGHT base, bottom corridor,     start cell 26 = (8,13)
 * seat 2 Yellow→ TOP-RIGHT base, right corridor,         start cell 39 = (13,6)
 * seat 3 Green → TOP-LEFT base, top corridor,            start cell 0  = (6,1)
 * Turn order 0→1→2→3 then laps the board once (BL → BR → TR → TL).
 */
export const LUDO_COLORS = ["#E11D48", "#2563EB", "#F59E0B", "#16A34A"] as const;
export const LUDO_NAMES = ["Red", "Blue", "Yellow", "Green"] as const;
export const START_INDEX: readonly number[] = [13, 26, 39, 0];
/** Start squares {13,26,39,0} plus their +8 star tiles {21,34,47,8}. */
export const SAFE_CELLS: ReadonlySet<number> = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const TRACK_LEN = 52;
export const HOME_STRETCH = 6;
export const FINISH_STEP = 57;

export interface LudoToken { steps: number; }
export interface LudoPlayerState { tokens: [LudoToken, LudoToken, LudoToken, LudoToken]; finished: number; }
export interface LudoGameState {
  players: [LudoPlayerState, LudoPlayerState, LudoPlayerState, LudoPlayerState];
  turn: LudoColor;
  dice: number;
  canRoll: boolean;
  consecutiveSixes: number;
  winner: LudoColor | null;
  log: string[];
  /** Which palette color the human (player 0) is seeded as. Rendering-only. */
  seedColor: LudoColor;
}

export function freshPlayer(): LudoPlayerState {
  return { tokens: [{ steps: -1 }, { steps: -1 }, { steps: -1 }, { steps: -1 }], finished: 0 };
}

export function freshGame(seed: LudoColor = 0): LudoGameState {
  return { players: [freshPlayer(), freshPlayer(), freshPlayer(), freshPlayer()], turn: 0, dice: 6, canRoll: true, consecutiveSixes: 0, winner: null, log: [`${LUDO_NAMES[seed]} starts. Roll a 6 to leave base.`], seedColor: seed };
}

export function trackCell(color: LudoColor, steps: number): number | null {
  if (steps < 0 || steps >= 51) return null;
  return (START_INDEX[color]! + steps) % TRACK_LEN;
}

export function movableTokens(state: LudoGameState, color: LudoColor, dice: number): number[] {
  const out: number[] = [];
  const p = state.players[color]!;
  p.tokens.forEach((t, i) => {
    if (t.steps === -1) { if (dice === 6) out.push(i); return; }
    if (t.steps >= FINISH_STEP) return;
    if (t.steps + dice <= FINISH_STEP) out.push(i);
  });
  return out;
}

function occupantsAt(state: LudoGameState, cell: number, except: LudoColor | null): Array<{ color: LudoColor; token: number }> {
  const out: Array<{ color: LudoColor; token: number }> = [];
  (state.players as LudoPlayerState[]).forEach((p, c) => {
    if (except !== null && c === except) return;
    p.tokens.forEach((t, i) => {
      if (trackCell(c as LudoColor, t.steps) === cell) out.push({ color: c as LudoColor, token: i });
    });
  });
  return out;
}

export interface MoveResult { moved: boolean; captured: boolean; finished: boolean; extraTurn: boolean; message: string; }

export function applyMove(state: LudoGameState, color: LudoColor, tokenIdx: number, dice: number): MoveResult {
  const p = state.players[color]!;
  const t = p.tokens[tokenIdx]!;
  let extraTurn = dice === 6;
  if (t.steps === -1) {
    if (dice !== 6) return { moved: false, captured: false, finished: false, extraTurn: false, message: "Need a 6 to leave base." };
    t.steps = 0;
    return { moved: true, captured: false, finished: false, extraTurn, message: `${LUDO_NAMES[color]} token enters the board!` };
  }
  const next = t.steps + dice;
  if (next > FINISH_STEP) return { moved: false, captured: false, finished: false, extraTurn: false, message: "Exact roll needed to finish." };
  t.steps = next;
  if (next === FINISH_STEP) {
    p.finished += 1;
    const won = p.finished === 4;
    return { moved: true, captured: false, finished: true, extraTurn: true, message: won ? `${LUDO_NAMES[color]} wins the match!` : `${LUDO_NAMES[color]} brings a token home!` };
  }
  const cell = trackCell(color, next);
  let captured = false;
  if (cell !== null && !SAFE_CELLS.has(cell)) {
    const foes = occupantsAt(state, cell, color);
    if (foes.length === 1) {
      const f = foes[0]!;
      state.players[f.color]!.tokens[f.token]!.steps = -1;
      captured = true;
      extraTurn = true;
    }
  }
  return { moved: true, captured, finished: false, extraTurn, message: captured ? `${LUDO_NAMES[color]} captures a token!` : `${LUDO_NAMES[color]} moves ${dice}.` };
}

export function rollDice(): number { return 1 + Math.floor(Math.random() * 6); }

/* AI has moved to ./bots.ts (personality profiles, thinking delays, style-weighted
 * scoring). This engine file only owns rules + geometry. */
