"use client";
import React, { useState } from "react";
import { Sparkles, Zap, Gift, RefreshCw, MessageSquare, Smile } from "lucide-react";

// Types
export type Color = "green" | "yellow" | "red" | "blue";

export interface Player {
  id: string;
  name: string;
  countryFlag: string;
  avatarUrl: string;
  color: Color;
  isCurrentTurn: boolean;
  score: number;
}

interface LudoBoardProps {
  players: Record<Color, Player>;
  currentTurn: Color;
  diceValue: number;
  isRolling: boolean;
  onRollDice: () => void;
  pawnPositions?: Record<string, { x: number; y: number }>;
}

// 15x15 Coordinate Mapping for Safe Houses (Star Icons)
const SAFE_CELLS = new Set([
  "1,6",  // Green Start / Safe
  "2,8",  // Yellow Safe
  "8,1",  // Red Safe
  "6,13", // Blue Safe
  "6,2",  // Top-Left Safe Star
  "12,6", // Bottom-Left Safe Star
  "8,12", // Bottom-Right Safe Star
  "2,8",  // Top-Right Safe Star
]);

export function LudoBoardUI({
  players,
  currentTurn,
  diceValue,
  isRolling,
  onRollDice,
}: LudoBoardProps) {
  const [activeDice, setActiveDice] = useState<number>(diceValue || 6);

  const handleDiceClick = () => {
    if (isRolling) return;
    onRollDice();
  };

  return (
    <div className="flex h-screen w-full max-w-md flex-col justify-between overflow-hidden bg-[#0A071B] p-2 text-white select-none">
      {/* Top Header: Player Avatars (Green & Yellow) */}
      <div className="flex items-center justify-between px-2 pt-1">
        {/* Top-Left: Green Player */}
        <div className="flex items-center gap-2">
          <div className="relative h-14 w-14 rounded-2xl border-2 border-emerald-400 p-0.5 shadow-[0_0_15px_rgba(52,211,153,0.5)]">
            <img
              src={players.green.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
              alt="Green Player"
              className="h-full w-full rounded-xl object-cover"
            />
            <div className="absolute -bottom-2 -left-1 flex items-center gap-1 rounded-full border border-emerald-400 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold">
              <span>{players.green.countryFlag}</span>
              <span className="max-w-[50px] truncate">{players.green.name}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-900/60 border border-purple-500/30 text-purple-300">
              <Zap className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-900/60 border border-purple-500/30 text-purple-300">
              <Gift className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Top-Right: Yellow Player */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1 items-end">
            <button className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-900/60 border border-purple-500/30 text-purple-300">
              <Gift className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-900/60 border border-purple-500/30 text-purple-300">
              <Zap className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative h-14 w-14 rounded-2xl border-2 border-amber-400 p-0.5 shadow-[0_0_15px_rgba(251,191,36,0.5)]">
            <img
              src={players.yellow.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
              alt="Yellow Player"
              className="h-full w-full rounded-xl object-cover"
            />
            <div className="absolute -bottom-2 -right-1 flex items-center gap-1 rounded-full border border-amber-400 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold">
              <span>{players.yellow.countryFlag}</span>
              <span className="max-w-[50px] truncate">{players.yellow.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 15x15 Ludo Board Grid Container */}
      <div className="relative aspect-square w-full rounded-3xl border border-indigo-500/30 bg-[#120B2E] p-2 shadow-[0_0_40px_rgba(30,27,75,0.8)]">
        <div className="grid h-full w-full grid-cols-15 grid-rows-15 gap-0.5 rounded-2xl overflow-hidden bg-indigo-950/40">
          
          {/* GREEN YARD (Top-Left 6x6) */}
          <div className="col-span-6 row-span-6 rounded-tl-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-950/90 to-emerald-900/40 p-3 flex items-center justify-center shadow-[inset_0_0_20px_rgba(16,185,129,0.3)]">
            <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-3 rounded-2xl border border-emerald-400/40 bg-black/40 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/50 shadow-inner">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-600 shadow-lg border border-emerald-200" />
                </div>
              ))}
            </div>
          </div>

          {/* TOP TRACK (Yellow Entry & Pathway - 3x6) */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-black/30 p-0.5">
            {Array.from({ length: 18 }).map((_, idx) => {
              const row = Math.floor(idx / 3);
              const col = idx % 3;
              const isHomePath = col === 1 && row > 0;
              const isSafe = SAFE_CELLS.has(`${row},${col + 6}`);
              const isArrow = row === 0 && col === 1;

              return (
                <div
                  key={idx}
                  className={`relative flex items-center justify-center rounded-sm text-[10px] ${
                    isHomePath
                      ? "bg-amber-500/80 border border-amber-300/40"
                      : "bg-indigo-950/60 border border-indigo-500/20"
                  }`}
                >
                  {isSafe && <span className="text-amber-300 text-xs font-bold drop-shadow">🟌</span>}
                  {isArrow && <span className="text-amber-400 font-extrabold text-xs">↓</span>}
                </div>
              );
            })}
          </div>

          {/* YELLOW YARD (Top-Right 6x6) */}
          <div className="col-span-6 row-span-6 rounded-tr-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-950/90 to-amber-900/40 p-3 flex items-center justify-center shadow-[inset_0_0_20px_rgba(245,158,11,0.3)]">
            <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-3 rounded-2xl border border-amber-400/40 bg-black/40 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/50 shadow-inner">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 shadow-lg border border-amber-200" />
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
              const isSafe = SAFE_CELLS.has(`${row + 6},${col}`);
              const isArrow = row === 1 && col === 0;

              return (
                <div
                  key={idx}
                  className={`relative flex items-center justify-center rounded-sm text-[10px] ${
                    isHomePath
                      ? "bg-emerald-500/80 border border-emerald-300/40"
                      : "bg-indigo-950/60 border border-indigo-500/20"
                  }`}
                >
                  {isSafe && <span className="text-emerald-300 text-xs font-bold drop-shadow">🟌</span>}
                  {isArrow && <span className="text-emerald-400 font-extrabold text-xs">→</span>}
                </div>
              );
            })}
          </div>

          {/* CENTER HOME TRIANGLES (3x3) */}
          <div className="col-span-3 row-span-3 relative overflow-hidden rounded-xl border border-indigo-400/50 bg-[#0E0826]">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div className="bg-emerald-500/60 clip-polygon-[0_0,100%_0,50%_100%]" />
              <div className="bg-amber-500/60 clip-polygon-[100%_0,100%_100%,0_50%]" />
              <div className="bg-red-500/60 clip-polygon-[0_0,0_100%,100%_50%]" />
              <div className="bg-blue-500/60 clip-polygon-[0_100%,100%_100%,50%_0]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)] animate-pulse" />
            </div>
          </div>

          {/* RIGHT TRACK (Blue Pathway - 6x3) */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-black/30 p-0.5">
            {Array.from({ length: 18 }).map((_, idx) => {
              const row = Math.floor(idx / 6);
              const col = idx % 6;
              const isHomePath = row === 1 && col < 5;
              const isSafe = SAFE_CELLS.has(`${row + 6},${col + 9}`);
              const isArrow = row === 1 && col === 5;

              return (
                <div
                  key={idx}
                  className={`relative flex items-center justify-center rounded-sm text-[10px] ${
                    isHomePath
                      ? "bg-sky-500/80 border border-sky-300/40"
                      : "bg-indigo-950/60 border border-indigo-500/20"
                  }`}
                >
                  {isSafe && <span className="text-sky-300 text-xs font-bold drop-shadow">🟌</span>}
                  {isArrow && <span className="text-sky-400 font-extrabold text-xs">←</span>}
                </div>
              );
            })}
          </div>

          {/* RED YARD (Bottom-Left 6x6) */}
          <div className="col-span-6 row-span-6 rounded-bl-2xl border-2 border-red-500 bg-gradient-to-br from-red-950/90 to-red-900/40 p-3 flex items-center justify-center shadow-[inset_0_0_20px_rgba(239,68,68,0.3)]">
            <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-3 rounded-2xl border border-red-400/40 bg-black/40 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/50 shadow-inner">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-b from-red-400 to-red-700 shadow-lg border border-red-200" />
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
              const isSafe = SAFE_CELLS.has(`${row + 9},${col + 6}`);
              const isArrow = row === 5 && col === 1;

              return (
                <div
                  key={idx}
                  className={`relative flex items-center justify-center rounded-sm text-[10px] ${
                    isHomePath
                      ? "bg-red-500/80 border border-red-300/40"
                      : "bg-indigo-950/60 border border-indigo-500/20"
                  }`}
                >
                  {isSafe && <span className="text-red-300 text-xs font-bold drop-shadow">🟌</span>}
                  {isArrow && <span className="text-red-400 font-extrabold text-xs">↑</span>}
                </div>
              );
            })}
          </div>

          {/* BLUE YARD (Bottom-Right 6x6) */}
          <div className="col-span-6 row-span-6 rounded-br-2xl border-2 border-sky-500 bg-gradient-to-br from-sky-950/90 to-sky-900/40 p-3 flex items-center justify-center shadow-[inset_0_0_20px_rgba(56,189,248,0.3)]">
            <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-3 rounded-2xl border border-sky-400/40 bg-black/40 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/50 shadow-inner">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-b from-sky-300 to-sky-600 shadow-lg border border-sky-200" />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Footer: Player Avatars & Integrated 5D Dice Controller */}
      <div className="flex items-end justify-between px-2 pb-1">
        
        {/* Bottom-Left: Red Player (Your Seat) */}
        <div className="flex items-center gap-2">
          <div className="relative h-14 w-14 rounded-2xl border-2 border-red-500 p-0.5 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <img
              src={players.red.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
              alt="Red Player"
              className="h-full w-full rounded-xl object-cover"
            />
            <div className="absolute -bottom-2 -left-1 flex items-center gap-1 rounded-full border border-red-400 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold">
              <span>{players.red.countryFlag}</span>
              <span className="max-w-[50px] truncate">{players.red.name}</span>
            </div>
          </div>

          {/* Integrated 5D Rich Dice Controller (Located exactly at the Red Seat Pointer) */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleDiceClick}
              disabled={isRolling}
              className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-red-400 bg-gradient-to-br from-red-500 via-rose-600 to-red-950 shadow-[0_0_20px_rgba(239,68,68,0.7)] transition-all duration-200 active:scale-90 ${
                isRolling ? "animate-spin" : "hover:scale-105"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm border border-white/20 text-2xl font-black text-white shadow-inner">
                {activeDice}
              </div>
              {/* Turn Arrow Highlight */}
              {currentTurn === "red" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black text-[10px] font-extrabold shadow-lg animate-bounce">
                  ▼
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Action Controls: Undo / Roll 2 / Emoji / Chat */}
        <div className="flex items-center gap-2">
          <button className="flex h-10 items-center gap-1.5 rounded-2xl border border-purple-400/30 bg-purple-950/60 px-3 text-xs font-black text-purple-200 shadow-md transition active:scale-95">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>25</span>
          </button>

          <button className="flex h-10 items-center gap-1 rounded-2xl border border-indigo-400/30 bg-indigo-950/60 px-3 text-xs font-black text-indigo-200 shadow-md transition active:scale-95">
            <Smile className="h-4 w-4" />
            <span>EMOJI</span>
          </button>

          <button className="flex h-10 items-center gap-1 rounded-2xl border border-indigo-400/30 bg-indigo-950/60 px-3 text-xs font-black text-indigo-200 shadow-md transition active:scale-95">
            <MessageSquare className="h-4 w-4" />
            <span>CHAT</span>
          </button>
        </div>

        {/* Bottom-Right: Blue Player */}
        <div className="flex items-center gap-2">
          <div className="relative h-14 w-14 rounded-2xl border-2 border-sky-400 p-0.5 shadow-[0_0_15px_rgba(56,189,248,0.5)]">
            <img
              src={players.blue.avatarUrl || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100"}
              alt="Blue Player"
              className="h-full w-full rounded-xl object-cover"
            />
            <div className="absolute -bottom-2 -right-1 flex items-center gap-1 rounded-full border border-sky-400 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold">
              <span>{players.blue.countryFlag}</span>
              <span className="max-w-[50px] truncate">{players.blue.name}</span>
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