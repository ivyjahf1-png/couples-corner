"use client";
import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Gift,
  RefreshCw,
  MessageSquare,
  Smile,
  Minus,
  Plus,
  Trophy,
  ArrowLeft,
} from "lucide-react";

export type Color = "green" | "yellow" | "red" | "blue";
type LudoMode = "CLASSIC" | "AERO" | "TALLY" | "SLAY";

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
  onWin?: (n: number) => void;
  onLose?: (n: number) => void;
}

// 5D 3D Pip Dice Component
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
      <span key={i} className={`${posClass} h-2 w-2 rounded-full bg-gradient-to-br from-gray-900 to-black shadow-md`} />
    ));
  };

  return (
    <div
      className={`relative h-11 w-11 rounded-xl bg-gradient-to-br from-white via-slate-100 to-slate-300 p-1.5 shadow-[0_4px_0_#64748b,0_6px_10px_rgba(0,0,0,0.5)] transition-transform duration-300 ${
        isRolling ? "animate-[spin_0.3s_linear_infinite] scale-110" : ""
      }`}
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 items-center justify-items-center">
        {renderPips(value)}
      </div>
    </div>
  );
}

export default function LudoSuperstar({ balance = 223890000 }: LudoSuperstarProps) {
  // Screen state: "lobby" for staking/modes, "game" for active board
  const [screen, setScreen] = useState<"lobby" | "game">("lobby");

  // Lobby Configuration States
  const [selectedMode, setSelectedMode] = useState<LudoMode>("CLASSIC");
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [betAmount, setBetAmount] = useState<number>(10000000); // 10M Coins default
  const [activePowerUps, setActivePowerUps] = useState<string[]>(["UNDO"]);

  // Game Engine States
  const [currentTurn, setCurrentTurn] = useState<Color>("red");
  const [diceValue, setDiceValue] = useState<number>(6);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  const players: Record<Color, Player> = {
    green: { id: "1", name: "DavidMat...", countryFlag: "🇮🇩", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", color: "green", score: 0 },
    yellow: { id: "2", name: "Saurabh", countryFlag: "🇮🇳", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", color: "yellow", score: 0 },
    red: { id: "3", name: "busybrai...", countryFlag: "🇳🇬", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100", color: "red", score: 0 },
    blue: { id: "4", name: "Olumide", countryFlag: "🇳🇬", avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100", color: "blue", score: 0 },
  };

  const handleAdjustBet = (increment: boolean) => {
    setBetAmount((prev) => {
      if (increment) return Math.min(prev + 1000000, 50000000);
      return Math.max(prev - 1000000, 11000); // Minimum 11k coins stake
    });
  };

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      setIsRolling(false);
    }, 400);
  };

  // --- RENDER 1: LIVE MATCH LUDO STAKING & MODE SELECTION LOBBY ---
  if (screen === "lobby") {
    return (
      <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between overflow-hidden bg-[#1E1B4B] p-4 text-white select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => window.history.back()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-950/60 border border-indigo-500/30">
            <ArrowLeft className="h-5 w-5 text-indigo-200" />
          </button>
          <span className="text-base font-black tracking-wide text-indigo-100">Live Match</span>
          <div className="flex items-center gap-1 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-full">
            <span className="text-amber-400 text-xs">🪙</span>
            <span className="text-xs font-black text-amber-200">{(balance / 1000000).toFixed(2)}M</span>
          </div>
        </div>

        {/* Win Pool Header Banner */}
        <div className="flex flex-col items-center my-2">
          <span className="text-[11px] font-bold text-indigo-300 tracking-wider">Win</span>
          <div className="flex items-center gap-2 text-2xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
            <Trophy className="h-6 w-6 text-amber-400" />
            <span>{(betAmount * 2).toLocaleString()} Coins</span>
          </div>
          <span className="text-[10px] text-indigo-300 mt-0.5 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/20">⚡ +15 XP Bonus</span>
        </div>

        {/* Mode Selector Tabs (Classic, Aero, Tally, Slay) */}
        <div className="grid grid-cols-4 gap-2 my-2">
          {(["CLASSIC", "AERO", "TALLY", "SLAY"] as LudoMode[]).map((mode) => {
            const isSelected = selectedMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? "border-amber-400 bg-gradient-to-b from-indigo-900 to-indigo-950 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105"
                    : "border-indigo-500/30 bg-indigo-950/40 opacity-70"
                }`}
              >
                <div className="text-xs font-black text-amber-300 mb-1">🎲</div>
                <span className="text-[10px] font-extrabold tracking-wider">{mode}</span>
                <span className="text-[8px] text-indigo-300 mt-0.5">{mode === "CLASSIC" ? "Standard" : "Ends 13h"}</span>
              </button>
            );
          })}
        </div>

        {/* Betting & Player Options Card */}
        <div className="flex flex-col gap-4 rounded-3xl border border-indigo-500/40 bg-[#312E81]/60 p-4 shadow-xl backdrop-blur-md">
          {/* Player Count Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-indigo-950/60 p-1 rounded-2xl border border-indigo-500/30">
            <button
              onClick={() => setPlayerCount(2)}
              className={`py-2 rounded-xl text-xs font-black transition ${
                playerCount === 2 ? "bg-amber-400 text-black shadow-md" : "text-indigo-300"
              }`}
            >
              2 Players
            </button>
            <button
              onClick={() => setPlayerCount(4)}
              className={`py-2 rounded-xl text-xs font-black transition ${
                playerCount === 4 ? "bg-indigo-600 text-white shadow-md" : "text-indigo-300"
              }`}
            >
              4 Players
            </button>
          </div>

          {/* Bet Adjuster (11K to 10M+ Coins) */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[10px] font-bold text-indigo-300">Bet Amount</span>
              <span className="text-[10px] font-bold text-amber-400">⭐ ⭐ ⭐ ⭐</span>
            </div>
            <div className="flex items-center justify-between w-full bg-indigo-950/80 border border-indigo-500/40 rounded-2xl px-3 py-2">
              <button onClick={() => handleAdjustBet(false)} className="h-8 w-8 flex items-center justify-center rounded-xl bg-indigo-900 border border-indigo-500/40 text-amber-300 active:scale-95">
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-white">
                  {betAmount >= 1000000 ? `${(betAmount / 1000000).toFixed(1)}M` : betAmount.toLocaleString()}
                </span>
                <span className="text-amber-400">🪙</span>
              </div>
              <button onClick={() => handleAdjustBet(true)} className="h-8 w-8 flex items-center justify-center rounded-xl bg-indigo-900 border border-indigo-500/40 text-amber-300 active:scale-95">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Power-Up Boosters */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "UNDO", label: "UNDO" },
              { id: "HILO", label: "HI-LO" },
              { id: "ROLL2", label: "ROLL 2" },
            ].map((power) => (
              <button
                key={power.id}
                onClick={() => {
                  setActivePowerUps((prev) =>
                    prev.includes(power.id) ? prev.filter((p) => p !== power.id) : [...prev, power.id],
                  );
                }}
                className={`flex flex-col items-center justify-center py-2 rounded-2xl border transition ${
                  activePowerUps.includes(power.id)
                    ? "border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                    : "border-indigo-500/30 bg-indigo-950/40 text-indigo-400"
                }`}
              >
                <span className="text-xs font-black">{power.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Start Match Button */}
        <button
          onClick={() => setScreen("game")}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-black font-black text-sm tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.6)] active:scale-95 transition"
        >
          START A MATCH
        </button>
      </div>
    );
  }

  // --- RENDER 2: ACTIVE LUDO GAME BOARD (With 2nd/4th Tile Rules & Zero Overlap) ---
  return (
    <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between overflow-hidden bg-[#0A071B] p-2 text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="relative h-11 w-11 rounded-xl border-2 border-emerald-400 p-0.5 shadow-[0_0_12px_rgba(52,211,153,0.5)]">
            <img src={players.green.avatarUrl} alt={players.green.name} className="h-full w-full rounded-lg object-cover" />
            <div className="absolute -bottom-2 -left-1 flex items-center gap-0.5 rounded-full border border-emerald-400 bg-black/80 px-1 py-0.2 text-[8px] font-bold">
              <span>{players.green.countryFlag}</span>
              <span className="max-w-[40px] truncate">{players.green.name}</span>
            </div>
          </div>
          <button onClick={() => setScreen("lobby")} className="text-[10px] bg-purple-900/60 border border-purple-500/30 px-2 py-1 rounded-lg text-purple-200">
            Lobby 🔄
          </button>
        </div>

        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.2)]">
          <span className="text-amber-400 text-xs">🪙</span>
          <span className="text-[11px] font-black tracking-wide text-amber-200">
            {betAmount >= 1000000 ? `${(betAmount / 1000000).toFixed(1)}M` : betAmount.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative h-11 w-11 rounded-xl border-2 border-amber-400 p-0.5 shadow-[0_0_12px_rgba(251,191,36,0.5)]">
            <img src={players.yellow.avatarUrl} alt={players.yellow.name} className="h-full w-full rounded-lg object-cover" />
            <div className="absolute -bottom-2 -right-1 flex items-center gap-0.5 rounded-full border border-amber-400 bg-black/80 px-1 py-0.2 text-[8px] font-bold">
              <span>{players.yellow.countryFlag}</span>
              <span className="max-w-[40px] truncate">{players.yellow.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 15x15 Board Grid */}
      <div className="relative flex flex-1 items-center justify-center w-full my-auto overflow-hidden">
        <div className="aspect-square w-full max-w-[88vw] max-h-[48vh] rounded-2xl border border-indigo-500/30 bg-[#120B2E] p-1 shadow-[0_0_30px_rgba(30,27,75,0.8)]">
          <div
            className="grid h-full w-full gap-0.5 rounded-xl overflow-hidden bg-indigo-950/40"
            style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))", gridTemplateRows: "repeat(15, minmax(0, 1fr))" }}
          >
            {/* Green Yard */}
            <div className="col-span-6 row-span-6 rounded-tl-xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-950/90 to-emerald-900/40 p-2 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 rounded-lg border border-emerald-400/40 bg-black/40 p-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/50">
                    <div className="h-4.5 w-4.5 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-600 shadow-md border border-emerald-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Top Track (Yellow) - 2nd tile Start, 4th tile Safe Star */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const isHomePath = col === 1 && row > 0;
                const isStartTile = row === 1 && col === 2; // 2nd tile
                const isSafeStar = row === 3 && col === 2; // 4th tile
                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[8px] ${
                      isHomePath ? "bg-amber-500/80 border border-amber-300/40" : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isStartTile && <span className="text-amber-400 text-[9px]">🛡️</span>}
                    {isSafeStar && <span className="text-amber-300 text-[10px]">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Yellow Yard */}
            <div className="col-span-6 row-span-6 rounded-tr-xl border-2 border-amber-500 bg-gradient-to-br from-amber-950/90 to-amber-900/40 p-2 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 rounded-lg border border-amber-400/40 bg-black/40 p-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/50">
                    <div className="h-4.5 w-4.5 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 shadow-md border border-amber-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Left Track (Green) - 2nd tile Start, 4th tile Safe Star */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 6);
                const col = idx % 6;
                const isHomePath = row === 1 && col > 0;
                const isStartTile = row === 0 && col === 1; // 2nd tile
                const isSafeStar = row === 0 && col === 3; // 4th tile
                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[8px] ${
                      isHomePath ? "bg-emerald-500/80 border border-emerald-300/40" : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isStartTile && <span className="text-emerald-400 text-[9px]">🛡️</span>}
                    {isSafeStar && <span className="text-emerald-300 text-[10px]">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Center Home */}
            <div className="col-span-3 row-span-3 relative overflow-hidden rounded-lg border border-indigo-400/50 bg-[#0E0826]">
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div className="bg-emerald-500/60" />
                <div className="bg-amber-500/60" />
                <div className="bg-red-500/60" />
                <div className="bg-blue-500/60" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
              </div>
            </div>

            {/* Right Track (Blue) - 2nd tile Start, 4th tile Safe Star */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 6);
                const col = idx % 6;
                const isHomePath = row === 1 && col < 5;
                const isStartTile = row === 2 && col === 4; // 2nd tile
                const isSafeStar = row === 2 && col === 2; // 4th tile
                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[8px] ${
                      isHomePath ? "bg-sky-500/80 border border-sky-300/40" : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isStartTile && <span className="text-sky-400 text-[9px]">🛡️</span>}
                    {isSafeStar && <span className="text-sky-300 text-[10px]">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Red Yard */}
            <div className="col-span-6 row-span-6 rounded-bl-xl border-2 border-red-500 bg-gradient-to-br from-red-950/90 to-red-900/40 p-2 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 rounded-lg border border-red-400/40 bg-black/40 p-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/50">
                    <div className="h-4.5 w-4.5 rounded-full bg-gradient-to-b from-red-400 to-red-700 shadow-md border border-red-200" />
                  </div>
                ))}
              </div>
            </div>
            {/* Bottom Track (Red) - 2nd tile Start, 4th tile Safe Star */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const isHomePath = col === 1 && row < 5;
                const isStartTile = row === 4 && col === 0; // 2nd tile
                const isSafeStar = row === 2 && col === 0; // 4th tile
                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[8px] ${
                      isHomePath ? "bg-red-500/80 border border-red-300/40" : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isStartTile && <span className="text-red-400 text-[9px]">🛡️</span>}
                    {isSafeStar && <span className="text-red-300 text-[10px]">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Blue Yard */}
            <div className="col-span-6 row-span-6 rounded-br-xl border-2 border-sky-500 bg-gradient-to-br from-sky-950/90 to-sky-900/40 p-2 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 rounded-lg border border-sky-400/40 bg-black/40 p-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/50">
                    <div className="h-4.5 w-4.5 rounded-full bg-gradient-to-b from-sky-300 to-sky-600 shadow-md border border-sky-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Busybrain & Olumide */}
      <div className="flex items-end justify-between px-2 pb-1">
        <div className="flex items-center gap-1.5">
          <div className="relative h-11 w-11 rounded-xl border-2 border-red-500 p-0.5 shadow-[0_0_12px_rgba(239,68,68,0.5)]">
            <img src={players.red.avatarUrl} alt={players.red.name} className="h-full w-full rounded-lg object-cover" />
            <div className="absolute -bottom-2 -left-1 flex items-center gap-0.5 rounded-full border border-red-400 bg-black/80 px-1 py-0.2 text-[8px] font-bold">
              <span>{players.red.countryFlag}</span>
              <span className="max-w-[40px] truncate">{players.red.name}</span>
            </div>
          </div>

          <button type="button" onClick={handleRollDice} disabled={isRolling} className="relative flex items-center justify-center p-0.5 transition-transform active:scale-90 hover:scale-105">
            <Dice3DFace value={diceValue} isRolling={isRolling} />
            {currentTurn === "red" && !isRolling && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-black text-[8px] font-extrabold shadow-md animate-bounce">
                ▼
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" className="flex h-7 items-center gap-0.5 rounded-lg border border-purple-400/30 bg-purple-950/60 px-2 text-[10px] font-black text-purple-200">
            <RefreshCw className="h-2.5 w-2.5" />
            <span>25</span>
          </button>
          <button type="button" className="flex h-7 items-center gap-0.5 rounded-lg border border-indigo-400/30 bg-indigo-950/60 px-2 text-[10px] font-black text-indigo-200">
            <Smile className="h-3 w-3" />
            <span>EMOJI</span>
          </button>
          <button type="button" className="flex h-7 items-center gap-0.5 rounded-lg border border-indigo-400/30 bg-indigo-950/60 px-2 text-[10px] font-black text-indigo-200">
            <MessageSquare className="h-3 w-3" />
            <span>CHAT</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative h-11 w-11 rounded-xl border-2 border-sky-400 p-0.5 shadow-[0_0_12px_rgba(56,189,248,0.5)]">
            <img src={players.blue.avatarUrl} alt={players.blue.name} className="h-full w-full rounded-lg object-cover" />
            <div className="absolute -bottom-2 -right-1 flex items-center gap-0.5 rounded-full border border-sky-400 bg-black/80 px-1 py-0.2 text-[8px] font-bold">
              <span>{players.blue.countryFlag}</span>
              <span className="max-w-[40px] truncate">{players.blue.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
