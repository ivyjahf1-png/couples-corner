export type LudoColor = 0 | 1 | 2 | 3;
/**
 * Quadrant-consistent geometry (15×15 board, see TRACK_PATH in LudoBoard):
 * seat 0 Red   → BOTTOM-LEFT base, left home corridor,  start cell 22 = (6,13)
 * seat 1 Blue  → BOTTOM-RIGHT base, bottom corridor,     start cell 35 = (13,8)
 * seat 2 Yellow→ TOP-RIGHT base, right corridor,         start cell 48 = (8,1)
 * seat 3 Green → TOP-LEFT base, top corridor,            start cell 9  = (1,6)
 * Turn order 0→1→2→3 then laps the board once (BL → BR → TR → TL).
 *
 * Each start sits on the horizontal/vertical track tile immediately outside
 * its own yard and exits clockwise: Red RIGHT, Blue UP, Yellow LEFT,
 * Green DOWN — see START_GATES in LudoBoard.tsx.
 */
export const LUDO_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#22c55e"] as const;
export const LUDO_NAMES = ["Red", "Blue", "Yellow", "Green"] as const;
export const START_INDEX: readonly number[] = [22, 35, 48, 9];
/** Start squares {22,35,48,9} plus their +8 star tiles {30,43,4,17}. */
export const SAFE_CELLS: ReadonlySet<number> = new Set([4, 9, 17, 22, 30, 35, 43, 48]);
export const TRACK_LEN = 52;
export const HOME_STRETCH = 6;
export const FINISH_STEP = 57;

/**
 * Board rules variant.
 * - `classic`: pure race, no shortcuts.
 * - `arrow`: landing exactly on an arrow tail auto-rides the pawn to the head.
 */
export type LudoRules = "classic" | "arrow";

/**
 * Arrow Mode shortcuts: track-cell index → track-cell index (fixed +8 jump).
 *
 * Geometry (verified against TRACK_PATH in LudoBoard):
 *   tails {23, 36, 49, 10} = [6,14], [14,8], [8,0], [0,6]  (edge cells)
 *   heads {31, 44, 5, 18}  = [9,8], [8,5], [5,6], [6,9]    (one arm inward)
 * 4-fold rotational symmetry (13 apart = quarter board), one shortcut per
 * quadrant, each curving toward the central goal diamond.
 *
 * SAFETY PROOF (why a fixed +8 can never overshoot or run backward): starts
 * are exactly 13 apart, so steps-at-tail over the four colors are always
 * {v, v+13, v+26, v+39} with v <= 3 here (Red {1,14,27,40}, Blue {40,1,14,27},
 * Yellow {27,40,1,14}, Green {14,27,40,1}) — max 40, so head steps <= 48,
 * always strictly forward, never into the home stretch. None of the 8 cells
 * overlap START_INDEX {22,35,48,9} or SAFE_CELLS, so safe-house and capture
 * rules need no changes.
 */
export const ARROW_SHORTCUTS: Readonly<Record<number, number>> = {
  23: 31,
  36: 44,
  49: 5,
  10: 18,
};

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
  /** Board rules variant — set once at match start, read by moves + board. */
  rules: LudoRules;
}

export function freshPlayer(): LudoPlayerState {
  return { tokens: [{ steps: -1 }, { steps: -1 }, { steps: -1 }, { steps: -1 }], finished: 0 };
}

export function freshGame(seed: LudoColor = 0, rules: LudoRules = "classic"): LudoGameState {
  return { players: [freshPlayer(), freshPlayer(), freshPlayer(), freshPlayer()], turn: 0, dice: 6, canRoll: true, consecutiveSixes: 0, winner: null, log: [`${LUDO_NAMES[seed]} starts. Roll a 6 to leave base.`], seedColor: seed, rules };
}

/**
 * Convert a track-cell index back to a pawn's steps value for a color
 * (inverse of trackCell: steps = (cell - start + 52) % 52). Used only for
 * arrow rides, where the target cell is proven reachable forward.
 */
export function stepsForTrackCell(color: LudoColor, cell: number): number {
  return (cell - START_INDEX[color]! + TRACK_LEN) % TRACK_LEN;
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
  // SAFE HOUSE RULE: every star tile (SAFE_CELLS — the four start squares plus
  // their +8 star tiles) is an absolute safe house. A seed sitting on a star
  // can never be captured; an opponent landing there simply shares the tile
  // (or is blocked when two foes already occupy it). Only non-star track cells
  // are eligible for capture.
  if (cell !== null && !SAFE_CELLS.has(cell)) {
    const foes = occupantsAt(state, cell, color);
    if (foes.length === 1) {
      const f = foes[0]!;
      state.players[f.color]!.tokens[f.token]!.steps = -1;
      captured = true;
      extraTurn = true;
    }
  }
  // ARROW MODE: landing exactly on a tail auto-rides the pawn to the head.
  // The +8 jump is proven strictly forward (head steps <= 48, never home), so
  // no overshoot or finish check is needed here. The head is a normal track
  // cell: captures apply there under the same safe-house rule as any landing.
  let rodeArrow = false;
  if (state.rules === "arrow" && cell !== null) {
    const head = ARROW_SHORTCUTS[cell];
    if (head !== undefined) {
      t.steps = stepsForTrackCell(color, head);
      rodeArrow = true;
      if (!SAFE_CELLS.has(head)) {
        const foes = occupantsAt(state, head, color);
        if (foes.length === 1) {
          const f = foes[0]!;
          state.players[f.color]!.tokens[f.token]!.steps = -1;
          captured = true;
          extraTurn = true;
        }
      }
    }
  }
  if (rodeArrow) {
    return { moved: true, captured, finished: false, extraTurn, message: captured ? `${LUDO_NAMES[color]} rides the arrow and captures a token!` : `${LUDO_NAMES[color]} rides the arrow forward!` };
  }
  return { moved: true, captured, finished: false, extraTurn, message: captured ? `${LUDO_NAMES[color]} captures a token!` : `${LUDO_NAMES[color]} moves ${dice}.` };
}

export function rollDice(): number { return 1 + Math.floor(Math.random() * 6); }

/* AI has moved to ./bots.ts (personality profiles, thinking delays, style-weighted
 * scoring). This engine file only owns rules + geometry. */
