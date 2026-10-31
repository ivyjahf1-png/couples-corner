"use client";
import React, { useState } from "react";
import { Sparkles, Zap, Gift, RefreshCw, MessageSquare, Smile } from "lucide-react";

export type Color = "green" | "yellow" | "red" | "blue";

export interface Player {
  id: string;
  name: string;
  countryFlag: string;
  avatarUrl: string;
  color: Color;
  score: number;
}

interface LudoSuperstarProps {
  balance?: number;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}

// 8 Official Ludo Safe Cells (Stars / Shields) preventing instant captures
const SAFE_CELL_KEYS = new Set([
  "1,6",  // Green Start
  "2,8",  // Yellow Safe
  "8,1",  // Red Safe
  "6,13", // Blue Safe
  "6,2",  // Top-Left Safe Star
  "12,6", // Bottom-Left Safe Star
  "8,12", // Bottom-Right Safe Star
  "2,8",  // Top-Right Safe Star
]);

// 5D Industry-Standard 3D Pip Dice Component
function Dice3DFace({ value, isRolling }: { value: number; isRolling: boolean }) {
  const renderPips = (val: number) => {
    const pipsMap: Record<number, string[]> = {
      1: ["col-start-2 row-start-2"],
      2: ["col-start-1 row-start-1", "col-start-3 row-start-3"],
      3: ["col-start-1 row-start-1", "col-start-2 row-start-2", "col-start-3 row-start-3"],
      4: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-1 row-start-3", "col-start-3 row-start-3"],
      5: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-2 row-start-2", "col-start-1 row-start-3", "col-start-3 row-start-3"],
      6: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-1 row-start-2", "col-start-3 row-start-2", "col-start-1 row-start-3", "col-start-3 row-start-3"],
    };

    return (pipsMap[val] || pipsMap[6]).map((posClass, i) => (
      <span
        key={i}
        className={`${posClass} h-2 w-2 rounded-full bg-gradient-to-br from-gray-900 to-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.6)]`}
      />
    ));
  };

  return (
    <div className={`relative h-12 w-12 rounded-xl bg-gradient-to-br from-white via-slate-100 to-slate-300 p-2 shadow-[0_5px_0_#64748b,0_8px_12px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,1)] transition-transform duration-300 ${
      isRolling ? "animate-[spin_0.3s_linear_infinite] scale-110" : ""
    }`}>
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 items-center justify-items-center">
        {renderPips(value)}
      </div>
    </div>
  );
}

