import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Corner Star ⭐ Ludo
 * Standalone React + TypeScript implementation.
 *
 * Local features: Classic, Aero (custom boost-gate variant), 2/4 players,
 * pass-and-play, computer opponents, dice animation, legal moves, captures,
 * safe squares, exact home finish, three-sixes penalty, turn timer, sound,
 * rankings and match results.
 *
 * Online multiplayer and real-money staking intentionally require a trusted
 * server/payment provider. This client never pretends to process real money.
 */

type LudoColor = "red" | "blue" | "yellow" | "green";
type GameMode = "classic" | "aero";
type PlayType = "star-duel" | "pass-play" | "multiplayer";
type Screen = "menu" | "playing" | "results";

interface LudoToken {
  id: string;
  steps: number; // -1 = yard, 0..51 = shared track, 52..57 = home lane, 58 = finished
}

interface LudoPlayer {
  color: LudoColor;
  name: string;
  isLocal: boolean;
  ai: boolean;
  tokens: LudoToken[];
  finished: number;
}

interface GameState {
  screen: Screen;
  playerCount: 2 | 4;
  playType: PlayType;
  mode: GameMode;
  stake: number;
  players: LudoPlayer[];
  currentTurn: number;
  diceValue: number | null;
  rolling: boolean;
  message: string;
  winner: string | null;
  extraTurn: boolean;
  locked: boolean;
  consecutiveSixes: number;
  turnSeconds: number;
  turnStartedAt: number | null;
  history: string[];
}

const COLORS: LudoColor[] = ["red", "blue", "yellow", "green"];
const COLOR_HEX: Record<LudoColor, string> = {
  red: "#f04455",
  blue: "#3988f7",
  yellow: "#f4c542",
  green: "#25bd83",
};
const COLOR_DARK: Record<LudoColor, string> = {
  red: "#8e1e2c",
  blue: "#173e83",
  yellow: "#80600a",
  green: "#126c4b",
};
const START_INDEX: Record<LudoColor, number> = {
  red: 0,
  blue: 39,
  yellow: 26,
  green: 13,
};
const SAFE_STARS = [0, 8, 13, 21, 26, 34, 39, 47];
const AERO_GATES = [0, 13, 26, 39];
const STAKES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 5000, 10000, 25000, 50000, 100000];
const AI_NAMES = ["Kelechi", "Aisha", "Bola", "Chidi", "Fatima", "Emeka", "Zainab", "Kunle", "Nneka", "Obi", "Ada", "Chioma", "Segun", "Ngozi", "Dayo", "Temi"];
const FINISH_STEP = 58;
const TURN_LIMIT = 30;

const TRACK_POINTS: Array<{ x: number; y: number }> = (() => {
  // A 52-space square circuit. The central home lanes branch toward the centre.
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 12; i++) points.push({ x: 72 + i * 34, y: 488 });
  for (let i = 1; i <= 13; i++) points.push({ x: 514, y: 488 - i * 34 });
  for (let i = 1; i <= 13; i++) points.push({ x: 514 - i * 34, y: 46 });
  for (let i = 1; i <= 13; i++) points.push({ x: 72, y: 46 + i * 34 });
  return points.slice(0, 52);
})();

function formatStake(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

function boardCell(color: LudoColor, steps: number): number {
  return (START_INDEX[color] + steps) % 52;
}

function isSafeCell(cell: number): boolean {
  return SAFE_STARS.includes(cell);
}

function getLegalMoves(player: LudoPlayer, dice: number): number[] {
  const legal: number[] = [];
  player.tokens.forEach((token, index) => {
    if (token.steps === FINISH_STEP) return;
    if (token.steps === -1) {
      if (dice === 6) legal.push(index);
      return;
    }
    if (token.steps + dice <= FINISH_STEP) legal.push(index);
  });
  return legal;
}

function makePlayers(count: 2 | 4, type: PlayType): LudoPlayer[] {
  const colors = count === 2 ? ["red", "yellow"] as LudoColor[] : COLORS;
  return colors.map((color, index) => {
    const ai = type === "star-duel" && index > 0;
    return {
      color,
      name: ai ? AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)] : `Player ${index + 1}`,
      isLocal: !ai,
      ai,
      tokens: [0, 1, 2, 3].map((n) => ({ id: `${color}-${n}`, steps: -1 })),
      finished: 0,
    };
  });
}

function nextTurn(state: GameState, message = ""): GameState {
  const next = (state.currentTurn + 1) % state.players.length;
  return {
    ...state,
    currentTurn: next,
    diceValue: null,
    rolling: false,
    locked: false,
    extraTurn: false,
    consecutiveSixes: 0,
    turnSeconds: TURN_LIMIT,
    turnStartedAt: Date.now(),
    message: message || `${state.players[next]?.name ?? "Next player"}'s turn`,
  };
}

