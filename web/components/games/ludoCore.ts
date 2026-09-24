/**
 * Couple's Ludo — core geometry and pure game engine.
 *
 * Extracted verbatim from the game view so the board painter and the React
 * orchestration can share it without circular imports. Nothing here renders;
 * nothing here changes the rules:
 *
 * - 52-cell main ring on a 15×15 grid, starting at Red's start (1,6).
 * - Roll a 6 to leave the yard, extra turn on a 6, captures send tokens home,
 *   safe start squares only, 57-step race to home.
 * - Simple bot heuristic: capture > leave yard > farthest token.
 */

/* ── Geometry ───────────────────────────────────────────────────────── */
export const RING: Array<[number, number]> = [
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

export const STARTS = [0, 13, 26, 39]; // red, green, yellow, blue ring offsets
export const HOME = 57; // total steps to finish (51 ring + 5 home column + center)

/** Home-column grid coordinates, entered after ring position 51. */
export const HOME_COLUMNS: Array<Array<[number, number]>> = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],            // red
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],            // green
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],        // yellow
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],        // blue
];

export const PLAYER_COLORS = ["#ef4444", "#22c55e", "#eab308", "#3b82f6"];
/** Dark rims used for token shading / borders, index-aligned with PLAYER_COLORS. */
export const PLAYER_DEEP = ["#b91c1c", "#15803d", "#a16207", "#1d4ed8"];
export const PLAYER_NAMES = ["You (Red)", "Bot Green", "Bot Yellow", "Bot Blue"];

/**
 * Player profile metadata for the HUD frames around the board.
 * `name`/`flag` are presentation only — logs keep using PLAYER_NAMES above.
 */
export const PLAYER_PROFILES = [
  { name: "You", flag: "🇺🇸", initial: "Y" },
  { name: "Mateo", flag: "🇧🇷", initial: "M" },
  { name: "Yuki", flag: "🇯🇵", initial: "Y" },
  { name: "Zara", flag: "🇳🇬", initial: "Z" },
];

export const YARD_SLOTS: Array<Array<[number, number]>> = [
  [[2, 2], [3, 2], [2, 3], [3, 3]],
  [[11, 2], [12, 2], [11, 3], [12, 3]],
  [[11, 11], [12, 11], [11, 12], [12, 12]],
  [[2, 11], [3, 11], [2, 12], [3, 12]],
];

/** Logical canvas size (CSS-scaled responsively). */
export const SIZE = 600;

/** token position: -1 = yard, 0..56 = steps advanced from start. */
export type Tokens = [number, number, number, number];

export interface GameState {
  tokens: Tokens[]; // [player][tokenIndex]
  turn: number;
  dice: number | null;
  winner: number | null;
}

/* ── Rules ──────────────────────────────────────────────────────────── */

export function legalMoves(state: GameState, player: number, dice: number): number[] {
  if (state.winner !== null) return [];
  return state.tokens[player]
    .map((pos, token) => ({ pos, token }))
    .filter(({ pos }) => {
      if (pos === -1) return dice === 6; // need a 6 to leave the yard
      return pos + dice <= HOME;
    })
    .map(({ token }) => token);
}

export function applyMove(
  state: GameState,
  player: number,
  token: number,
  dice: number
): GameState {
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
export function botChoose(state: GameState, player: number, dice: number): number | null {
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
export function tokenCell(player: number, pos: number): [number, number] {
  if (pos === -1) return [-1, -1]; // rendered in the yard
  if (pos === HOME) return [7, 7];
  if (pos <= 51) return RING[(STARTS[player] + pos) % 52];
  return HOME_COLUMNS[player][pos - 52];
}