export default function LudoSuperstar({ balance = 10000000, onWin, onLose }: LudoSuperstarProps) {
  const [currentTurn, setCurrentTurn] = useState<Color>("red");
  const [diceValue, setDiceValue] = useState<number>(6);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  // Default Players Setup
  const players: Record<Color, Player> = {
    green: {
      id: "1",
      name: "DavidMat...",
      countryFlag: "🇮🇩",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
      color: "green",
      score: 0,
    },
    yellow: {
      id: "2",
      name: "Saurabh",
      countryFlag: "🇮🇳",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      color: "yellow",
      score: 0,
    },
    red: {
      id: "3",
      name: "busybrai...",
      countryFlag: "🇳🇬",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      color: "red",
      score: 0,
    },
    blue: {
      id: "4",
      name: "Rivya",
      countryFlag: "🇸🇦",
      avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100",
      color: "blue",
      score: 0,
    },
  };

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);
      // Example win/loss hook integration trigger if needed
      if (rolled === 6 && Math.random() > 0.8) {
        onWin(50000);
      }
    }, 500);
  };

  return (
    <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between overflow-hidden bg-[#0A071B] p-2 text-white select-none">
      
      {/* TOP HEADER: COIN STAKE DISPLAY & PLAYERS */}
      <div className="flex items-center justify-between px-2 pt-1">
        {/* Top-Left: Green Player */}
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-12 rounded-2xl border-2 border-emerald-400 p-0.5 shadow-[0_0_15px_rgba(52,211,153,0.5)]">
            <img
              src={players.green.avatarUrl}
              alt={players.green.name}
              className="h-full w-full rounded-xl object-cover"
            />
            <div className="absolute -bottom-2 -left-1 flex items-center gap-1 rounded-full border border-emerald-400 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold">
              <span>{players.green.countryFlag}</span>
              <span className="max-w-[45px] truncate">{players.green.name}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" className="flex h-5 w-5 items-center justify-center rounded-lg bg-purple-900/60 border border-purple-500/30 text-purple-300">
              <Zap className="h-2.5 w-2.5" />
            </button>
            <button type="button" className="flex h-5 w-5 items-center justify-center rounded-lg bg-purple-900/60 border border-purple-500/30 text-purple-300">
              <Gift className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>

        {/* Center Staked Coin Banner */}
        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-400/30 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.2)]">
          <span className="text-amber-400 text-xs">🪙</span>
          <span className="text-xs font-black tracking-wide text-amber-200">
            {balance >= 1000000 ? `$${(balance / 1000000).toFixed(1)}M` : `$${balance.toLocaleString()}`}
          </span>
        </div>

        {/* Top-Right: Yellow Player */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1 items-end">
            <button type="button" className="flex h-5 w-5 items-center justify-center rounded-lg bg-purple-900/60 border border-purple-500/30 text-purple-300">
              <Gift className="h-2.5 w-2.5" />
            </button>
            <button type="button" className="flex h-5 w-5 items-center justify-center rounded-lg bg-purple-900/60 border border-purple-500/30 text-purple-300">
              <Zap className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="relative h-12 w-12 rounded-2xl border-2 border-amber-400 p-0.5 shadow-[0_0_15px_rgba(251,191,36,0.5)]">
            <img
              src={players.yellow.avatarUrl}
              alt={players.yellow.name}
              className="h-full w-full rounded-xl object-cover"
            />
            <div className="absolute -bottom-2 -right-1 flex items-center gap-1 rounded-full border border-amber-400 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold">
              <span>{players.yellow.countryFlag}</span>
              <span className="max-w-[45px] truncate">{players.yellow.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN NON-SCROLLING 15x15 LUDO BOARD CONTAINER */}
      <div className="relative flex flex-1 items-center justify-center w-full my-auto overflow-hidden">
        <div className="aspect-square w-full max-w-[90vw] max-h-[50vh] rounded-3xl border border-indigo-500/30 bg-[#120B2E] p-1.5 shadow-[0_0_35px_rgba(30,27,75,0.8)]">
          <div 
            className="grid h-full w-full gap-0.5 rounded-2xl overflow-hidden bg-indigo-950/40"
            style={{
              gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
              gridTemplateRows: "repeat(15, minmax(0, 1fr))"
            }}
          >
            
            {/* GREEN YARD (6x6) */}
            <div className="col-span-6 row-span-6 rounded-tl-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-950/90 to-emerald-900/40 p-2.5 flex items-center justify-center shadow-[inset_0_0_15px_rgba(16,185,129,0.3)]">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2.5 rounded-xl border border-emerald-400/40 bg-black/40 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/50 shadow-inner">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-600 shadow-lg border border-emerald-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* TOP TRACK (Yellow Pathway - 3x6) */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const isHomePath = col === 1 && row > 0;
                const isSafe = SAFE_CELL_KEYS.has(`${row},${col + 6}`);
                const isArrow = row === 0 && col === 1;

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[9px] ${
                      isHomePath
                        ? "bg-amber-500/80 border border-amber-300/40"
                        : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isSafe && <span className="text-amber-300 text-[10px] font-bold drop-shadow">🟌</span>}
                    {isArrow && <span className="text-amber-400 font-extrabold text-[10px]">↓</span>}
                  </div>
                );
              })}
            </div>

            {/* YELLOW YARD (6x6) */}
            <div className="col-span-6 row-span-6 rounded-tr-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-950/90 to-amber-900/40 p-2.5 flex items-center justify-center shadow-[inset_0_0_15px_rgba(245,158,11,0.3)]">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2.5 rounded-xl border border-amber-400/40 bg-black/40 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/50 shadow-inner">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 shadow-lg border border-amber-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* LEFT TRACK (Green Pathway - 6x3) */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 6);
                const col = idx % 6;
                const isHomePath = row === 1 && col > 0;
                const isSafe = SAFE_CELL_KEYS.has(`${row + 6},${col}`);
                const isArrow = row === 1 && col === 0;

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[9px] ${
                      isHomePath
                        ? "bg-emerald-500/80 border border-emerald-300/40"
                        : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isSafe && <span className="text-emerald-300 text-[10px] font-bold drop-shadow">🟌</span>}
                    {isArrow && <span className="text-emerald-400 font-extrabold text-[10px]">→</span>}
                  </div>
                );
              })}
            </div>

            {/* CENTER HOME TRIANGLES (3x3) */}
            <div className="col-span-3 row-span-3 relative overflow-hidden rounded-lg border border-indigo-400/50 bg-[#0E0826]">
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div className="bg-emerald-500/60" />
                <div className="bg-amber-500/60" />
                <div className="bg-red-500/60" />
                <div className="bg-blue-500/60" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <Sparkles className="h-5 w-5 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.8)] animate-pulse" />
              </div>
            </div>

            {/* RIGHT TRACK (Blue Pathway - 6x3) */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 6);
                const col = idx % 6;
                const isHomePath = row === 1 && col < 5;
                const isSafe = SAFE_CELL_KEYS.has(`${row + 6},${col + 9}`);
                const isArrow = row === 1 && col === 5;

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[9px] ${
                      isHomePath
                        ? "bg-sky-500/80 border border-sky-300/40"
                        : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isSafe && <span className="text-sky-300 text-[10px] font-bold drop-shadow">🟌</span>}
                    {isArrow && <span className="text-sky-400 font-extrabold text-[10px]">←</span>}
                  </div>
                );
              })}
            </div>

            {/* RED YARD (6x6) */}
            <div className="col-span-6 row-span-6 rounded-bl-2xl border-2 border-red-500 bg-gradient-to-br from-red-950/90 to-red-900/40 p-2.5 flex items-center justify-center shadow-[inset_0_0_15px_rgba(239,68,68,0.3)]">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2.5 rounded-xl border border-red-400/40 bg-black/40 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/50 shadow-inner">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-b from-red-400 to-red-700 shadow-lg border border-red-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM TRACK (Red Pathway - 3x6) */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const isHomePath = col === 1 && row < 5;
                const isSafe = SAFE_CELL_KEYS.has(`${row + 9},${col + 6}`);
                const isArrow = row === 5 && col === 1;

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[9px] ${
                      isHomePath
                        ? "bg-red-500/80 border border-red-300/40"
                        : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isSafe && <span className="text-red-300 text-[10px] font-bold drop-shadow">🟌</span>}
                    {isArrow && <span className="text-red-400 font-extrabold text-[10px]">↑</span>}
                  </div>
                );
              })}
            </div>

            {/* BLUE YARD (6x6) */}
            <div className="col-span-6 row-span-6 rounded-br-2xl border-2 border-sky-500 bg-gradient-to-br from-sky-950/90 to-sky-900/40 p-2.5 flex items-center justify-center shadow-[inset_0_0_15px_rgba(56,189,248,0.3)]">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2.5 rounded-xl border border-sky-400/40 bg-black/40 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/50 shadow-inner">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-b from-sky-300 to-sky-600 shadow-lg border border-sky-200" />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* FOOTER: RED & BLUE PLAYERS + INTEGRATED 5D 3D PIP DICE */}
      <div className="flex items-end justify-between px-2 pb-1">
        
        {/* Red Player Seat & 5D Dice Controller at target pointer location */}
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-12 rounded-2xl border-2 border-red-500 p-0.5 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <img
              src={players.red.avatarUrl}
              alt={players.red.name}
              className="h-full w-full rounded-xl object-cover"
            />
            <div className="absolute -bottom-2 -left-1 flex items-center gap-1 rounded-full border border-red-400 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold">
              <span>{players.red.countryFlag}</span>
              <span className="max-w-[45px] truncate">{players.red.name}</span>
            </div>
          </div>

          {/* 5D 3D Pip Dice Controller */}
          <button
            type="button"
            onClick={handleRollDice}
            disabled={isRolling}
            className="relative flex items-center justify-center p-0.5 transition-transform active:scale-90 hover:scale-105"
          >
            <Dice3DFace value={diceValue} isRolling={isRolling} />
            
            {currentTurn === "red" && !isRolling && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-black text-[9px] font-extrabold shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-bounce">
                ▼
              </span>
            )}
          </button>
        </div>

        {/* Action Controls: Undo / Emoji / Chat */}
        <div className="flex items-center gap-1">
          <button type="button" className="flex h-8 items-center gap-1 rounded-xl border border-purple-400/30 bg-purple-950/60 px-2 text-[10px] font-black text-purple-200 shadow-md transition active:scale-95">
            <RefreshCw className="h-2.5 w-2.5" />
            <span>25</span>
          </button>

          <button type="button" className="flex h-8 items-center gap-1 rounded-xl border border-indigo-400/30 bg-indigo-950/60 px-2 text-[10px] font-black text-indigo-200 shadow-md transition active:scale-95">
            <Smile className="h-3 w-3" />
            <span>EMOJI</span>
          </button>

          <button type="button" className="flex h-8 items-center gap-1 rounded-xl border border-indigo-400/30 bg-indigo-950/60 px-2 text-[10px] font-black text-indigo-200 shadow-md transition active:scale-95">
            <MessageSquare className="h-3 w-3" />
            <span>CHAT</span>
          </button>
        </div>
        {/* Blue Player Seat */}
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-12 rounded-2xl border-2 border-sky-400 p-0.5 shadow-[0_0_15px_rgba(56,189,248,0.5)]">
            <img
              src={players.blue.avatarUrl}
              alt={players.blue.name}
              className="h-full w-full rounded-xl object-cover"
            />
            <div className="absolute -bottom-2 -right-1 flex items-center gap-1 rounded-full border border-sky-400 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold">
              <span>{players.blue.countryFlag}</span>
              <span className="max-w-[45px] truncate">{players.blue.name}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Default export wrapper for use as a standalone game engine in LocalGameRunner