function applyMove(state: GameState, tokenIndex: number): GameState {
  const player = state.players[state.currentTurn];
  const dice = state.diceValue;
  if (!player || dice === null || !getLegalMoves(player, dice).includes(tokenIndex)) return state;

  const token = player.tokens[tokenIndex];
  let nextSteps = token.steps === -1 ? 0 : token.steps + dice;
  let aeroBoost = false;

  // Aero is a separate optional ruleset: landing exactly on a gate advances
  // two additional spaces, provided the move does not overshoot the finish.
  if (state.mode === "aero" && nextSteps >= 0 && nextSteps < 52 &&
      AERO_GATES.includes(boardCell(player.color, nextSteps)) &&
      nextSteps + 2 <= FINISH_STEP) {
    nextSteps += 2;
    aeroBoost = true;
  }

  const players = state.players.map((p) => ({
    ...p,
    tokens: p.tokens.map((t) => ({ ...t })),
  }));
  players[state.currentTurn].tokens[tokenIndex].steps = nextSteps;

  let captured = false;
  if (nextSteps >= 0 && nextSteps < 52) {
    const destination = boardCell(player.color, nextSteps);
    if (!isSafeCell(destination)) {
      players.forEach((opponent, pIndex) => {
        if (pIndex === state.currentTurn) return;
        opponent.tokens.forEach((opponentToken) => {
          if (opponentToken.steps >= 0 && opponentToken.steps < 52 &&
              boardCell(opponent.color, opponentToken.steps) === destination) {
            opponentToken.steps = -1;
            captured = true;
          }
        });
      });
    }
  }

  const finished = nextSteps === FINISH_STEP;
  if (finished) players[state.currentTurn].finished += 1;
  const winner = players[state.currentTurn].finished === 4 ? player.name : null;
  const getsExtra = dice === 6 || captured || finished;
  const historyEntry = `${player.name} moved token ${tokenIndex + 1} with ${dice}${captured ? " — capture" : ""}${finished ? " — home" : ""}${aeroBoost ? " — Aero boost" : ""}`;
  const history = [historyEntry, ...state.history].slice(0, 8);

  if (winner) {
    return {
      ...state, players, winner, screen: "results", diceValue: null, rolling: false,
      locked: false, message: `${player.name} wins the match!`, history,
    };
  }

  const nextIndex = getsExtra ? state.currentTurn : (state.currentTurn + 1) % players.length;
  return {
    ...state,
    players,
    currentTurn: nextIndex,
    diceValue: null,
    rolling: false,
    locked: false,
    extraTurn: getsExtra,
    consecutiveSixes: getsExtra && dice === 6 ? state.consecutiveSixes : 0,
    turnSeconds: TURN_LIMIT,
    turnStartedAt: Date.now(),
    message: [
      captured ? "Captured an opponent! " : "",
      finished ? "Token reached home! " : "",
      aeroBoost ? "Aero boost activated! " : "",
      getsExtra ? `${player.name} plays again.` : `${players[nextIndex].name}'s turn.`,
    ].join(""),
    history,
  };
}

function chooseAiMove(player: LudoPlayer, dice: number, players: LudoPlayer[], mode: GameMode): number {
  const legal = getLegalMoves(player, dice);
  if (legal.length <= 1) return legal[0] ?? -1;
  const score = (index: number) => {
    const token = player.tokens[index];
    let step = token.steps === -1 ? 0 : token.steps + dice;
    if (mode === "aero" && step >= 0 && step < 52 && AERO_GATES.includes(boardCell(player.color, step)) && step + 2 <= FINISH_STEP) step += 2;
    let value = Math.random() * 0.5;
    if (token.steps === -1) value += 3;
    if (step === FINISH_STEP) value += 100;
    if (step >= 52) value += 8;
    if (step >= 0 && step < 52) {
      const cell = boardCell(player.color, step);
      if (!isSafeCell(cell) && players.some((p) => p.color !== player.color && p.tokens.some((t) => t.steps >= 0 && t.steps < 52 && boardCell(p.color, t.steps) === cell))) value += 30;
      if (isSafeCell(cell)) value += 5;
    }
    return value;
  };
  return legal.sort((a, b) => score(b) - score(a))[0];
}

