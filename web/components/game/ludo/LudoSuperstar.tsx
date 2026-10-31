"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, Trophy, ArrowLeft, RefreshCw, Smile, MessageSquare, Bot, Plus, Minus } from "lucide-react";

export type Color = "green" | "yellow" | "red" | "blue";

export interface Pawn {
  id: number;
  color: Color;
  step: number; // -1 = Yard, 0..50 = Main Path, 51..56 = Home Stretch, 57 = Home
}

export interface PlayerProfile {
  name: string;
  countryFlag: string;
  avatarUrl: string;
  isUser?: boolean;
}

// ----------------------------------------------------------------------
// 1. INDUSTRY STANDARD LUDO BOARD PATHWAY & TILE MAPPING (15x15 Grid)
// ----------------------------------------------------------------------
// 52 Outer Track Coordinates [Row, Col] (0-indexed: 0..14)
const MAIN_PATH: [number, number][] = [
  // Green Track (Start at Green Home Gate = Tile 2)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], // Up top
  [0, 7], // Top turning tile
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // Down yellow
  // Yellow Start at Tile 15 -> Tile 9 from Green Exit is [2, 6] & [2, 8]
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // Right blue
  [7, 14], // Right turning tile
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // Down red
  [14, 7], // Bottom turning tile
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // Left green
  [7, 0] // Left turning tile
];

// Start Gate Tile Indices on MAIN_PATH (2nd tile from yard exit)
const START_TILES: Record<Color, number> = {
  green: 1,  // [6, 2]
  yellow: 14, // [2, 8]
  blue: 27,  // [8, 12]
  red: 40    // [12, 6]
};

// Industry Standard Safe Stars (8 Universal Safe Tiles: 4 Home Gates + 4 9th-tile Stars)
const SAFE_STAR_TILES = new Set([
  1, 9,   // Green Gate & 9th tile beside Yellow
  14, 22, // Yellow Gate & 9th tile beside Blue
  27, 35, // Blue Gate & 9th tile beside Red
  40, 48  // Red Gate & 9th tile beside Green
]);

// Color Home Stretches (Tiles 51 to 56 leading to Center)
const HOME_STRETCHES: Record<Color, [number, number][]> = {
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  yellow: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  red: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]]
};

