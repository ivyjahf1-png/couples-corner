"use client";

import React, { useState } from "react";
import { 
  ArrowLeft, 
  Trophy, 
  Lock, 
  Smile, 
  MessageSquare, 
  PhoneCall, 
  Sparkles 
} from "lucide-react";

type PlayerColor = "red" | "green" | "yellow" | "blue";

interface Token {
  id: number;
  steps: number; // -1 = Home Base, 0-51 = Main Track Ring, 52-57 = Home Stretch, 58 = Finished Center
}

interface Player {
  color: PlayerColor;
  name: string;
  country: string;
  avatar: string;
  startTrack: number;
  homeEntry: number;
  tokens: Token[];
}

const PLAYER_CONFIGS: Record<PlayerColor, { startTrack: number; homeEntry: number; hex: string }> = {
  red: { startTrack: 0, homeEntry: 50, hex: "#ef4444" },
  green: { startTrack: 13, homeEntry: 11, hex: "#22c55e" },
  yellow: { startTrack: 26, homeEntry: 24, hex: "#eab308" },
  blue: { startTrack: 39, homeEntry: 37, hex: "#3b82f6" },
};

const SAFE_TILES = [0, 8, 13, 21, 26, 34, 39, 47];
const TURN_ORDER: PlayerColor[] = ["red", "green", "yellow", "blue"];

const TRACK_PATH: ReadonlyArray<readonly [number, number]> = [
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6],
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0],
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14],
];