function tokenPosition(color: LudoColor, tokenIndex: number, steps: number) {
  if (steps === -1) {
    const bases: Record<LudoColor, { x: number; y: number }> = {
      red: { x: 105, y: 105 }, blue: { x: 455, y: 105 },
      yellow: { x: 455, y: 455 }, green: { x: 105, y: 455 },
    };
    return { x: bases[color].x + (tokenIndex % 2) * 42, y: bases[color].y + Math.floor(tokenIndex / 2) * 42 };
  }
  if (steps >= 0 && steps < 52) {
    const p = TRACK_POINTS[boardCell(color, steps)];
    return { x: p.x, y: p.y };
  }
  if (steps >= 52 && steps < FINISH_STEP) {
    const lanes: Record<LudoColor, { x: number; y: number; dx: number; dy: number }> = {
      red: { x: 276, y: 82, dx: 0, dy: 34 },
      blue: { x: 478, y: 276, dx: -34, dy: 0 },
      yellow: { x: 276, y: 478, dx: 0, dy: -34 },
      green: { x: 82, y: 276, dx: 34, dy: 0 },
    };
    const lane = lanes[color];
    return { x: lane.x + lane.dx * (steps - 52), y: lane.y + lane.dy * (steps - 52) };
  }
  const finishedPositions: Record<LudoColor, { x: number; y: number }> = {
    red: { x: 276, y: 242 }, blue: { x: 310, y: 276 },
    yellow: { x: 276, y: 310 }, green: { x: 242, y: 276 },
  };
  return { x: finishedPositions[color].x + (tokenIndex % 2) * 8, y: finishedPositions[color].y + Math.floor(tokenIndex / 2) * 8 };
}

const initialState: GameState = {
  screen: "menu", playerCount: 4, playType: "pass-play", mode: "classic", stake: 100,
  players: [], currentTurn: 0, diceValue: null, rolling: false, message: "",
  winner: null, extraTurn: false, locked: false, consecutiveSixes: 0,
  turnSeconds: TURN_LIMIT, turnStartedAt: null, history: [],
};