export default function LudoSuperstar() {
  const [players, setPlayers] = useState<Record<Color, Player>>({
    green: {
      id: "green",
      name: "Green",
      countryFlag: "🇮🇳",
      avatarUrl: "",
      color: "green",
      isCurrentTurn: true,
      score: 0,
    },
    yellow: {
      id: "yellow",
      name: "Yellow",
      countryFlag: "🇺🇸",
      avatarUrl: "",
      color: "yellow",
      isCurrentTurn: false,
      score: 0,
    },
    red: {
      id: "red",
      name: "Red",
      countryFlag: "🇳🇬",
      avatarUrl: "",
      color: "red",
      isCurrentTurn: false,
      score: 0,
    },
    blue: {
      id: "blue",
      name: "Blue",
      countryFlag: "🇸🇦",
      avatarUrl: "",
      color: "blue",
      isCurrentTurn: false,
      score: 0,
    },
  });
  const [currentTurn, setCurrentTurn] = useState<Color>("green");
  const [diceValue, setDiceValue] = useState<number>(6);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      setIsRolling(false);
      setCurrentTurn((t) =>
        t === "green" ? "yellow" : t === "yellow" ? "blue" : t === "blue" ? "red" : "green"
      );
    }, 800);
  };

  return (
    <LudoBoardUI
      players={players}
      currentTurn={currentTurn}
      diceValue={diceValue}
      isRolling={isRolling}
      onRollDice={handleRollDice}
    />
  );
}