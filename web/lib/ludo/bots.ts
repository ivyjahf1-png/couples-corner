/**
 * bots.ts — opponent personalities for Ludo Superstar.
 *
 * Every non-human seat owns a profile: a style (how it weights moves), a
 * thinking-time window (so "Tunde is thinking…" never feels metronomic), stock
 * phrases for the status bar, and reaction emojis thrown after big plays.
 *
 * Move selection is style-weighted scoring with:
 *  - a 12% "human blunder" chance to pick a non-optimal legal move, so bots
 *    feel like players rather than a table solver,
 *  - ±6 noise so repeated positions don't auto-replay identically.
 */
import {
  FINISH_STEP,
  SAFE_CELLS,
  movableTokens,
  trackCell,
  type LudoColor,
  type LudoGameState,
} from "@/lib/ludo/engine";

export type BotStyle = "aggressive" | "cautious" | "greedy";

export interface BotStyleProfile {
  style: BotStyle;
  /** [min, max] ms of visible "thinking" before the bot rolls. */
  thinkMs: [number, number];
  /** Sentence tails composed as `${name} ${suffix}` while deciding. */
  thinking: string[];
  /** Emoji thrown onto the status bar after captures / home runs. */
  reactions: string[];
}

export interface SeatProfile {
  name: string;
  initials: string;
  level: number;
  flag: string;
  /** Absent = the local human seat (seat 0). */
  bot?: BotStyleProfile;
}

/**
 * Seat order matches engine colors/quadrants:
 * 0 Red BL (human in vs-COMPUTER) · 1 Blue BR · 2 Yellow TR · 3 Green TL.
 */
export const SEATS: readonly [SeatProfile, SeatProfile, SeatProfile, SeatProfile] = [
  { name: "Tunde", initials: "TU", level: 10, flag: "🇳🇬" },
  {
    name: "Aisha",
    initials: "AI",
    level: 7,
    flag: "🇰🇪",
    bot: {
      style: "aggressive",
      thinkMs: [1300, 2900],
      thinking: ["is eyeing a capture…", "smells blood…", "is hunting pawns…", "leans in to plot…"],
      reactions: ["😈", "🔥", "💥"],
    },
  },
  {
    name: "Bella",
    initials: "BE",
    level: 5,
    flag: "🇺🇸",
    bot: {
      style: "cautious",
      thinkMs: [1100, 2500],
      thinking: ["is double-checking the stars…", "is playing it safe…", "counts the squares twice…"],
      reactions: ["😅", "🍀", "👍"],
    },
  },
  {
    name: "David",
    initials: "DA",
    level: 9,
    flag: "🇬🇧",
    bot: {
      style: "greedy",
      thinkMs: [1500, 3300],
      thinking: ["is chasing the pot…", "is counting pips…", "is weighing the odds…", "taps the table, thinking…"],
      reactions: ["😂", "👏", "🔥"],
    },
  },
];

function profile(color: LudoColor): BotStyleProfile | undefined {
  return SEATS[color].bot;
}

/** Visible pre-roll thinking delay — variable so bots never feel robotic. */
export function botThinkDelay(color: LudoColor): number {
  const bot = profile(color);
  if (!bot) return 1300;
  const [min, max] = bot.thinkMs;
  return min + Math.random() * (max - min);
}

/** Post-roll "pick a pawn" delay (bots pause before committing too). */
export function botMoveDelay(color: LudoColor): number {
  return profile(color) ? 550 + Math.random() * 1100 : 350;
}

/** Random status-bar tail: "is hunting pawns…". */
export function thinkSuffix(color: LudoColor): string {
  const bot = profile(color);
  if (!bot) return "is thinking…";
  return bot.thinking[Math.floor(Math.random() * bot.thinking.length)]!;
}

/** Random reaction emoji for a bot after a capture / home run. */
export function botReaction(color: LudoColor): string | null {
  const bot = profile(color);
  if (!bot) return null;
  return bot.reactions[Math.floor(Math.random() * bot.reactions.length)]!;
}

function occupantsAt(
  state: LudoGameState,
  cell: number,
  except: LudoColor,
): Array<{ color: LudoColor; token: number }> {
  const out: Array<{ color: LudoColor; token: number }> = [];
  (state.players as LudoGameState["players"][number][]).forEach((p, c) => {
    if (c === except) return;
    p.tokens.forEach((t, i) => {
      if (trackCell(c as LudoColor, t.steps) === cell) out.push({ color: c as LudoColor, token: i });
    });
  });
  return out;
}

/**
 * Style-weighted move chooser. Returns a legal token index (never null while
 * options exist).
 */
export function chooseBotMove(state: LudoGameState, color: LudoColor, dice: number): number | null {
  const options = movableTokens(state, color, dice);
  if (options.length === 0) return null;
  const bot = profile(color);
  const style: BotStyle = bot?.style ?? "balanced" as BotStyle;

  const score = (idx: number): number => {
    const t = state.players[color].tokens[idx]!;
    if (t.steps === -1) {
      // Leaving base: aggressive bots flood the board first.
      return style === "aggressive" ? 74 : style === "greedy" ? 66 : 58;
    }
    const next = t.steps + dice;
    let s = next;
    if (next === FINISH_STEP) s += style === "greedy" ? 150 : 110;
    if (next > 50) s += 25; // home corridor is progress squared
    const cell = trackCell(color, next);
    if (cell !== null && SAFE_CELLS.has(cell)) {
      s += style === "cautious" ? 55 : 34;
    } else if (cell !== null) {
      const foes = occupantsAt(state, cell, color);
      if (foes.length === 1) {
        s += style === "aggressive" ? 130 : style === "cautious" ? 70 : 95;
      } else if (foes.length > 1) {
        s -= style === "aggressive" ? 30 : 70; // walking into a double stack
      }
      // Cautious bots dislike ending exposed next to a foe one roll away.
      if (style === "cautious" && foes.length === 0) s -= 6;
    }
    return s;
  };

  // Human-like blunder: occasionally take a different legal pawn outright.
  if (options.length > 1 && Math.random() < 0.12) {
    return options[Math.floor(Math.random() * options.length)]!;
  }

  let best = options[0]!;
  let bestScore = -Infinity;
  for (const idx of options) {
    const s = score(idx) + Math.random() * 6;
    if (s > bestScore) {
      bestScore = s;
      best = idx;
    }
  }
  return best;
}