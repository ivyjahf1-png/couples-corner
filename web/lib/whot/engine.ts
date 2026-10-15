/**
 * whot/engine.ts — pure rules engine for 4-player Nigerian Whot.
 *
 * Deck (canonical 44 cards):
 *   circles 1,2,3,4,5,7,8,10,11,12,14 · triangles 1,2,3,4,5,7,8 ·
 *   squares 1,2,3,4,5,7,8,10,11,12 · crosses 1,2,3,5,7,10,11,14 ·
 *   stars 1,2,3,4,5,7,8 · WHOT 20 (wild, rainbow crown).
 *
 * House rules implemented:
 *   - Match the top card's VALUE or the active SHAPE CALL, or play WHOT 20.
 *   - 1 Hold On (extra turn) · 2 Pick Two (stacks) · 3 Pick Three (stacks) ·
 *     8 Miss a turn · 14 General Market (everyone else draws 1; shedding it
 *     as your last card wins instantly) · 20 WHOT picks the new shape call.
 *   - A player at one card must declare WHOT before shedding the final card.
 *   - Under a Pick penalty only same-value cards may be stacked, otherwise
 *     the victim absorbs the pile and loses the turn.
 *   - Market empty → reshuffle the discard (keeping its top). A fully dry
 *     table for a full lap ends the round: fewest cards wins.
 *
 * No React, no audio — the orchestrator maps returned effects to 4D sensory
 * feedback (haptics / spatial audio / particle FX).
 */

export type WhotShape = "circle" | "triangle" | "square" | "cross" | "star" | "whot";
export type ShapeCall = Exclude<WhotShape, "whot">;

export interface WhotCard {
  id: string;
  value: number; // 1..14 (no 6/9/13) or 20 for WHOT
  shape: WhotShape;
}

export const PLAYER_COUNT = 4;
export const HAND_SIZE = 5;

/** Active shape-call order (WHOT itself is never a call). */
export const SHAPE_ORDER: readonly ShapeCall[] = ["circle", "triangle", "square", "cross", "star"];

export const SHAPE_LABEL: Record<WhotShape, string> = {
  circle: "Circle",
  triangle: "Triangle",
  square: "Square",
  cross: "Cross",
  star: "Star",
  whot: "WHOT",
};

/** Shape → table colour (matches the reference palette red/green/yellow/blue/violet). */
export const SHAPE_COLOR: Record<WhotShape, string> = {
  circle: "#E11D48",
  triangle: "#16A34A",
  square: "#EAB308",
  cross: "#2563EB",
  star: "#7C3AED",
  whot: "#F59E0B",
};

const SHAPE_VALUES: Record<ShapeCall, readonly number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8],
  square: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12],
  cross: [1, 2, 3, 5, 7, 10, 11, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
};

export interface WhotPlayerState {
  hand: WhotCard[];
  /** Declared "WHOT!" at one card — required before shedding the final card. */
  called: boolean;
}

export interface WhotGameState {
  players: WhotPlayerState[];
  market: WhotCard[];
  /** Index 0 = bottom of the pile; last = active top card. */
  discard: WhotCard[];
  call: ShapeCall | null;
  turn: number;
  /** Accumulated Pick-Two/Three penalty cards owed by the current seat. */
  pendingPick: number;
  pendingKind: 2 | 3 | null;
  winner: number | null;
  lastPlay: { seat: number; card: WhotCard } | null;
  /** Consecutive market draws without a play — stall round-end detection. */
  dryTurns: number;
}

export type WhotEffect =
  | { type: "hold"; seat: number }
  | { type: "pick"; seat: number; victim: number; count: number }
  | { type: "skip"; seat: number; victim: number }
  | { type: "market-all"; seat: number }
  | { type: "whot-call"; seat: number; shape: ShapeCall }
  | { type: "declare"; seat: number }
  | { type: "reshuffle" }
  | { type: "win"; seat: number };

export interface WhotStep {
  state: WhotGameState;
  effects: WhotEffect[];
}