// ----------------------------------------------------------------------
// 2. DYNAMIC MATCHMAKING & PROFILES (NO HARDCODED OPPONENTS)
// ----------------------------------------------------------------------
const NAMES_POOL: PlayerProfile[] = [
  { name: "Manish", countryFlag: "🇮🇳", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
  { name: "Azeel", countryFlag: "🇦🇪", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100" },
  { name: "Miray", countryFlag: "🇹🇷", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" },
  { name: "Kemi", countryFlag: "🇳🇬", avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100" },
  { name: "Lucas", countryFlag: "🇧🇷", avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100" }
];

function generateOpponents(): Record<Color, PlayerProfile> {
  const shuffled = [...NAMES_POOL].sort(() => 0.5 - Math.random());
  return {
    green: shuffled[0],
    yellow: shuffled[1],
    red: { name: "busybrain", countryFlag: "🇳🇬", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100", isUser: true },
    blue: shuffled[2]
  };
}

// ----------------------------------------------------------------------
// 3. COMPONENT IMPLEMENTATION
// ----------------------------------------------------------------------
export default function LudoSuperstar({ balance = 223890000 }: { balance?: number }) {
  const [screen, setScreen] = useState<"lobby" | "game">("game");
  const [betAmount, setBetAmount] = useState<number>(10000000);
  const [players, setPlayers] = useState<Record<Color, PlayerProfile>>(() => generateOpponents());
  
  // Game state
  const [currentTurn, setCurrentTurn] = useState<Color>("red");
  const [diceVal, setDiceVal] = useState<number>(6);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [turnTimer, setTurnTimer] = useState<number>(30);

  // Pawns state (4 per color, start in yard = -1)
  const [pawns, setPawns] = useState<Pawn[]>([
    { id: 0, color: "green", step: -1 }, { id: 1, color: "green", step: -1 }, { id: 2, color: "green", step: -1 }, { id: 3, color: "green", step: -1 },
    { id: 4, color: "yellow", step: -1 }, { id: 5, color: "yellow", step: -1 }, { id: 6, color: "yellow", step: -1 }, { id: 7, color: "yellow", step: -1 },
    { id: 8, color: "red", step: -1 }, { id: 9, color: "red", step: -1 }, { id: 10, color: "red", step: -1 }, { id: 11, color: "red", step: -1 },
    { id: 12, color: "blue", step: -1 }, { id: 13, color: "blue", step: -1 }, { id: 14, color: "blue", step: -1 }, { id: 15, color: "blue", step: -1 }
  ]);

  // Automated 30s Turn Timer
  useEffect(() => {
    if (screen !== "game") return;
    const interval = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          handleAutoPlay();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, currentTurn, diceVal]);

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    setTurnTimer(30);

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceVal(roll);
      setIsRolling(false);
      
      // Auto move if stuck in yard without a 6
      const colorPawns = pawns.filter((p) => p.color === currentTurn);
      const allInYard = colorPawns.every((p) => p.step === -1);
      
      if (allInYard && roll !== 6) {
        // Pass turn if no 6 rolled to exit yard
        setTimeout(() => nextTurn(), 800);
      }
    }, 400);
  };

  const handleAutoPlay = () => {
    handleRollDice();
  };

  const movePawn = (pawnId: number) => {
    const pawn = pawns.find((p) => p.id === pawnId);
    if (!pawn || pawn.color !== currentTurn || isRolling) return;

    // Must roll 6 to exit Yard onto 2nd tile (Home Gate)
    if (pawn.step === -1) {
      if (diceVal === 6) {
        setPawns((prev) => prev.map((p) => (p.id === pawnId ? { ...p, step: 0 } : p)));
        setTurnTimer(30);
      }
      return;
    }

    // Advance pawn by dice value
    if (pawn.step + diceVal <= 56) {
      setPawns((prev) => prev.map((p) => (p.id === pawnId ? { ...p, step: p.step + diceVal } : p)));
      if (diceVal !== 6) nextTurn();
      else setTurnTimer(30);
    }
  };

  const nextTurn = () => {
    const order: Color[] = ["red", "green", "yellow", "blue"];
    const nextIndex = (order.indexOf(currentTurn) + 1) % 4;
    setCurrentTurn(order[nextIndex]);
    setTurnTimer(30);
  };

  const startNewMatch = () => {
    setPlayers(generateOpponents());
    setPawns(pawns.map((p) => ({ ...p, step: -1 })));
    setScreen("game");
  };

  // Helper to convert Pawn step into Grid Coordinates [r, c]
  const getPawnCoords = (pawn: Pawn): [number, number] | null => {
    if (pawn.step === -1) return null; // In yard
    if (pawn.step < 51) {
      const globalIdx = (START_TILES[pawn.color] + pawn.step) % 52;
      return MAIN_PATH[globalIdx];
    }
    const homeIdx = pawn.step - 51;
    return HOME_STRETCHES[pawn.color][homeIdx] || [7, 7];
  };

  // ----------------------------------------------------------------------
  // LOBBY STAKING & MODE SELECTION SCREEN
  // ----------------------------------------------------------------------
  if (screen === "lobby") {
    return (
      <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between bg-[#130D32] p-4 text-white">
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setScreen("game")} className="p-2 rounded-xl bg-indigo-950 border border-indigo-500/40">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-base font-black">Live Match Lobby</span>
          <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400 px-3 py-1 rounded-full text-xs font-black text-amber-300">
            🪙 {(balance / 1000000).toFixed(1)}M
          </div>
        </div>

        <div className="flex flex-col items-center my-4">
          <span className="text-xs text-indigo-300 font-bold">TOTAL WIN POOL</span>
          <div className="flex items-center gap-2 text-3xl font-black text-cyan-300">
            <Trophy className="h-7 w-7 text-amber-400" />
            <span>{(betAmount * 2).toLocaleString()} Coins</span>
          </div>
        </div>

        <div className="rounded-3xl border border-indigo-500/40 bg-indigo-950/60 p-4 space-y-4">
          <div className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-indigo-500/30">
            <span className="text-xs font-bold text-indigo-200">Stake Bet:</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setBetAmount(Math.max(1000000, betAmount - 1000000))} className="p-1 rounded-lg bg-indigo-900 border border-indigo-400">
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-base font-black text-amber-300">{(betAmount / 1000000).toFixed(1)}M</span>
              <button onClick={() => setBetAmount(betAmount + 1000000)} className="p-1 rounded-lg bg-indigo-900 border border-indigo-400">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <button onClick={startNewMatch} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-black font-black text-sm shadow-lg active:scale-95 transition">
          START MATCH
        </button>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // ACTIVE GAME BOARD (CORRECT 9TH TILE STARS & NON-OVERLAPPING PROFILES)
  // ----------------------------------------------------------------------
  return (
    <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between bg-[#080518] p-2 text-white select-none">
      
      {/* Top Header & Players */}
      <div className="flex items-center justify-between px-2 pt-1">
        {/* Green Player */}
        <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${currentTurn === "green" ? "border-emerald-400 bg-emerald-950/60 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "border-slate-800"}`}>
          <img src={players.green.avatarUrl} className="h-9 w-9 rounded-lg object-cover" />
          <div>
            <div className="text-[10px] font-black">{players.green.name} {players.green.countryFlag}</div>
            <div className="text-[8px] text-emerald-400 font-bold">Green</div>
          </div>
        </div>

        {/* Balance & Timer */}
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen("lobby")} className="text-[9px] bg-indigo-950 border border-indigo-500/40 px-2 py-1 rounded-lg text-indigo-200">
            Lobby 🔄
          </button>
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-black border border-amber-400 text-[10px] font-black text-amber-300">
            {turnTimer}s
          </div>
        </div>

        {/* Yellow Player */}
        <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${currentTurn === "yellow" ? "border-amber-400 bg-amber-950/60 shadow-[0_0_10px_rgba(251,191,36,0.5)]" : "border-slate-800"}`}>
          <div>
            <div className="text-[10px] font-black text-right">{players.yellow.name} {players.yellow.countryFlag}</div>
            <div className="text-[8px] text-amber-400 font-bold text-right">Yellow</div>
          </div>
          <img src={players.yellow.avatarUrl} className="h-9 w-9 rounded-lg object-cover" />
        </div>
      </div>

      {/* MAIN 15x15 BOARD GRID */}
      <div className="relative flex flex-1 items-center justify-center w-full my-auto overflow-hidden">
        <div className="aspect-square w-full max-w-[88vw] max-h-[46vh] rounded-2xl border border-indigo-500/30 bg-[#120B2E] p-1 shadow-2xl">
          <div className="grid h-full w-full gap-0.5 rounded-xl overflow-hidden bg-indigo-950/40" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))", gridTemplateRows: "repeat(15, minmax(0, 1fr))" }}>
            
            {/* Render 15x15 Grid Cells */}
            {Array.from({ length: 225 }).map((_, i) => {
              const r = Math.floor(i / 15);
              const c = i % 15;

              // Yards
              const isGreenYard = r < 6 && c < 6;
              const isYellowYard = r < 6 && c > 8;
              const isRedYard = r > 8 && c < 6;
              const isBlueYard = r > 8 && c > 8;
              const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

              // Find path tile index if cell lies on main path
              const mainIdx = MAIN_PATH.findIndex(([pr, pc]) => pr === r && pc === c);
              const isStartGate = mainIdx !== -1 && Object.values(START_TILES).includes(mainIdx);
              const isSafeStarTile = mainIdx !== -1 && SAFE_STAR_TILES.has(mainIdx);

              // Home stretch colors
              const isGreenHome = r === 7 && c >= 1 && c <= 6;
              const isYellowHome = c === 7 && r >= 1 && r <= 6;
              const isBlueHome = r === 7 && c >= 8 && c <= 13;
              const isRedHome = c === 7 && r >= 8 && r <= 13;

              // Pawns on this cell
              const activePawnsHere = pawns.filter((p) => {
                const coords = getPawnCoords(p);
                return coords && coords[0] === r && coords[1] === c;
              });

              return (
                <div
                  key={i}
                  className={`relative flex items-center justify-center text-[7px] ${
                    isGreenYard ? "bg-emerald-950/90 border border-emerald-500/40" :
                    isYellowYard ? "bg-amber-950/90 border border-amber-500/40" :
                    isRedYard ? "bg-red-950/90 border border-red-500/40" :
                    isBlueYard ? "bg-sky-950/90 border border-sky-500/40" :
                    isCenter ? "bg-gradient-to-br from-indigo-900 to-black" :
                    isGreenHome ? "bg-emerald-500/80 border border-emerald-300/40" :
                    isYellowHome ? "bg-amber-500/80 border border-amber-300/40" :
                    isBlueHome ? "bg-sky-500/80 border border-sky-300/40" :
                    isRedHome ? "bg-red-500/80 border border-red-300/40" :
                    "bg-indigo-950/60 border border-indigo-500/20"
                  }`}
                >
                  {/* Standard Safe Stars & Gates */}
                  {isStartGate && <span className="text-[9px]">🛡️</span>}
                  {isSafeStarTile && !isStartGate && <span className="text-[10px] text-amber-300 font-bold drop-shadow">⭐</span>}

                  {/* Render Pawns inside Yards */}
                  {isGreenYard && r === 2 && c === 2 && (
                    <div className="grid grid-cols-2 gap-1 p-1">
                      {pawns.filter(p => p.color === "green" && p.step === -1).map(p => (
                        <button key={p.id} onClick={() => movePawn(p.id)} className="h-3.5 w-3.5 rounded-full bg-emerald-400 border border-white shadow-md active:scale-95" />
                      ))}
                    </div>
                  )}
                  {isRedYard && r === 11 && c === 2 && (
                    <div className="grid grid-cols-2 gap-1 p-1">
                      {pawns.filter(p => p.color === "red" && p.step === -1).map(p => (
                        <button key={p.id} onClick={() => movePawn(p.id)} className="h-3.5 w-3.5 rounded-full bg-red-500 border border-white shadow-md active:scale-95" />
                      ))}
                    </div>
                  )}

                  {/* Render Active Pawns on Track */}
                  {activePawnsHere.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => movePawn(p.id)}
                      className={`absolute h-4 w-4 rounded-full border-2 border-white shadow-lg z-10 transition-all ${
                        p.color === "green" ? "bg-emerald-400" :
                        p.color === "yellow" ? "bg-amber-400" :
                        p.color === "red" ? "bg-red-500" : "bg-sky-400"
                      }`}
                    />
                  ))}
                </div>
              );
            })}

          </div>
        </div>
      </div>

      {/* FOOTER: USER (busybrain - Bottom Left) & BLUE PLAYER (Bottom Right - NO OVERLAP) */}
      <div className="flex items-end justify-between px-2 pb-1">
        
        {/* User profile & Real 3D Dice */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${currentTurn === "red" ? "border-red-400 bg-red-950/60 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-slate-800"}`}>
            <img src={players.red.avatarUrl} className="h-9 w-9 rounded-lg object-cover" />
            <div>
              <div className="text-[10px] font-black text-amber-300">busybrain (YOU)</div>
              <div className="text-[8px] text-red-400 font-bold">Red</div>
            </div>
          </div>

          {/* REAL 3D DICE BUTTON */}
          <button
            onClick={handleRollDice}
            disabled={isRolling || currentTurn !== "red"}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-white to-slate-300 border-2 border-slate-400 flex items-center justify-center shadow-lg active:scale-90 transition"
          >
            <span className={`text-xl font-black text-slate-900 ${isRolling ? "animate-spin" : ""}`}>
              {diceVal}
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button className="h-7 px-2 rounded-lg bg-indigo-950 border border-indigo-500/30 text-[9px] font-bold text-indigo-200">
            <RefreshCw className="h-3 w-3 inline mr-0.5" /> 25
          </button>
          <button className="h-7 px-2 rounded-lg bg-indigo-950 border border-indigo-500/30 text-[9px] font-bold text-indigo-200">
            <Smile className="h-3 w-3 inline mr-0.5" /> Emoji
          </button>
        </div>

        {/* Blue Player */}
        <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${currentTurn === "blue" ? "border-sky-400 bg-sky-950/60 shadow-[0_0_10px_rgba(56,189,248,0.5)]" : "border-slate-800"}`}>
          <div>
            <div className="text-[10px] font-black text-right">{players.blue.name} {players.blue.countryFlag}</div>
            <div className="text-[8px] text-sky-400 font-bold text-right">Blue</div>
          </div>
          <img src={players.blue.avatarUrl} className="h-9 w-9 rounded-lg object-cover" />
        </div>

      </div>
    </div>
  );
}