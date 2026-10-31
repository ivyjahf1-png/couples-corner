import React, { useState, useEffect, useRef } from 'react';

// --- TYPES & INTERFACES ---
type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
  id: number; // 0 to 3
  color: PlayerColor;
  position: number; // -1 = home base, 0-51 = main track, 100-105 = home path, 999 = finished
  stepCount: number; // total steps taken from start
}

interface Player {
  color: PlayerColor;
  name: string;
  isAI: boolean;
  startTrackPos: number; // position on main track where this color enters
}

interface Point {
  x: number;
  y: number;
}

// --- CONSTANTS ---
const PLAYERS_CONFIG: Record<PlayerColor, Player> = {
  red: { color: 'red', name: 'Red', isAI: false, startTrackPos: 0 },
  green: { color: 'green', name: 'Green', isAI: true, startTrackPos: 13 },
  yellow: { color: 'yellow', name: 'Yellow', isAI: true, startTrackPos: 26 },
  blue: { color: 'blue', name: 'Blue', isAI: true, startTrackPos: 39 },
};

const PLAYER_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

// Standard 15x15 board coordinate map for the main track (0 to 51)
const TRACK_COORDS: Point[] = [
  { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
  { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
  { x: 7, y: 0 }, { x: 8, y: 0 },
  { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
  { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
  { x: 14, y: 7 }, { x: 14, y: 8 },
  { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
  { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
  { x: 7, y: 14 }, { x: 6, y: 14 },
  { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
  { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
  { x: 0, y: 7 }, { x: 0, y: 6 }
];

// Coordinates for home stretch paths (5 steps each)
const HOME_PATHS: Record<PlayerColor, Point[]> = {
  red: [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }],
  green: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
  yellow: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }],
  blue: [{ x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }]
};

// Base positions (4 tokens per color in their respective corners)
const BASE_COORDS: Record<PlayerColor, Point[]> = {
  red: [{ x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 }, { x: 1.5, y: 3.5 }, { x: 3.5, y: 3.5 }],
  green: [{ x: 10.5, y: 1.5 }, { x: 12.5, y: 1.5 }, { x: 10.5, y: 3.5 }, { x: 12.5, y: 3.5 }],
  yellow: [{ x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 }, { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 }],
  blue: [{ x: 1.5, y: 10.5 }, { x: 3.5, y: 10.5 }, { x: 1.5, y: 12.5 }, { x: 3.5, y: 12.5 }]
};

// --- SOUND SYNTHESIZER (Web Audio API) ---
class SoundController {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playRoll() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playMove() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playCapture() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }
}

const soundManager = new SoundController();

// --- MAIN COMPONENT ---
export default function LudoGame() {
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState<number>(0);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [logs, setLogs] = useState<string[]>(['Game initialized. Red goes first!']);

  // Initial token state: 4 tokens per color
  const [tokens, setTokens] = useState<Record<PlayerColor, Token[]>>({
    red: [0, 1, 2, 3].map((id) => ({ id, color: 'red', position: -1, stepCount: 0 })),
    green: [0, 1, 2, 3].map((id) => ({ id, color: 'green', position: -1, stepCount: 0 })),
    yellow: [0, 1, 2, 3].map((id) => ({ id, color: 'yellow', position: -1, stepCount: 0 })),
    blue: [0, 1, 2, 3].map((id) => ({ id, color: 'blue', position: -1, stepCount: 0 })),
  });

  const activeColor = PLAYER_ORDER[turnIndex];
  const activePlayer = PLAYERS_CONFIG[activeColor];

  const logMessage = (msg: string) => {
    setLogs((prev) => [msg, ...prev.slice(0, 19)]);
  };

  // Helper to calculate total step destination
  const canMoveToken = (token: Token, roll: number): boolean => {
    if (token.position === 999) return false; // Finished
    if (token.position === -1) return roll === 6; // Needs a 6 to exit base
    return token.stepCount + roll <= 56; // Max 56 steps to reach center
  };

  // Handle rolling the dice
  const rollDice = () => {
    if (isRolling || winner || diceValue !== null) return;

    setIsRolling(true);
    soundManager.playRoll();

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      setIsRolling(false);
      logMessage(`${activePlayer.name} rolled a ${roll}!`);
      // Handle 3 consecutive 6s rule
      if (roll === 6) { // <-- Fixed '1f' to 'if'
        const nextSixes = consecutiveSixes + 1;
        setConsecutiveSixes(nextSixes);

        if (nextSixes === 3) {
        logMessage(`3 consecutive 6s! Turn forfeited.`);
          setConsecutiveSixes(0);
          setTimeout(() => nextTurn(), 1000);
          return;
        }
      } else {
        setConsecutiveSixes(0);
      }

      // Check available valid moves
      const currentTokens = tokens[activeColor];
      const moveableTokens = currentTokens.filter((t) => canMoveToken(t, roll));

      if (moveableTokens.length === 0) {
        logMessage(`No valid moves for ${activePlayer.name}.`);
        setTimeout(() => nextTurn(), 1000);
      } else if (activePlayer.isAI) {
        // AI selects best token after roll
        setTimeout(() => handleAIMove(moveableTokens, roll), 600);
      }
    }, 600);
  };

  // AI Decision Logic
  const handleAIMove = (moveable: Token[], roll: number) => {
    // Priority: 1. Finish token, 2. Capture enemy, 3. Leave base on 6, 4. Move highest step token
    let chosen = moveable.find((t) => t.stepCount + roll === 56);

    if (!chosen) {
      // Look for a capture
      chosen = moveable.find((t) => {
        if (t.position === -1) return false;
        const targetPos = (t.position + roll) % 52;
        if (SAFE_SPOTS.includes(targetPos)) return false;
        return Object.values(tokens).some((pTokens) =>
          pTokens.some(
            (other) =>
              other.color !== activeColor &&
              other.position === targetPos &&
              other.position < 100
          )
        );
      });
    }

    if (!chosen && roll === 6) {
      chosen = moveable.find((t) => t.position === -1);
    }

    if (!chosen) {
      chosen = moveable.sort((a, b) => b.stepCount - a.stepCount)[0];
    }

    if (chosen) {
      executeMove(chosen, roll);
    }
  };

  // Execute Token Movement
  const executeMove = (token: Token, roll: number) => {
    soundManager.playMove();

    setTokens((prev) => {
      const playerTokens = [...prev[token.color]];
      const targetToken = { ...playerTokens[token.id] };

      let nextPos = targetToken.position;
      let nextStep = targetToken.stepCount;

      if (targetToken.position === -1) {
        // Exit home base to track
        nextPos = PLAYERS_CONFIG[token.color].startTrackPos;
        nextStep = 0;
      } else {
        nextStep += roll;
        if (nextStep > 50) {
          // In Home Path (100+) or Finished (999)
          if (nextStep === 56) {
            nextPos = 999; // Reached Center
          } else {
            nextPos = 100 + (nextStep - 51);
          }
        } else {
          nextPos = (targetToken.position + roll) % 52;
        }
      }

      targetToken.position = nextPos;
      targetToken.stepCount = nextStep;
      playerTokens[token.id] = targetToken;

      const newTokens = { ...prev, [token.color]: playerTokens };

      // Check Capture Logic (Only on main track positions < 100)
      let captured = false;
      if (nextPos < 100 && !SAFE_SPOTS.includes(nextPos)) {
        Object.keys(newTokens).forEach((cKey) => {
          const color = cKey as PlayerColor;
          if (color !== token.color) {
            newTokens[color] = newTokens[color].map((other) => {
              if (other.position === nextPos) {
                captured = true;
                soundManager.playCapture();
                logMessage(`${PLAYERS_CONFIG[token.color].name} captured ${PLAYERS_CONFIG[color].name}!`);
                return { ...other, position: -1, stepCount: 0 };
              }
              return other;
            });
          }
        });
      }

      // Check Win Condition (All 4 tokens at 999)
      if (newTokens[token.color].every((t) => t.position === 999)) {
        setWinner(token.color);
        logMessage(`${PLAYERS_CONFIG[token.color].name} WINS THE GAME!`);
        return newTokens;
      }

      // Turn transition
      if (roll === 6 || captured) {
        logMessage(`${PLAYERS_CONFIG[token.color].name} gets an extra turn!`);
        setDiceValue(null);
      } else {
        setTimeout(() => nextTurn(), 500);
      }

      return newTokens;
    });
  };

  const nextTurn = () => {
    setDiceValue(null);
    setTurnIndex((prev) => (prev + 1) % 4);
  };

  // Auto Roll for AI
  useEffect(() => {
    if (activePlayer.isAI && !winner && diceValue === null && !isRolling) {
      const timer = setTimeout(() => rollDice(), 800);
      return () => clearTimeout(timer);
    }
  }, [turnIndex, diceValue, isRolling, winner]);

  // Convert game board grid (15x15) coordinates to percentages for CSS absolute layout
  const getCoordinates = (token: Token): Point => {
    if (token.position === -1) {
      return BASE_COORDS[token.color][token.id];
    }
    if (token.position === 999) {
      return { x: 7, y: 7 }; // Central victory square
    }
    if (token.position >= 100) {
      const idx = token.position - 100;
      return HOME_PATHS[token.color][idx];
    }
    return TRACK_COORDS[token.position];
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen bg-slate-900 text-white p-4 font-sans gap-8">
      {/* LEFT PANEL: Controls & Status */}
      <div className="flex flex-col items-center gap-6 w-full max-w-md bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
        <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 bg-clip-text text-transparent">
          LUDO TSX
        </h1>

        {/* Current Turn Indicator */}
        <div className="flex items-center gap-3 w-full justify-center p-3 rounded-xl bg-slate-900/60 border border-slate-700">
          <span className="text-sm font-medium text-slate-400">Current Turn:</span>
          <span
            className="px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider"
            style={{
              backgroundColor: activeColor,
              color: activeColor === 'yellow' ? '#000' : '#fff',
            }}
          >
            {activePlayer.name} {activePlayer.isAI ? '(AI)' : '(Player)'}
          </span>
        </div>

        {/* 3D Animated Dice Visualizer */}
        <div className="flex flex-col items-center justify-center my-4">
          <button
            onClick={rollDice}
            disabled={activePlayer.isAI || diceValue !== null || isRolling || !!winner}
            className={`w-24 h-24 rounded-2xl bg-slate-100 text-slate-900 font-extrabold text-4xl shadow-2xl flex items-center justify-center border-4 border-slate-300 transition-all transform active:scale-95 ${
              isRolling ? 'animate-bounce' : ''
            } ${
              !activePlayer.isAI && diceValue === null && !winner
                ? 'hover:bg-white hover:shadow-indigo-500/50 cursor-pointer ring-4 ring-indigo-500/40'
                : 'cursor-not-allowed opacity-90'
            }`}
          >
            {diceValue !== null ? diceValue : '?'}
          </button>
          <span className="text-xs text-slate-400 mt-2 font-medium">
            {!activePlayer.isAI && diceValue === null ? 'Click dice to roll' : ''}
          </span>
        </div>

        {/* Game Event Logs */}
        <div className="w-full h-36 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-y-auto text-xs text-slate-300 font-mono space-y-1">
          {logs.map((log, idx) => (
            <div key={idx} className={idx === 0 ? 'text-indigo-400 font-semibold' : ''}>
              &gt; {log}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: SVG / HTML Interactive Ludo Board */}
      <div className="relative w-full max-w-[600px] aspect-square bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-slate-700">
        {/* 15x15 Grid Layout */}
        <div className="grid grid-cols-15 grid-rows-15 w-full h-full relative">
          {/* Base Homes */}
          <div className="col-span-6 row-span-6 bg-red-600 p-4 border border-black flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 p-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-red-600/20 rounded-full border-2 border-red-600"></div>
              ))}
            </div>
          </div>
          <div className="col-span-3 row-span-6 bg-slate-100 border border-black grid grid-cols-3 grid-rows-6">
            {/* Top Track */}
          </div>
          <div className="col-span-6 row-span-6 bg-green-600 p-4 border border-black flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 p-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-green-600/20 rounded-full border-2 border-green-600"></div>
              ))}
            </div>
          </div>

          <div className="col-span-6 row-span-3 bg-slate-100 border border-black"></div>

          {/* Central Winning Triangle */}
          <div className="col-span-3 row-span-3 bg-slate-200 border border-black relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-transparent to-red-600 opacity-60"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-transparent to-yellow-500 opacity-60"></div>
            <span className="z-10 font-black text-xs text-slate-800">FINISH</span>
          </div>

          <div className="col-span-6 row-span-3 bg-slate-100 border border-black"></div>

          <div className="col-span-6 row-span-6 bg-blue-600 p-4 border border-black flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 p-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-blue-600/20 rounded-full border-2 border-blue-600"></div>
              ))}
            </div>
          </div>
          <div className="col-span-3 row-span-6 bg-slate-100 border border-black"></div>
          <div className="col-span-6 row-span-6 bg-yellow-500 p-4 border border-black flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 p-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-yellow-500/20 rounded-full border-2 border-yellow-500"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Tokens Layer */}
        {Object.values(tokens)
          .flat()
          .map((token) => {
            const coord = getCoordinates(token);
            const isClickable =
              !activePlayer.isAI &&
              token.color === activeColor &&
              diceValue !== null &&
              canMoveToken(token, diceValue);

            // Stagger position slightly if multiple tokens occupy the exact same cell
            const sameCellCount = Object.values(tokens)
              .flat()
              .filter((t) => t.position === token.position && t.position !== -1).length;
            const offset = sameCellCount > 1 ? (token.id % 2 === 0 ? -1.2 : 1.2) : 0;

            return (
              <button
              key={`${token.color}-${token.id}`}
                onClick={() => isClickable && diceValue && executeMove(token, diceValue)}
                disabled={!isClickable}
                style={{
                  left: ${((coord.x + 0.5 + offset / 4) / 15) * 100}%,
                  top: ${((coord.y + 0.5 + offset / 4) / 15) * 100}%,
                }}
                className={`absolute w-[5.2%] h-[5.2%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg transition-all duration-300 z-20 flex items-center justify-center ${
                  token.color === 'red'
                    ? 'bg-red-600'
                    : token.color === 'green'
                    ? 'bg-green-600'
                    : token.color === 'yellow'
                    ? 'bg-yellow-400'
                    : 'bg-blue-600'
                } ${
                  isClickable
                    ? 'ring-4 ring-white animate-pulse cursor-pointer scale-125 z-30'
                    : 'cursor-default'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-white/80"></div>
              </button>
            );
          })}
      </div>
    </div>
  );
}