const HOME_PATHS: Record<PlayerColor, ReadonlyArray<readonly [number, number]>> = {
  red: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

export default function LudoBoard() {
  const [turn, setTurn] = useState<PlayerColor>("red");
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [winner, setWinner] = useState<PlayerColor | null>(null);

  const [players, setPlayers] = useState<Record<PlayerColor, Player>>({
    red: {
      color: "red",
      name: "busybrain...",
      country: "🇳🇬",
      avatar: "🧔🏽‍♂️",
      startTrack: 0,
      homeEntry: 50,
      tokens: Array.from({ length: 4 }, (_, i) => ({ id: i, steps: -1 })),
    },
    green: {
      color: "green",
      name: "Itzel",
      country: "🇲🇽",
      avatar: "👩🏽‍🦰",
      startTrack: 13,
      homeEntry: 11,
      tokens: Array.from({ length: 4 }, (_, i) => ({ id: i, steps: -1 })),
    },
    yellow: {
      color: "yellow",
      name: "Miray",
      country: "🇺🇸",
      avatar: "👱🏼‍♀️",
      startTrack: 26,
      homeEntry: 24,
      tokens: Array.from({ length: 4 }, (_, i) => ({ id: i, steps: -1 })),
    },
    blue: {
      color: "blue",
      name: "Azeel",
      country: "🇸🇦",
      avatar: "👦🏽",
      startTrack: 39,
      homeEntry: 37,
      tokens: Array.from({ length: 4 }, (_, i) => ({ id: i, steps: -1 })),
    },
  });

  const rollDice = () => {
    if (hasRolled || isRolling || winner) return;

    setIsRolling(true);
    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);
      setHasRolled(true);

      const currentPlayer = players[turn];
      const canMoveAny = currentPlayer.tokens.some((token) => isValidMove(token, rolled, turn));

      if (!canMoveAny) {
        setTimeout(() => passTurn(rolled === 6), 1200);
      }
    }, 500);
  };

  const isValidMove = (token: Token, rolled: number, playerColor: PlayerColor): boolean => {
    if (token.steps === 58) return false;
    if (token.steps === -1) return rolled === 6;

    if (token.steps >= 52) {
      return token.steps + rolled <= 58;
    }
    return true;
  };

  const handleTokenClick = (playerColor: PlayerColor, tokenId: number) => {
    if (!hasRolled || diceValue === null || playerColor !== turn) return;

    const token = players[playerColor].tokens.find((t) => t.id === tokenId);
    if (!token || !isValidMove(token, diceValue, playerColor)) return;

    let newSteps = token.steps;

    if (token.steps === -1 && diceValue === 6) {
      newSteps = 0;
    } else if (token.steps >= 0 && token.steps < 52) {
      const currentRel = token.steps;
      const nextRel = currentRel + diceValue;

      if (currentRel <= 50 && nextRel > 50) {
        const excess = nextRel - 51;
        newSteps = 52 + excess;
      } else {
        newSteps = (currentRel + diceValue) % 52;
      }
    } else if (token.steps >= 52) {
      newSteps = token.steps + diceValue;
      if (newSteps > 58) return;
    }

    let captured = false;
    const updatedPlayers = JSON.parse(JSON.stringify(players));

    if (newSteps >= 0 && newSteps < 52 && !SAFE_TILES.includes(newSteps)) {
      const globalPos = (newSteps + PLAYER_CONFIGS[playerColor].startTrack) % 52;

      Object.keys(updatedPlayers).forEach((key) => {
        const c = key as PlayerColor;
        if (c !== playerColor) {
          updatedPlayers[c].tokens.forEach((oppToken: Token) => {
            if (oppToken.steps >= 0 && oppToken.steps < 52) {
              const oppGlobal = (oppToken.steps + PLAYER_CONFIGS[c].startTrack) % 52;
              if (oppGlobal === globalPos) {
                oppToken.steps = -1;
                captured = true;
              }
            }
          });
        }
      });
    }

    const targetToken = updatedPlayers[playerColor].tokens.find((t: Token) => t.id === tokenId);
    targetToken.steps = newSteps;

    setPlayers(updatedPlayers);

    const hasWon = updatedPlayers[playerColor].tokens.every((t: Token) => t.steps === 58);
    if (hasWon) {
      setWinner(playerColor);
      return;
    }

    passTurn(diceValue === 6 || captured);
  };

  const passTurn = (extraTurn: boolean) => {
    setHasRolled(false);
    setDiceValue(null);
    if (!extraTurn) {
      const currentIndex = TURN_ORDER.indexOf(turn);
      const nextTurn = TURN_ORDER[(currentIndex + 1) % TURN_ORDER.length];
      setTurn(nextTurn);
    }
  };

  const getTokenCoords = (playerColor: PlayerColor, token: Token) => {
    if (token.steps === -1) return null;
    if (token.steps === 58) return { row: 7, col: 7 };

    if (token.steps >= 52) {
      const path = HOME_PATHS[playerColor];
      const coord = path[token.steps - 52];
      return coord ? { row: coord[0], col: coord[1] } : null;
    }

    const config = PLAYER_CONFIGS[playerColor];
    const globalIndex = (token.steps + config.startTrack) % 52;
    const coord = TRACK_PATH[globalIndex];
    return coord ? { row: coord[0], col: coord[1] } : null;
  };

  return (
    <div className="relative w-full min-h-screen bg-[#0C0F24] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1C1A4A] via-[#0C0F24] to-[#050614] text-white flex flex-col items-center justify-between p-3 select-none font-sans overflow-x-hidden">
      
      {/* Top Header Bar */}
      <div className="w-full max-w-sm flex items-center justify-between pt-2 mb-2 z-20">
        <button className="w-9 h-9 bg-[#1E2045] hover:bg-[#2A2D64] rounded-xl flex items-center justify-center border border-indigo-500/30 text-slate-300 shadow-md">
          <ArrowLeft size={18} />
        </button>
        
        <div className="bg-[#1E2045] border border-indigo-500/40 px-5 py-1.5 rounded-full shadow-inner flex items-center gap-2">
          <Sparkles size={14} className="text-amber-400" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200">Classic</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#1E2045] border border-indigo-500/40 px-3 py-1 rounded-full shadow-lg">
          <span className="text-sky-400 font-bold text-xs">💎</span>
          <span className="text-xs font-black text-slate-100">0</span>
          <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white ml-0.5">+</div>
        </div>
      </div>

      {/* Top Opponents */}
      <div className="w-full max-w-sm flex items-center justify-between px-1 mb-1 z-20">
        <div className="flex items-center gap-2">
          <div className={`relative p-0.5 rounded-2xl border-2 ${turn === "green" ? "border-emerald-400 animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.8)]" : "border-emerald-600/60"} bg-[#151838]`}>
            <div className="w-11 h-11 rounded-xl bg-[#1E224F] flex items-center justify-center text-xl">
              {players.green.avatar}
            </div>
            <span className="absolute -bottom-1 -right-1 text-[10px]">🇲🇽</span>
          </div>
          <span className="text-xs font-bold text-slate-200 tracking-wide">Itzel</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200 tracking-wide">Miray</span>
          <div className={`relative p-0.5 rounded-2xl border-2 ${turn === "yellow" ? "border-amber-400 animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.8)]" : "border-amber-600/60"} bg-[#151838]`}>
            <div className="w-11 h-11 rounded-xl bg-[#1E224F] flex items-center justify-center text-xl">
              {players.yellow.avatar}
            </div>
            <span className="absolute -bottom-1 -right-1 text-[10px]">🇺🇸</span>
          </div>
        </div>
      </div>

      {/* Main Ludo Board Container */}
      <div className="relative w-full max-w-[350px] aspect-square bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-2.5 grid grid-cols-15 grid-rows-15 gap-0.5 z-10 border border-slate-200">
        
        {/* Green Base */}
        <div className="col-span-6 row-span-6 bg-[#22c55e] rounded-2xl p-3 flex flex-col justify-between shadow-inner relative">
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 gap-2 p-3 items-center justify-center shadow-inner">
            {players.green.tokens.map((token) => (
              token.steps === -1 ? (
                <button
                  key={token.id}
                  onClick={() => handleTokenClick("green", token.id)}
                  disabled={turn !== "green" || !hasRolled || !isValidMove(token, diceValue || 0, "green")}
                  className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-xs shadow transition ${
                    turn === "green" && hasRolled && isValidMove(token, diceValue || 0, "green") ? "scale-110 ring-4 ring-emerald-400 animate-bounce cursor-pointer" : ""
                  }`}
                >
                  🛡️
                </button>
              ) : <div key={token.id} className="w-7 h-7 opacity-0"></div>
            ))}
          </div>
        </div>

        {/* Top Pathway */}
        <div className="col-span-3 row-span-6 bg-slate-50 flex flex-col items-center justify-between py-1 border border-slate-200">
          <div className="w-full h-1/6 bg-amber-400 flex items-center justify-center text-[10px]">⭐</div>
          <div className="w-full h-1/6 bg-yellow-100 flex items-center justify-center"><Lock size={12} className="text-amber-600"/></div>
          <div className="w-full h-1/6 bg-amber-400 flex items-center justify-center">🏰</div>
        </div>

        {/* Yellow Base */}
        <div className="col-span-6 row-span-6 bg-[#eab308] rounded-2xl p-3 flex flex-col justify-between shadow-inner relative">
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 gap-2 p-3 items-center justify-center shadow-inner">
            {players.yellow.tokens.map((token) => (
              token.steps === -1 ? (
                <button
                  key={token.id}
                  onClick={() => handleTokenClick("yellow", token.id)}
                  disabled={turn !== "yellow" || !hasRolled || !isValidMove(token, diceValue || 0, "yellow")}
                  className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-xs shadow transition ${
                    turn === "yellow" && hasRolled && isValidMove(token, diceValue || 0, "yellow") ? "scale-110 ring-4 ring-amber-300 animate-bounce cursor-pointer" : ""
                  }`}
                >
                  🏰
                </button>
              ) : <div key={token.id} className="w-7 h-7 opacity-0"></div>
            ))}
          </div>
        </div>

        {/* Center Finish Triangle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-slate-900 border-2 border-amber-400 rounded-xl flex items-center justify-center z-30 shadow-2xl rotate-45">
          <Trophy size={20} className="text-amber-400 -rotate-45" />
        </div>

        {/* Blue Base */}
        <div className="col-span-6 row-span-6 bg-[#3b82f6] rounded-2xl p-3 flex flex-col justify-between shadow-inner relative self-end">
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 gap-2 p-3 items-center justify-center shadow-inner">
            {players.blue.tokens.map((token) => (
              token.steps === -1 ? (
                <button
                  key={token.id}
                  onClick={() => handleTokenClick("blue", token.id)}
                  disabled={turn !== "blue" || !hasRolled || !isValidMove(token, diceValue || 0, "blue")}
                  className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center text-xs shadow transition ${
                    turn === "blue" && hasRolled && isValidMove(token, diceValue || 0, "blue") ? "scale-110 ring-4 ring-blue-400 animate-bounce cursor-pointer" : ""
                  }`}
                >
                  💧
                </button>
              ) : <div key={token.id} className="w-7 h-7 opacity-0"></div>
            ))}
          </div>
        </div>

        {/* Red Base */}
        <div className="col-span-6 row-span-6 bg-[#ef4444] rounded-2xl p-3 flex flex-col justify-between shadow-inner relative self-end">
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 gap-2 p-3 items-center justify-center shadow-inner">
            {players.red.tokens.map((token) => (
              token.steps === -1 ? (
                <button
                  key={token.id}
                  onClick={() => handleTokenClick("red", token.id)}
                  disabled={turn !== "red" || !hasRolled || !isValidMove(token, diceValue || 0, "red")}
                  className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-red-500 flex items-center justify-center text-xs shadow transition ${
                    turn === "red" && hasRolled && isValidMove(token, diceValue || 0, "red") ? "scale-110 ring-4 ring-red-400 animate-bounce cursor-pointer" : ""
                  }`}
                >
                  🐅
                </button>
              ) : <div key={token.id} className="w-7 h-7 opacity-0"></div>
            ))}
          </div>
        </div>

        {/* Track Seeds Overlay Layer */}
        <div className="absolute inset-0 grid grid-cols-15 grid-rows-15 pointer-events-none p-2.5">
          {(["red", "green", "yellow", "blue"] as PlayerColor[]).map((color) =>
            players[color].tokens.map((token) => {
              const coords = getTokenCoords(color, token);
              if (!coords) return null;

              const isMovable = turn === color && hasRolled && isValidMove(token, diceValue || 0, color);
              const icons = { red: "🐅", green: "🛡️", yellow: "🏰", blue: "💧" };

              return (
                <div
                  key={`${color}-${token.id}`}
                  className="absolute z-30 transition-all duration-300 ease-in-out flex items-center justify-center"
                  style={{
                    gridColumn: `${coords.col + 1}`,
                    gridRow: `${coords.row + 1}`,
                    width: "6.66%",
                    height: "6.66%",
                    left: `${(coords.col / 15) * 100}%`,
                    top: `${(coords.row / 15) * 100}%`,
                  }}
                >
                  <button
                    onClick={() => handleTokenClick(color, token.id)}
                    disabled={!isMovable}
                    className={`w-6 h-6 rounded-full bg-slate-900 text-white border-2 flex items-center justify-center text-[10px] shadow-lg pointer-events-auto ${
                      color === "red" ? "border-red-500" : color === "green" ? "border-emerald-500" : color === "yellow" ? "border-amber-400" : "border-blue-500"
                    } ${isMovable ? "scale-125 ring-2 ring-white animate-bounce cursor-pointer" : ""}`}
                  >
                    {icons[color]}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Floating 3D Dice */}
        <div 
          onClick={rollDice}
          className={`absolute bottom-4 left-4 w-14 h-14 bg-white rounded-2xl border-2 border-red-300 shadow-[0_10px_25px_rgba(239,68,68,0.6)] flex items-center justify-center cursor-pointer transform hover:scale-105 transition z-40 ${
            turn === "red" && !hasRolled ? "ring-4 ring-amber-400 animate-pulse" : "opacity-80"
          }`}
        >
          <span className="text-lg font-black text-slate-900">
            {diceValue !== null ? diceValue : "🎲"}
          </span>
        </div>

      </div>

      {/* Bottom Player Row */}
      <div className="w-full max-w-sm flex items-center justify-between px-1 mt-2 z-20">
        <div className="flex items-center gap-3 relative">
          {turn === "red" && (
            <div className="absolute -top-7 left-3 text-emerald-400 animate-bounce z-30 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18L4 8h16L12 18z"/></svg>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className={`relative p-0.5 rounded-2xl border-2 ${turn === "red" ? "border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)]" : "border-red-600/60"} bg-[#151838]`}>
              <div className="w-11 h-11 rounded-xl bg-[#1E224F] flex items-center justify-center text-xl">
                {players.red.avatar}
              </div>
              <span className="absolute -bottom-1 -right-1 text-[10px]">🇳🇬</span>
            </div>
            <span className="text-xs font-bold text-white tracking-wide">{players.red.name}</span>
          </div>

          {turn === "red" && (
            <button
              onClick={rollDice}
              disabled={hasRolled || isRolling}
              className="px-3 py-2 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-xl text-xs font-black shadow-lg uppercase tracking-wider transition active:scale-95"
            >
              {isRolling ? "Rolling..." : hasRolled ? "Move" : "Roll"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200">Azeel</span>
          <div className={`relative p-0.5 rounded-2xl border-2 ${turn === "blue" ? "border-blue-400 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.8)]" : "border-blue-600/60"} bg-[#151838]`}>
            <div className="w-11 h-11 rounded-xl bg-[#1E224F] flex items-center justify-center text-xl">
              {players.blue.avatar}
            </div>
            <span className="absolute -bottom-1 -right-1 text-[10px]">🇸🇦</span>
          </div>
        </div>
      </div>
      {/* Bottom Action Buttons Bar */}
      <div className="w-full max-w-sm flex items-center gap-2 px-1 mt-2.5 z-20">
        <button className="flex-1 py-2.5 bg-[#1E224F] hover:bg-[#282C66] border border-indigo-500/30 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg text-slate-200">
          <Smile size={15} className="text-amber-400" />
          <span>Emoji</span>
        </button>
        <button className="flex-1 py-2.5 bg-[#1E224F] hover:bg-[#282C66] border border-indigo-500/30 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg text-slate-200">
          <MessageSquare size={15} className="text-sky-400" />
          <span>Chat</span>
        </button>
        <button className="flex-1 py-2.5 bg-[#1E224F] hover:bg-[#282C66] border border-indigo-500/30 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg text-slate-200">
          <PhoneCall size={15} className="text-emerald-400" />
          <span>Call</span>
        </button>
      </div>

    </div>
  );
}