/** Full 44-card deck, freshly shuffled. */
export function standardDeck(): WhotCard[] {
  const cards: WhotCard[] = [];
  for (const shape of SHAPE_ORDER) {
    for (const value of SHAPE_VALUES[shape]) {
      cards.push({ id: `${shape}-${value}`, value, shape });
    }
  }
  cards.push({ id: "whot-20", value: 20, shape: "whot" });
  return shuffle(cards);
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Values that would distort an opening flip (specials + wild). */
const OPENING_BLOCK = new Set([1, 2, 3, 8, 14, 20]);

/** Deal a fresh 4-player round: 5 cards each, safe opening top, shape call. */
export function freshWhotGame(): WhotGameState {
  const market = standardDeck();
  const players: WhotPlayerState[] = [];
  for (let p = 0; p < PLAYER_COUNT; p++) players.push({ hand: [], called: false });
  for (let i = 0; i < HAND_SIZE; i++) {
    for (let p = 0; p < PLAYER_COUNT; p++) players[p]!.hand.push(market.pop()!);
  }
  let top = market.pop()!;
  while (OPENING_BLOCK.has(top.value)) {
    market.unshift(top);
    top = market.pop()!;
  }
  return {
    players,
    market,
    discard: [top],
    call: top.shape as ShapeCall,
    turn: 0,
    pendingPick: 0,
    pendingKind: null,
    winner: null,
    lastPlay: { seat: -1, card: top },
    dryTurns: 0,
  };
}

export function topCard(s: WhotGameState): WhotCard {
  return s.discard[s.discard.length - 1]!;
}

/** Cards in `seat`'s hand that the rules currently allow them to shed. */
export function legalPlays(s: WhotGameState, seat: number): WhotCard[] {
  if (s.winner !== null || s.turn !== seat) return [];
  const hand = s.players[seat]?.hand ?? [];
  const top = topCard(s);
  if (s.pendingPick > 0) {
    // Under a pick penalty only same-value stacks escape.
    return hand.filter((c) => c.value === s.pendingKind);
  }
  return hand.filter((c) => c.value === 20 || c.value === top.value || (s.call !== null && c.shape === s.call));
}

/** Shedding the final card requires a prior WHOT declaration. */
export function canShedLast(s: WhotGameState, seat: number): boolean {
  const p = s.players[seat];
  if (!p) return false;
  return p.hand.length !== 1 || p.called;
}

/** Declare WHOT at one card (returns null when out of turn / not at one card). */
export function declareWhot(state: WhotGameState, seat: number): WhotStep | null {
  const p = state.players[seat];
  if (!p || state.turn !== seat || p.hand.length !== 1 || p.called || state.winner !== null) return null;
  const players = state.players.map((pl, i) => (i === seat ? { ...pl, called: true } : pl));
  return { state: { ...state, players }, effects: [{ type: "declare", seat }] };
}

/** Shape with the most copies in `seat`'s hand — bot WHOT auto-call. */
export function bestCallShape(hand: readonly WhotCard[]): ShapeCall {
  const counts = new Map<ShapeCall, number>();
  for (const c of hand) {
    if (c.shape === "whot") continue;
    counts.set(c.shape, (counts.get(c.shape) ?? 0) + 1);
  }
  let best: ShapeCall = "circle";
  let bestN = -1;
  for (const s of SHAPE_ORDER) {
    const n = counts.get(s) ?? 0;
    if (n > bestN) { best = s; bestN = n; }
  }
  return best;
}

/**
 * Shed a card from `seat`'s hand. `shape` is required when playing WHOT 20.
 * Returns null when the move breaks any rule (wrong turn, illegal card,
 * undeclared final card).
 */
export function playCard(state: WhotGameState, seat: number, cardId: string, shape?: ShapeCall): WhotStep | null {
  if (state.winner !== null || state.turn !== seat) return null;
  const legal = legalPlays(state, seat);
  const card = legal.find((c) => c.id === cardId);
  if (!card) return null;
  if (card.value === 20 && shape === undefined) return null;
  if (!canShedLast(state, seat)) return null;

  const s: WhotGameState = {
    ...state,
    players: state.players.map((p, i) => (i === seat ? { ...p, hand: p.hand.filter((c) => c.id !== cardId) } : p)),
    discard: [...state.discard, card],
    lastPlay: { seat, card },
    dryTurns: 0,
  };
  const effects: WhotEffect[] = [];
  const next = (seat + 1) % PLAYER_COUNT;
  const victimHand = s.players[next]?.hand.length ?? 0;

  // Winning shed — empty hand takes the round (General Market included).
  if (s.players[seat]!.hand.length === 0) {
    s.winner = seat;
    if (card.value === 20 && shape) {
      s.call = shape;
      effects.push({ type: "whot-call", seat, shape });
    }
    effects.push({ type: "win", seat });
    return { state: s, effects };
  }

  if (card.value === 20) {
    const called = shape!;
    s.call = called;
    effects.push({ type: "whot-call", seat, shape: called });
    advanceTurn(s, seat);
  } else if (card.value === 1) {
    // Hold On — the player goes again.
    effects.push({ type: "hold", seat });
  } else if (card.value === 2 || card.value === 3) {
    s.pendingKind = card.value;
    s.pendingPick += card.value;
    effects.push({ type: "pick", seat, victim: next, count: s.pendingPick });
    advanceTurn(s, seat);
  } else if (card.value === 8) {
    effects.push({ type: "skip", seat, victim: next });
    s.turn = (seat + 2) % PLAYER_COUNT; // victim sits out
  } else if (card.value === 14) {
    // General Market — everyone else draws one.
    effects.push({ type: "market-all", seat });
    for (let p = 0; p < PLAYER_COUNT; p++) {
      if (p !== seat) takeCards(s, p, 1);
    }
    advanceTurn(s, seat);
  } else {
    advanceTurn(s, seat);
  }
  void victimHand;
  return { state: s, effects };
}

/**
 * The current seat goes to market. With a pending Pick penalty they absorb
 * the whole pile; otherwise they draw a single card. Either way the turn
 * passes. Returns null when out of turn.
 */
export function drawCard(state: WhotGameState, seat: number): WhotStep | null {
  if (state.winner !== null || state.turn !== seat) return null;
  const s: WhotGameState = {
    ...state,
    players: state.players.map((p, i) => (i === seat ? { ...p } : p)),
  };
  const effects: WhotEffect[] = [];
  const hadMarket = s.market.length > 0;
  if (s.market.length === 0 && recycleDiscard(s)) effects.push({ type: "reshuffle" });

  const count = s.pendingPick > 0 ? s.pendingPick : 1;
  const drew = takeCards(s, seat, count);
  if (s.pendingPick > 0) {
    effects.push({ type: "pick", seat, victim: seat, count: drew });
    s.pendingPick = 0;
    s.pendingKind = null;
  }
  s.dryTurns = hadMarket || drew > 0 ? 0 : s.dryTurns + 1;
  advanceTurn(s, seat);
  return { state: s, effects };
}

/** Round-end fallback: the table is dry for a full lap — fewest cards wins. */
export function stallWinner(s: WhotGameState): number | null {
  if (s.dryTurns < PLAYER_COUNT) return null;
  let best = 0;
  let bestN = Infinity;
  for (let p = 0; p < PLAYER_COUNT; p++) {
    const n = s.players[p]?.hand.length ?? 99;
    if (n < bestN) { best = p; bestN = n; }
  }
  return best;
}

/** Ascending value, then shape order — the "Sort" hand button. */
export function sortHand(hand: readonly WhotCard[]): WhotCard[] {
  const order = new Map<string, number>(SHAPE_ORDER.map((s, i) => [s, i]));
  return [...hand].sort((a, b) => a.value - b.value || (order.get(a.shape) ?? 9) - (order.get(b.shape) ?? 9) || a.id.localeCompare(b.id));
}

function recycleDiscard(s: WhotGameState): boolean {
  if (s.market.length > 0 || s.discard.length <= 1) return false;
  const top = s.discard[s.discard.length - 1]!;
  const under = shuffle(s.discard.slice(0, -1));
  s.market = under;
  s.discard = [top];
  return true;
}

/** Pull up to `n` cards for `seat` from the market (recycling when dry). */
function takeCards(s: WhotGameState, seat: number, n: number): number {
  const got: WhotCard[] = [];
  for (let i = 0; i < n; i++) {
    if (s.market.length === 0) recycleDiscard(s);
    const c = s.market.pop();
    if (!c) break;
    got.push(c);
  }
  s.players[seat]!.hand.push(...got);
  return got.length;
}

/** Advance to the next live seat (winner ends the round). */
function advanceTurn(s: WhotGameState, from: number): void {
  if (s.winner !== null) return;
  s.turn = (from + 1) % PLAYER_COUNT;
}