export default function CornerStarLudo() {
  const [game, setGame] = useState<GameState>(initialState);
  const [soundOn, setSoundOn] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [playerNames, setPlayerNames] = useState(["Player 1", "Player 2", "Player 3", "Player 4"]);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPlayer = game.players[game.currentTurn] ?? null;
  const legalMoves = useMemo(() => (
    currentPlayer && game.diceValue !== null ? getLegalMoves(currentPlayer, game.diceValue) : []
  ), [currentPlayer, game.diceValue]);
  const stakeLabel = formatStake(game.stake);

  const clearTimers = useCallback(() => {
    if (rollTimer.current) clearInterval(rollTimer.current);
    if (aiTimer.current) clearTimeout(aiTimer.current);
    if (turnTimer.current) clearInterval(turnTimer.current);
    rollTimer.current = null;
    aiTimer.current = null;
    turnTimer.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const playTone = useCallback((frequency = 440) => {
    if (!soundOn || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
      oscillator.onended = () => void context.close();
    } catch {
      // Audio is optional; gameplay must continue if browser audio is blocked.
    }
  }, [soundOn]);

  const startGame = useCallback(() => {
    clearTimers();
    if (game.playType === "multiplayer") {
      setGame((old) => ({ ...old, message: "Online multiplayer needs a server connection. Choose Star Duel or Play & Pass for local play." }));
      return;
    }
    const players = makePlayers(game.playerCount, game.playType).map((p, i) => ({
      ...p,
      name: p.ai ? p.name : (playerNames[i]?.trim() || `Player ${i + 1}`),
    }));
    setGame((old) => ({
      ...old, players, screen: "playing", currentTurn: 0, diceValue: null,
      rolling: false, winner: null, message: `${players[0].name}'s turn — roll the dice.`,
      extraTurn: false, locked: false, consecutiveSixes: 0, turnSeconds: TURN_LIMIT,
      turnStartedAt: Date.now(), history: [],
    }));
    setLastRoll(null);
  }, [clearTimers, game.playerCount, game.playType, playerNames]);

  const passTurn = useCallback(() => {
    setGame((old) => {
      if (old.screen !== "playing" || old.rolling || old.diceValue !== null || !old.players.length) return old;
      const next = nextTurn(old);
      return { ...next, message: `Pass the device to ${next.players[next.currentTurn].name}.` };
    });
  }, []);

  const rollDice = useCallback(() => {
    if (game.screen !== "playing" || game.rolling || game.locked || game.diceValue !== null || !currentPlayer || currentPlayer.ai) return;
    setGame((old) => ({ ...old, rolling: true, message: `${currentPlayer.name} is rolling…` }));
    let frames = 0;
    if (rollTimer.current) clearInterval(rollTimer.current);
    rollTimer.current = setInterval(() => {
      const preview = Math.floor(Math.random() * 6) + 1;
      setLastRoll(preview);
      frames += 1;
      if (frames >= 12) {
        if (rollTimer.current) clearInterval(rollTimer.current);
        rollTimer.current = null;
        const final = Math.floor(Math.random() * 6) + 1;
        playTone(520 + final * 35);
        setLastRoll(final);
        setGame((old) => {
          const player = old.players[old.currentTurn];
          if (!player) return old;
          if (final === 6 && old.consecutiveSixes >= 2) {
            const next = nextTurn({ ...old, rolling: false, diceValue: null }, `${player.name} rolled three sixes. Turn forfeited.`);
            return { ...next, history: [`${player.name} rolled three sixes — turn forfeited`, ...old.history].slice(0, 8) };
          }
          const moves = getLegalMoves(player, final);
          if (!moves.length) {
            if (final === 6) return {
              ...old, diceValue: null, rolling: false, locked: false,
              consecutiveSixes: old.consecutiveSixes + 1, extraTurn: true,
              message: "No token can move. A six gives you another roll.",
            };
            const skipped = nextTurn({ ...old, rolling: false, diceValue: null }, `${player.name} has no legal move. Turn passes.`);
            return skipped;
          }
          return {
            ...old, diceValue: final, rolling: false, locked: false,
            consecutiveSixes: final === 6 ? old.consecutiveSixes + 1 : 0,
            message: final === 6 ? "Six! Select a token or roll again." : "Select one of the highlighted tokens.",
          };
        });
      }
    }, 75);
  }, [game.screen, game.rolling, game.locked, game.diceValue, currentPlayer, playTone]);

  const moveToken = useCallback((tokenIndex: number) => {
    setGame((old) => {
      if (old.screen !== "playing" || old.diceValue === null || old.locked) return old;
      const player = old.players[old.currentTurn];
      if (!player || player.ai || !getLegalMoves(player, old.diceValue).includes(tokenIndex)) return old;
      const updated = applyMove(old, tokenIndex);
      if (updated.players !== old.players) playTone(660);
      return updated;
    });
  }, [playTone]);

  // Computer player: delay for readability, then choose a legal move using a simple strategy.
  useEffect(() => {
    if (game.screen !== "playing" || !currentPlayer?.ai || game.rolling || game.winner) return;
    aiTimer.current = setTimeout(() => {
      setGame((old) => {
        const player = old.players[old.currentTurn];
        if (!player?.ai || old.diceValue !== null) return old;
        const dice = Math.floor(Math.random() * 6) + 1;
        if (dice === 6 && old.consecutiveSixes >= 2) {
          const next = nextTurn(old, `${player.name} rolled three sixes. Turn forfeited.`);
          return next;
        }
        const moves = getLegalMoves(player, dice);
        if (!moves.length) {
          if (dice === 6) return {
            ...old, consecutiveSixes: old.consecutiveSixes + 1,
            message: `${player.name} rolled six but has no move. Rolling again…`,
          };
          return nextTurn(old, `${player.name} rolled ${dice}; no legal move.`);
        }
        const index = chooseAiMove(player, dice, old.players, old.mode);
        const withRoll = { ...old, diceValue: dice, message: `${player.name} rolled ${dice}.` };
        return applyMove(withRoll, index);
      });
    }, 1100);
    return () => {
      if (aiTimer.current) clearTimeout(aiTimer.current);
      aiTimer.current = null;
    };
  }, [game.screen, game.currentTurn, game.diceValue, game.rolling, game.winner, currentPlayer?.ai, game.consecutiveSixes, game.mode]);

  // Turn countdown. Timeout automatically passes to the next local player.
  useEffect(() => {
    if (game.screen !== "playing" || game.winner || !currentPlayer || currentPlayer.ai || game.rolling || game.diceValue !== null) return;
    turnTimer.current = setInterval(() => {
      setGame((old) => {
        if (old.screen !== "playing" || old.rolling || old.diceValue !== null || !old.players.length) return old;
        if (old.turnSeconds <= 1) {
          const next = nextTurn(old, `${old.players[old.currentTurn].name}'s turn timed out.`);
          return next;
        }
        return { ...old, turnSeconds: old.turnSeconds - 1 };
      });
    }, 1000);
    return () => {
      if (turnTimer.current) clearInterval(turnTimer.current);
      turnTimer.current = null;
    };
  }, [game.screen, game.currentTurn, game.diceValue, game.rolling, currentPlayer?.ai, game.winner]);

  const exitGame = () => {
    clearTimers();
    setGame({ ...initialState });
    setLastRoll(null);
  };

  const activeMoves = new Set(legalMoves);
  const totalPrize = game.stake * game.players.length;

  return (
    <div className="csl-app">
      <style>{`
        *{box-sizing:border-box} .csl-app{position:fixed;inset:0;z-index:9999;overflow:auto;background:radial-gradient(circle at 50% 0%,#2b1450 0,#100b1c 48%,#080711 100%);color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .csl-header{height:70px;padding:0 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff18;background:#090713bb;position:sticky;top:0;z-index:20;backdrop-filter:blur(14px)}
        .csl-brand{display:flex;align-items:center;gap:12px}.csl-logo{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#9b5cff,#ec43c7);font-size:23px;box-shadow:0 0 25px #9b5cff66}
        .csl-title{font-weight:900;letter-spacing:-.04em;font-size:19px}.csl-sub{font-size:11px;color:#b9aeca;margin-top:2px}.csl-btn{border:1px solid #ffffff22;background:#ffffff0d;color:#fff;border-radius:13px;padding:10px 15px;font-weight:700;cursor:pointer;transition:.18s}.csl-btn:hover{background:#ffffff20;transform:translateY(-1px)}.csl-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}
        .csl-primary{border:0;background:linear-gradient(110deg,#8b4cf6,#e344c4);box-shadow:0 10px 30px #9b4df544}.csl-green{border:0;background:linear-gradient(110deg,#11a879,#35c887)}.csl-main{min-height:calc(100% - 70px);padding:24px;display:flex;align-items:center;justify-content:center}
        .csl-panel{width:min(100%,850px);border:1px solid #ffffff1c;border-radius:28px;background:#ffffff0b;padding:26px;box-shadow:0 25px 90px #0008;backdrop-filter:blur(16px)}.csl-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.28em;color:#c9a8ff;font-weight:800}.csl-h2{font-size:clamp(25px,4vw,36px);font-weight:950;letter-spacing:-.045em;margin:8px 0 22px}.csl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.csl-field{padding:15px;border:1px solid #ffffff16;background:#0d0a17;border-radius:17px;min-width:0}.csl-field label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:#a99dbb;font-weight:800;margin-bottom:10px}.csl-options{display:flex;gap:7px;flex-wrap:wrap}.csl-option{padding:9px 12px;border-radius:11px;font-size:12px}.csl-option.selected{background:#8c4ff4;border-color:#bd9aff}.csl-input{width:100%;border:1px solid #ffffff24;background:#ffffff0a;color:#fff;padding:10px 11px;border-radius:10px;outline:none}.csl-note{color:#bcb2cc;font-size:12px;line-height:1.55}.csl-warning{padding:12px 14px;border:1px solid #e7b54d55;background:#e7b54d12;border-radius:13px;color:#f6d78e;font-size:12px;line-height:1.5;margin-top:14px}
        .csl-game{width:min(100%,1240px);display:grid;grid-template-columns:minmax(320px,1fr) 310px;gap:18px;align-items:center}.csl-board-wrap{min-width:0;display:grid;place-items:center;padding:12px;border:1px solid #ffffff1a;border-radius:28px;background:#0d0b18;box-shadow:0 25px 70px #0009}.csl-board{width:min(100%,min(72vh,690px));aspect-ratio:1;position:relative;border-radius:20px;overflow:hidden;border:7px solid #e8d6ff22;background:#f3e8d0;box-shadow:inset 0 0 35px #0003,0 15px 35px #0008}
        .csl-yard{position:absolute;width:36%;height:36%;border:8px solid #fff;border-radius:19px;display:grid;place-items:center;box-shadow:inset 0 0 20px #0002}.csl-yard.red{left:2%;top:2%;background:#f0445544;border-color:#f04455}.csl-yard.blue{right:2%;top:2%;background:#3988f744;border-color:#3988f7}.csl-yard.yellow{right:2%;bottom:2%;background:#f4c54255;border-color:#d7a916}.csl-yard.green{left:2%;bottom:2%;background:#25bd8355;border-color:#25bd83}.csl-yard-inner{width:65%;height:65%;border-radius:14px;background:#fff;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:10%;padding:12%;box-shadow:0 4px 10px #0002}.csl-yard-dot{border-radius:50%;border:3px solid currentColor;background:#fff;box-shadow:inset 0 2px 6px #0002}
        .csl-track{position:absolute;left:24%;top:24%;width:52%;height:52%;border:2px solid #b9a98e;background:#eadfc9;clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}.csl-cell{position:absolute;width:6.2%;height:6.2%;border:1px solid #b7a88f;border-radius:4px;background:#fffaf0;transform:translate(-50%,-50%)}.csl-center{position:absolute;left:40%;top:40%;width:20%;height:20%;background:conic-gradient(#f04455 0 25%,#3988f7 0 50%,#f4c542 0 75%,#25bd83 0);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);border:2px solid #fff}.csl-star{position:absolute;transform:translate(-50%,-50%);font-size:clamp(10px,2vw,17px);color:#d7a21c;text-shadow:0 1px 2px #fff}
        .csl-token{position:absolute;transform:translate(-50%,-50%);width:5.3%;height:5.3%;min-width:15px;min-height:15px;border-radius:50%;border:2px solid #fff;box-shadow:0 3px 7px #0008,inset 0 2px 3px #ffffff88;z-index:5;cursor:pointer;display:grid;place-items:center;color:#fff;font-size:10px;font-weight:900;transition:transform .15s}.csl-token.legal{outline:4px solid #ffe36b;animation:cslPulse 1s infinite}.csl-token:disabled{cursor:default;opacity:.92}.csl-token:not(:disabled):hover{transform:translate(-50%,-50%) scale(1.25)}@keyframes cslPulse{50%{box-shadow:0 0 0 8px #ffe36b33,0 3px 8px #0008}}
        .csl-side{border:1px solid #ffffff1a;border-radius:25px;background:#ffffff0b;padding:18px;min-width:0}.csl-side-title{font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:#b8abc9;font-weight:800}.csl-player{display:flex;justify-content:space-between;align-items:center;padding:11px;border:1px solid #ffffff16;background:#ffffff08;border-radius:14px;margin-top:8px}.csl-player.active{border-color:#ba8cff;background:#8c4ff422}.csl-player-left{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:750}.csl-dot{width:11px;height:11px;border-radius:50%;box-shadow:0 0 12px currentColor}.csl-small{font-size:10px;color:#b7acc7}.csl-status{padding:14px;border-radius:15px;background:#0d0a17;border:1px solid #ffffff15;margin-top:14px;min-height:72px;font-size:13px;line-height:1.5}.csl-dice{width:66px;height:66px;border-radius:16px;background:linear-gradient(145deg,#fff,#d9d2e7);color:#241a35;display:grid;place-items:center;font-size:38px;font-weight:950;margin:13px auto;box-shadow:0 8px 20px #0005,inset 0 2px 4px #fff}.csl-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.csl-history{margin-top:14px;padding-top:12px;border-top:1px solid #ffffff16}.csl-history p{font-size:10px;color:#bcb2cc;margin:7px 0}.csl-results{width:min(100%,620px);text-align:center}.csl-trophy{font-size:65px;filter:drop-shadow(0 8px 15px #f4c54255)}.csl-rank{display:flex;justify-content:space-between;padding:12px;border:1px solid #ffffff18;background:#ffffff08;border-radius:13px;margin-top:8px;font-size:13px}
        @media(max-width:900px){.csl-game{grid-template-columns:1fr;max-width:720px}.csl-board{width:min(100%,min(68vh,620px))}.csl-side{width:100%}.csl-main{align-items:flex-start;padding:14px}.csl-header{padding:0 13px}.csl-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:560px){.csl-header{height:60px}.csl-logo{width:36px;height:36px}.csl-title{font-size:16px}.csl-sub{font-size:9px}.csl-main{padding:10px}.csl-panel{padding:17px;border-radius:20px}.csl-grid{grid-template-columns:1fr}.csl-board-wrap{padding:5px;border-radius:18px}.csl-board{width:100%;border-width:4px}.csl-side{padding:13px}.csl-btn{padding:9px 11px;font-size:12px}}
      `}</style>

      <header className="csl-header">
        <div className="csl-brand">
          <div className="csl-logo">⭐</div>
          <div><div className="csl-title">Corner Star <span style={{ color: "#c49aff" }}>⭐ Ludo</span></div><div className="csl-sub">Play smart. Claim the corner star.</div></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="csl-btn" onClick={() => setSoundOn((v) => !v)} aria-label="Toggle sound">{soundOn ? "🔊 Sound" : "🔇 Sound"}</button>
          {game.screen !== "menu" && <button className="csl-btn" onClick={exitGame}>↩ Exit</button>}
        </div>
      </header>

      {game.screen === "menu" && (
        <main className="csl-main">
          <section className="csl-panel">
            <div className="csl-eyebrow">Welcome to the arena</div>
            <h1 className="csl-h2">Your next Ludo victory starts here.</h1>
            <div className="csl-grid">
              <div className="csl-field">
                <label>Players</label>
                <div className="csl-options">
                  {[2, 4].map((count) => <button key={count} className={`csl-btn csl-option ${game.playerCount === count ? "selected" : ""}`} onClick={() => setGame((g) => ({ ...g, playerCount: count as 2 | 4 }))}>{count} Players</button>)}
                </div>
              </div>
              <div className="csl-field">
                <label>Board mode</label>
                <div className="csl-options">
                  {(["classic", "aero"] as GameMode[]).map((mode) => <button key={mode} className={`csl-btn csl-option ${game.mode === mode ? "selected" : ""}`} onClick={() => setGame((g) => ({ ...g, mode }))}>{mode === "classic" ? "Classic" : "Aero"}</button>)}
                </div>
                <div className="csl-small" style={{ marginTop: 8 }}>{game.mode === "classic" ? "Traditional exact-finish Ludo rules." : "Aero adds +2 movement when landing on a marked gate."}</div>
              </div>
              <div className="csl-field">
                <label>Play type</label>
                <div className="csl-options">
                  <button className={`csl-btn csl-option ${game.playType === "pass-play" ? "selected" : ""}`} onClick={() => setGame((g) => ({ ...g, playType: "pass-play" }))}>Play & Pass</button>
                  <button className={`csl-btn csl-option ${game.playType === "star-duel" ? "selected" : ""}`} onClick={() => setGame((g) => ({ ...g, playType: "star-duel" }))}>Vs Computer</button>
                  <button className="csl-btn csl-option" disabled title="Requires a multiplayer server">Online</button>
                </div>
              </div>
            </div>

            <div className="csl-field" style={{ marginTop: 13 }}>
              <label>Player names</label>
              <div className="csl-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                {Array.from({ length: game.playerCount }, (_, i) => (
                  <input key={i} className="csl-input" value={playerNames[i]} onChange={(e) => setPlayerNames((old) => old.map((name, index) => index === i ? e.target.value : name))} placeholder={`Player ${i + 1}`} disabled={game.playType === "star-duel" && i > 0} />
                ))}
              </div>
            </div>

            <div className="csl-field" style={{ marginTop: 13 }}>
              <label>Match entry / stake display</label>
              <div className="csl-options">
                {STAKES.slice(0, 10).map((value) => <button key={value} className={`csl-btn csl-option ${game.stake === value ? "selected" : ""}`} onClick={() => setGame((g) => ({ ...g, stake: value }))}>{formatStake(value)}</button>)}
              </div>
              <p className="csl-note" style={{ margin: "10px 0 0" }}>Stake selection is a display-only match setting. No wallet, deposit, payment, or prize transfer is performed by this standalone game.</p>
            </div>

            <div className="csl-warning">Online multiplayer, real player accounts, secure matchmaking and real-money staking require a backend service. This build provides local Play & Pass and Computer play without pretending those server features are active.</div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
              <button className="csl-btn csl-primary" style={{ flex: 1, padding: 14, fontSize: 15 }} onClick={startGame}>⭐ Start Match</button>
              <button className="csl-btn" onClick={() => setShowRules((v) => !v)}>Game rules</button>
            </div>
            {showRules && <div className="csl-status" style={{ marginTop: 14 }}>
              <b>Classic rules:</b> Roll a 6 to bring a token out. Move clockwise around the track. Land on an unprotected opponent to send it home. Star spaces are safe. Reach the home lane and roll the exact number to finish. A six, capture, or finishing a token grants another turn. Three consecutive sixes forfeit the turn.
              <br /><br /><b>Aero rules:</b> Uses the same base rules, plus a +2 boost when a move lands exactly on one of the four marked Aero gates, provided the boost does not overshoot the finish.
            </div>}
          </section>
        </main>
      )}

      {game.screen === "playing" && (
        <main className="csl-main">
          <div className="csl-game">
            <div className="csl-board-wrap">
              <div className="csl-board" aria-label="Ludo board">
                <div className="csl-yard red"><div className="csl-yard-inner">{[0, 1, 2, 3].map((n) => <div key={n} className="csl-yard-dot" style={{ color: COLOR_HEX.red }} />)}</div></div>
                <div className="csl-yard blue"><div className="csl-yard-inner">{[0, 1, 2, 3].map((n) => <div key={n} className="csl-yard-dot" style={{ color: COLOR_HEX.blue }} />)}</div></div>
                <div className="csl-yard yellow"><div className="csl-yard-inner">{[0, 1, 2, 3].map((n) => <div key={n} className="csl-yard-dot" style={{ color: COLOR_HEX.yellow }} />)}</div></div>
                <div className="csl-yard green"><div className="csl-yard-inner">{[0, 1, 2, 3].map((n) => <div key={n} className="csl-yard-dot" style={{ color: COLOR_HEX.green }} />)}</div></div>
                <div className="csl-track" />
                {TRACK_POINTS.map((p, i) => (
                  <React.Fragment key={i}>
                    <div className="csl-cell" style={{ left: `${(p.x / 560) * 100}%`, top: `${(p.y / 560) * 100}%`, background: START_INDEX.red === i ? "#f8a4aa" : START_INDEX.blue === i ? "#9bc4ff" : START_INDEX.yellow === i ? "#f9df88" : START_INDEX.green === i ? "#8ee0c0" : "#fffaf0" }} />
                    {SAFE_STARS.includes(i) && <div className="csl-star" style={{ left: `${(p.x / 560) * 100}%`, top: `${(p.y / 560) * 100}%` }}>★</div>}
                    {game.mode === "aero" && AERO_GATES.includes(i) && <div className="csl-star" style={{ left: `${(p.x / 560) * 100}%`, top: `${(p.y / 560) * 100}%`, color: "#8b4cf6" }}>✦</div>}
                  </React.Fragment>
                ))}
                <div className="csl-center" />
                {game.players.map((player, playerIndex) => player.tokens.map((token, tokenIndex) => {
                  const pos = tokenPosition(player.color, tokenIndex, token.steps);
                  const canMove = playerIndex === game.currentTurn && activeMoves.has(tokenIndex) && !player.ai && game.diceValue !== null;
                  return (
                    <button key={token.id} className={`csl-token ${canMove ? "legal" : ""}`} disabled={!canMove} onClick={() => moveToken(tokenIndex)} title={`${player.name} token ${tokenIndex + 1}${canMove ? " — move" : ""}`} style={{ left: `${(pos.x / 560) * 100}%`, top: `${(pos.y / 560) * 100}%`, background: `linear-gradient(145deg,${COLOR_HEX[player.color]},${COLOR_DARK[player.color]})`, zIndex: token.steps === -1 ? 8 + tokenIndex : 10 + playerIndex }} aria-label={`Move ${player.name} token ${tokenIndex + 1}`}><span>★</span></button>
                  );
                }))}
              </div>
              <div className="csl-note" style={{ padding: "9px 4px 0", textAlign: "center" }}>Gold ★ = safe square {game.mode === "aero" ? " · Purple ✦ = Aero boost gate" : ""}</div>
            </div>

            <aside className="csl-side">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div className="csl-side-title">Current turn</div><div style={{ fontSize: 19, fontWeight: 900, marginTop: 4 }}>{currentPlayer?.name}</div></div>
                <div style={{ textAlign: "right" }}><div className="csl-small">Time left</div><div style={{ fontSize: 20, fontWeight: 900, color: game.turnSeconds <= 8 ? "#ff8b8b" : "#fff" }}>{currentPlayer?.ai ? "AI" : `${game.turnSeconds}s`}</div></div>
              </div>
              <div style={{ marginTop: 13 }}>
                {game.players.map((player, index) => (
                  <div key={player.color} className={`csl-player ${index === game.currentTurn ? "active" : ""}`}>
                    <div className="csl-player-left"><span className="csl-dot" style={{ background: COLOR_HEX[player.color], color: COLOR_HEX[player.color] }} />{player.name}{player.ai ? <span className="csl-small">CPU</span> : null}</div>
                    <span className="csl-small">{player.finished}/4 home</span>
                  </div>
                ))}
              </div>
              <div className="csl-status"><div className="csl-side-title">Match status</div><div style={{ marginTop: 7, fontWeight: 750 }}>{game.message}</div></div>
              <div className="csl-dice" aria-live="polite">{game.rolling ? (lastRoll ?? "🎲") : (game.diceValue ?? lastRoll ?? "—")}</div>
              <div className="csl-actions">
                <button className="csl-btn csl-green" onClick={rollDice} disabled={!!currentPlayer?.ai || game.rolling || game.diceValue !== null}>🎲 {game.rolling ? "Rolling…" : "Roll Dice"}</button>
                <button className="csl-btn" onClick={passTurn} disabled={!!currentPlayer?.ai || game.rolling || game.diceValue !== null}>Pass device</button>
              </div>
              {game.diceValue !== null && legalMoves.length > 0 && <div className="csl-note" style={{ marginTop: 10, textAlign: "center" }}>Select a token outlined in gold to move.</div>}
              <div className="csl-history"><div className="csl-side-title">Recent moves</div>{game.history.length ? game.history.slice(0, 5).map((entry, i) => <p key={`${entry}-${i}`}>{entry}</p>) : <p>No moves yet.</p>}</div>
              <div className="csl-note" style={{ marginTop: 12 }}>Mode: {game.mode.toUpperCase()} · Stake display: {stakeLabel} · Pool display: {formatStake(totalPrize)}</div>
              <button className="csl-btn" style={{ width: "100%", marginTop: 12 }} onClick={() => setShowRules((v) => !v)}> {showRules ? "Hide" : "View"} rules</button>
              {showRules && <div className="csl-note" style={{ marginTop: 8 }}>Six to leave yard · exact finish required · safe stars protect tokens · capture and finishing grant an extra turn · three consecutive sixes forfeit the turn.</div>}
            </aside>
          </div>
        </main>
      )}

      {game.screen === "results" && (
        <main className="csl-main">
          <section className="csl-panel csl-results">
            <div className="csl-trophy">🏆</div>
            <div className="csl-eyebrow">Match complete</div>
            <h1 className="csl-h2" style={{ marginBottom: 8 }}>{game.winner} wins!</h1>
            <p className="csl-note">The corner star has been claimed. Congratulations!</p>
            <div style={{ marginTop: 22, textAlign: "left" }}>
              <div className="csl-side-title">Final standings</div>
              {[...game.players].sort((a, b) => b.finished - a.finished).map((player, index) => (
                <div className="csl-rank" key={player.color}>
                  <span>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⭐"} {index + 1}. {player.name}</span>
                  <b>{player.finished}/4 tokens home</b>
                </div>
              ))}
            </div>
            <div className="csl-warning">Displayed prize pool: {formatStake(totalPrize)}. This is a calculation only; no funds have been collected or distributed.</div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="csl-btn" style={{ flex: 1 }} onClick={exitGame}>Main menu</button>
              <button className="csl-btn csl-primary" style={{ flex: 1 }} onClick={startGame}>Play again</button>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
