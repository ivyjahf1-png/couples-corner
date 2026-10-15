/**
 * whot/bots.ts — opponent personalities for 4-player Whot.
 *
 * Seats follow the reference HUD: bottom (0) is the local player Aisha
 * (Lv.10, Canada); Tunde (Lv.5, Nigeria) sits left, David (Lv.9, Nigeria)
 * at the top and Bella (Lv.7, UK) on the right.
 *
 * Each bot owns a style (how it weighs plays), a variable thinking window,
 * status-bar phrases and reaction emoji. Play selection is style-weighted
 * scoring with a 12% human-blunder chance so bots feel like players.
 */
import { bestCallShape, legalPlays, PLAYER_COUNT, topCard, type ShapeCall, type WhotCard, type WhotGameState } from "@/lib/whot/engine";

export type BotStyle = "steady" | "aggressive" | "tricky";

export interface BotStyleProfile {
  style: BotStyle;
  /** [min, max] ms of visible "thinking" before committing. */
  thinkMs: [number, number];
  /** Sentence tails composed as `${name} ${suffix}` while deciding. */
  thinking: string[];
  /** Emoji thrown at the table after a brutal pick / whot call. */
  reactions: string[];
}

export interface WhotSeatProfile {
  name: string;
  initials: string;
  level: number;
  flag: string;
  /** Pod ring colour — matches the reference (Tunde green, Bella red, David/Aisha gold). */
  ring: string;
  /** Absent = the local human seat (seat 0). */
  bot?: BotStyleProfile;
}

/**
 * Seat order around the radial table:
 * 0 Bottom (human) · 1 Left · 2 Top · 3 Right.
 */
export const SEATS: readonly [WhotSeatProfile, WhotSeatProfile, WhotSeatProfile, WhotSeatProfile] = [
  { name: "Aisha", initials: "AS", level: 10, flag: "🇨🇦", ring: "#F59E0B" },
  {
    name: "Tunde",
    initials: "TU",
    level: 5,
    flag: "🇳🇬",
    ring: "#22C55E",
    bot: {
      style: "steady",
      thinkMs: [800, 1700],
      thinking: ["is counting the shapes…", "takes a calm breath…", "checks the call…", "is playing it patient…"],
      reactions: ["😅", "🍀", "👌"],
    },
  },
  {
    name: "David",
    initials: "DA",
    level: 9,
    flag: "🇳🇬",
    ring: "#F59E0B",
    bot: {
      style: "aggressive",
      thinkMs: [950, 2100],
      thinking: ["is hunting a pick…", "smiles at his cards…", "leans in to strike…", "is loading the market…"],
      reactions: ["😈", "🔥", "💥"],
    },
  },
  {
    name: "Bella",
    initials: "BE",
    level: 7,
    flag: "🇬🇧",
    ring: "#EF4444",
    bot: {
      style: "tricky",
      thinkMs: [850, 1950],
      thinking: ["is plotting a trap…", "hides her last card…", "bats her eyelids…", "hums, deciding…"],
      reactions: ["💅", "😏", "🃏"],
    },
  },
];

function profile(seat: number): BotStyleProfile | undefined {
  return SEATS[seat]?.bot;
}

/** Visible thinking delay — variable so bots never feel metronomic. */
export function botThinkDelay(seat: number): number {
  const bot = profile(seat);
  if (!bot) return 900;
  const [min, max] = bot.thinkMs;
  return min + Math.random() * (max - min);
}

/** Post-decision pause (committing also takes a beat). */
export function botPlayDelay(seat: number): number {
  return profile(seat) ? 350 + Math.random() * 650 : 250;
}

/** Random status-bar tail: "is hunting a pick…". */
export function thinkSuffix(seat: number): string {
  const bot = profile(seat);
  if (!bot) return "is thinking…";
  return bot.thinking[Math.floor(Math.random() * bot.thinking.length)]!;
}

/** Random reaction emoji for a bot after a brutal play. */
export function botReaction(seat: number): string | null {
  const bot = profile(seat);
  if (!bot) return null;
  return bot.reactions[Math.floor(Math.random() * bot.reactions.length)]!;
}

/** The shape a bot calls after playing WHOT — most-held shape, never whot. */
export function botCallShape(hand: readonly WhotCard[]): ShapeCall {
  return bestCallShape(hand);
}

export type BotAction =
  | { kind: "play"; cardId: string; shape?: ShapeCall }
  | { kind: "draw" };

/**
 * Score every legal play through the seat's personality lens, then pick the
 * best — with a 12% blunder chance and ±8 noise so bots feel human.
 *
 *   · plain cards  — dump the big ones, keep flexible shapes alive
 *   · 2 / 3        — extra love when the next seat is low on cards (bully)
 *   · 8            — same bully logic (skip the leader)
 *   · 1 / 14       — hold-on chains and market dumps beat small hands
 *   · 20 WHOT      — aggressive bots call early; tricky bots hoard it
 */
export function chooseBotAction(state: WhotGameState, seat: number): BotAction {
  const legal = legalPlays(state, seat);
  if (legal.length === 0) return { kind: "draw" };

  const bot = profile(seat);
  const style: BotStyle = bot?.style ?? "steady";
  const hand = state.players[seat]?.hand ?? [];
  const next = (seat + 1) % PLAYER_COUNT;
  const victimCards = state.players[next]?.hand.length ?? 5;
  const myCards = hand.length;
  const top = topCard(state);

  const scored = legal.map((c) => {
    let score = 40 + c.value * 0.7;
    if (c.value === 2 || c.value === 3) {
      score += (12 - victimCards) * 2.4; // punish a small hand
    } else if (c.value === 8) {
      score += (10 - victimCards) * 1.8;
    } else if (c.value === 1) {
      score += myCards <= 3 ? 14 : 3;
    } else if (c.value === 14) {
      score += myCards <= 2 ? 18 : -4;
    } else if (c.value === 20) {
      score += style === "aggressive" ? (myCards <= 4 ? 10 : 2) : style === "tricky" ? (myCards <= 2 ? 6 : -12) : -6;
    } else if (c.shape === state.call && c.value === top.value) {
      score += 6; // double-match flexibility kept in reserve
    }
    if (style === "tricky" && c.shape !== state.call) score += 3; // switch the call when handy
    if (style === "aggressive") score += c.value * 0.5;
    return { c, score: score + (Math.random() * 16 - 8) };
  });
  scored.sort((a, b) => b.score - a.score);

  // Human blunder: occasionally grab a random legal card instead.
  if (Math.random() < 0.12) {
    const pick = legal[Math.floor(Math.random() * legal.length)]!;
    return { kind: "play", cardId: pick.id, shape: pick.value === 20 ? botCallShape(hand.filter((h) => h.id !== pick.id)) : undefined };
  }
  const best = scored[0]!.c;
  return {
    kind: "play",
    cardId: best.id,
    shape: best.value === 20 ? botCallShape(hand.filter((h) => h.id !== best.id)) : undefined,
  };
}

