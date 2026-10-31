"use client";
import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Minus,
  Plus,
  Trophy,
  ArrowLeft,
  Bot,
  RefreshCw,
  Smile,
  MessageSquare,
} from "lucide-react";

export type Color = "green" | "yellow" | "red" | "blue";
type LudoMode = "CLASSIC" | "AERO" | "TALLY" | "SLAY";

export interface UserProfile {
  name: string;
  avatarUrl: string;
  countryFlag?: string;
}

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
  currentUser?: UserProfile;
  onWin?: (n: number) => void;
  onLose?: (n: number) => void;
}

// Dynamic randomized pool for opponents
const RANDOM_OPPONENTS_POOL = [
  { name: "Chidi", flag: "🇳🇬", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
  { name: "Amina", flag: "🇬🇭", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" },
  { name: "Tunde", flag: "🇳🇬", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100" },
  { name: "Fatima", flag: "🇸🇦", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100" },
  { name: "Kofi", flag: "🇬🇭", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100" },
  { name: "Zainab", flag: "🇳🇬", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100" },
  { name: "David", flag: "🇰🇪", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100" },
  { name: "Sarah", flag: "🇿🇦", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100" },
];

function getRandomOpponents() {
  const shuffled = [...RANDOM_OPPONENTS_POOL].sort(() => 0.5 - Math.random());
  return {
    green: {
      id: `opp_${Date.now()}_1`,
      name: shuffled[0].name,
      countryFlag: shuffled[0].flag,
      avatarUrl: shuffled[0].avatar,
      color: "green" as Color,
      score: 0,
    },
    yellow: {
      id: `opp_${Date.now()}_2`,
      name: shuffled[1].name,
      countryFlag: shuffled[1].flag,
      avatarUrl: shuffled[1].avatar,
      color: "yellow" as Color,
      score: 0,
    },
    blue: {
      id: `opp_${Date.now()}_3`,
      name: shuffled[2].name,
      countryFlag: shuffled[2].flag,
      avatarUrl: shuffled[2].avatar,
      color: "blue" as Color,
      score: 0,
    },
  };
}

// 3D Pip Dice Component
function Dice3DFace({ value, isRolling, onClick }: { value: number; isRolling: boolean; onClick?: () => void }) {
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
    <button
      onClick={onClick}
      disabled={isRolling}
      className={`relative h-12 w-12 cursor-pointer rounded-2xl bg-gradient-to-br from-white via-slate-100 to-slate-300 p-1.5 shadow-[0_4px_0_#64748b,0_6px_12px_rgba(0,0,0,0.6)] transition-all duration-300 active:scale-95 ${
        isRolling ? "animate-[spin_0.3s_linear_infinite] scale-110" : ""
      }`}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px]">▼</div>
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 items-center justify-items-center">
        {renderPips(value)}
      </div>
    </button>
  );
}

export default function LudoSuperstar({
  balance = 223890000,
  currentUser = {
    name: "busybrain",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
    countryFlag: "🇳🇬",
  },
}: LudoSuperstarProps) {
  const [screen, setScreen] = useState<"lobby" | "game">("game");

  // Lobby Configuration States
  const [selectedMode, setSelectedMode] = useState<LudoMode>("CLASSIC");
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [betAmount, setBetAmount] = useState<number>(10000000);
  const [activePowerUps, setActivePowerUps] = useState<string[]>(["UNDO"]);

  // Dynamic Players State (Randomized opponents & current user)
  const [opponents, setOpponents] = useState(() => getRandomOpponents());

  const players: Record<Color, Player> = {
    green: opponents.green,
    yellow: opponents.yellow,
    red: {
      id: "user_red",
      name: currentUser.name,
      countryFlag: currentUser.countryFlag || "🇳🇬",
      avatarUrl: currentUser.avatarUrl,
      color: "red",
      score: 0,
    },
    blue: opponents.blue,
  };

  // Turn Order Cycle: Red (User) -> Green -> Yellow -> Blue -> Red
  const turnOrder: Color[] = ["red", "green", "yellow", "blue"];

  // Game Engine & Turn Controls
  const [currentTurn, setCurrentTurn] = useState<Color>("red");
  const [diceValue, setDiceValue] = useState<number>(4);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [turnTimer, setTurnTimer] = useState<number>(30);
  const [aiAssistActive, setAiAssistActive] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);

  // Turn Countdown Timer
  useEffect(() => {
    if (screen !== "game") return;

    const timer = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          handleNextTurn();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, currentTurn]);

  // Handle Turn Switching & AI automatic moves for opponents
  const handleNextTurn = () => {
    setHasRolled(false);
    setTurnTimer(30);
    const currentIndex = turnOrder.indexOf(currentTurn);
    const nextColor = turnOrder[(currentIndex + 1) % turnOrder.length];
    setCurrentTurn(nextColor);
  };

  // Auto-play for opponents when it's their turn
  useEffect(() => {
    if (screen === "game" && currentTurn !== "red" && !isRolling && !hasRolled) {
      const timer = setTimeout(() => {
        handleRollDice();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, screen, isRolling, hasRolled]);

  const handleRollDice = () => {
    if (isRolling || hasRolled) return;
    setIsRolling(true);

    setTimeout(() => {
      const rolledVal = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolledVal);
      setIsRolling(false);
      setHasRolled(true);

      setTimeout(() => {
        handleNextTurn();
      }, 1200);
    }, 500);
  };

  const handleAdjustBet = (increment: boolean) => {
    setBetAmount((prev) => {
      if (increment) return Math.min(prev + 1000000, 50000000);
      return Math.max(prev - 1000000, 1000000);
    });
  };

  const handleStartMatch = () => {
    setOpponents(getRandomOpponents());
    setCurrentTurn("red");
    setHasRolled(false);
    setScreen("game");
  };

  // Helper function to render Safe House / Track Tiles accurately matching the user's reference image
  const renderTrackCell = (color: Color, index: number, total: number) => {
    const isStartTile = index === 0;
    const isSafeStar = index === 2;

    const starColorMap: Record<Color, string> = {
      green: "text-emerald-300",
      yellow: "text-amber-300",
      red: "text-red-300",
      blue: "text-blue-300",
    };

    const pathBgMap: Record<Color, string> = {
      green: "bg-emerald-500/80 border-emerald-300/40",
      yellow: "bg-amber-500/80 border-amber-300/40",
      red: "bg-red-500/80 border-red-300/40",
      blue: "bg-blue-500/80 border-blue-300/40",
    };

    return { isStartTile, isSafeStar, starColor: starColorMap[color], pathBg: pathBgMap[color] };
  };

  // Profile Card Component with Dynamic Active Dice Placement
  const renderPlayerCard = (playerColor: Color, positionClass: string) => {
    const player = players[playerColor];
    const isActive = currentTurn === playerColor;

    return (
      <div className={`relative flex items-center gap-2 ${positionClass}`}>
        {isActive && (
          <div className="animate-fade-in flex items-center justify-center transition-all duration-300">
            <Dice3DFace value={diceValue} isRolling={isRolling} onClick={handleRollDice} />
          </div>
        )}

        <div
          className={`relative h-11 w-11 rounded-xl border-2 p-0.5 shadow-md ${
            isActive ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] scale-105" : "border-slate-700 opacity-80"
          }`}
        >
          <img src={player.avatarUrl} alt={player.name} className="h-full w-full rounded-lg object-cover" />
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 whitespace-nowrap rounded-full border border-slate-600 bg-black/90 px-1.5 py-0.5 text-[8px] font-bold">
            <span>{player.countryFlag}</span>
            <span className="max-w-[45px] truncate text-white">{player.name}</span>
          </div>
        </div>
      </div>
    );
  };

  // --- LOBBY SCREEN ---
  if (screen === "lobby") {
    return (
      <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between overflow-hidden bg-[#1E1B4B] p-4 text-white select-none">
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setScreen("game")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-950/60 border border-indigo-500/30">
            <ArrowLeft className="h-5 w-5 text-indigo-200" />
          </button>
          <span className="text-base font-black tracking-wide text-indigo-100">Live Match</span>
          <div className="flex items-center gap-1 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-full">
            <span className="text-amber-400 text-xs">🪙</span>
            <span className="text-xs font-black text-amber-200">{(balance / 1000000).toFixed(2)}M</span>
          </div>
        </div>

        <div className="flex flex-col items-center my-2">
          <span className="text-[11px] font-bold text-indigo-300 tracking-wider">Win</span>
          <div className="flex items-center gap-2 text-2xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
            <Trophy className="h-6 w-6 text-amber-400" />
            <span>{(betAmount * 2).toLocaleString()} Coins</span>
          </div>
          <span className="text-[10px] text-indigo-300 mt-0.5 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/20">
            ⚡ +15 XP Bonus
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 my-2">
          {(["CLASSIC", "AERO", "TALLY", "SLAY"] as LudoMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
                selectedMode === mode
                  ? "border-amber-400 bg-gradient-to-b from-indigo-900 to-indigo-950 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105"
                  : "border-indigo-500/30 bg-indigo-950/40 opacity-70"
              }`}
            >
              <div className="text-xs font-black text-amber-300 mb-1">🎲</div>
              <span className="text-[10px] font-extrabold tracking-wider">{mode}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-indigo-500/40 bg-[#312E81]/60 p-4 shadow-xl backdrop-blur-md">
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

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[10px] font-bold text-indigo-300">Bet Amount</span>
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
        </div>

        <button onClick={handleStartMatch} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-black font-black text-sm tracking-wider shadow-lg active:scale-95 transition">
          START A MATCH
        </button>
      </div>
    );
  }

  // --- GAME BOARD SCREEN ---
  return (
    <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between overflow-hidden bg-[#0A071B] p-3 text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        {renderPlayerCard("green", "flex-row")}

        <div className="flex items-center gap-2">
          <button onClick={() => setScreen("lobby")} className="text-[10px] font-bold bg-purple-900/60 border border-purple-500/30 px-2.5 py-1 rounded-xl text-purple-200 active:scale-95">
            Lobby 🔄
          </button>

          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
            <span className="text-amber-400 text-xs">🪙</span>
            <span className="text-[11px] font-black text-amber-200">
              {betAmount >= 1000000 ? `${(betAmount / 1000000).toFixed(1)}M` : betAmount.toLocaleString()}
            </span>
          </div>

          <div
            className={`flex items-center justify-center h-7 w-7 rounded-full border text-[10px] font-black ${
              turnTimer <= 5 ? "bg-red-500/40 border-red-400 text-red-200 animate-pulse" : "bg-indigo-950 border-indigo-400 text-indigo-200"
            }`}
          >
            {turnTimer}s
          </div>
        </div>

        {renderPlayerCard("yellow", "flex-row-reverse")}
      </div>

      {/* Main 15x15 Board Grid */}
      <div className="relative flex flex-1 items-center justify-center w-full my-auto overflow-hidden">
        <div className="aspect-square w-full max-w-[90vw] max-h-[48vh] rounded-2xl border border-indigo-500/30 bg-[#120B2E] p-1.5 shadow-2xl">
          <div
            className="grid h-full w-full gap-0.5 rounded-xl overflow-hidden bg-indigo-950/40"
            style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))", gridTemplateRows: "repeat(15, minmax(0, 1fr))" }}
          >
            {/* Green Yard */}
            <div className="col-span-6 row-span-6 rounded-tl-xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-950/90 to-emerald-900/40 p-2 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 rounded-lg border border-emerald-400/40 bg-black/40 p-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/50">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-600 shadow-md border border-emerald-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Top Track (Yellow Entry Path) */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const isHomePath = col === 1 && row > 0;

                const isStartTile = row === 0 && col === 2;
                const isSafeStar = row === 2 && col === 2;

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[8px] ${
                      isHomePath ? "bg-amber-500/80 border border-amber-300/40" : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isStartTile && <span className="text-amber-400 text-[9px]">🛡️</span>}
                    {isSafeStar && <span className="text-amber-300 text-[10px] font-bold drop-shadow">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Yellow Yard */}
            <div className="col-span-6 row-span-6 rounded-tr-xl border-2 border-amber-500 bg-gradient-to-br from-amber-950/90 to-amber-900/40 p-2 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 rounded-lg border border-amber-400/40 bg-black/40 p-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/50">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 shadow-md border border-amber-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Left Track (Green Entry Path) */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 6);
                const col = idx % 6;
                const isHomePath = row === 1 && col > 0;
                const isStartTile = row === 0 && col === 1;
                const isSafeStar = row === 0 && col === 3;

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[8px] ${
                      isHomePath ? "bg-emerald-500/80 border border-emerald-300/40" : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isStartTile && <span className="text-emerald-400 text-[9px]">🛡️</span>}
                    {isSafeStar && <span className="text-emerald-300 text-[10px] font-bold drop-shadow">⭐</span>}
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
                <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
              </div>
            </div>

            {/* Right Track (Blue Entry Path) */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 6);
                const col = idx % 6;
                const isHomePath = row === 1 && col < 5;
                const isStartTile = row === 2 && col === 4;
                const isSafeStar = row === 2 && col === 2;

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[8px] ${
                      isHomePath ? "bg-blue-500/80 border border-blue-300/40" : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isStartTile && <span className="text-blue-400 text-[9px]">🛡️</span>}
                    {isSafeStar && <span className="text-blue-300 text-[10px] font-bold drop-shadow">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Red Yard */}
            <div className="col-span-6 row-span-6 rounded-bl-xl border-2 border-red-500 bg-gradient-to-br from-red-950/90 to-red-900/40 p-2 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 rounded-lg border border-red-400/40 bg-black/40 p-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/50">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-b from-red-300 to-red-600 shadow-md border border-red-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Track (Red Entry Path) */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const isHomePath = col === 1 && row < 5;
                const isStartTile = row === 5 && col === 0;
                const isSafeStar = row === 3 && col === 0;

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center rounded-xs text-[8px] ${
                      isHomePath ? "bg-red-500/80 border border-red-300/40" : "bg-indigo-950/60 border border-indigo-500/20"
                    }`}
                  >
                    {isStartTile && <span className="text-red-400 text-[9px]">🛡️</span>}
                    {isSafeStar && <span className="text-red-300 text-[10px] font-bold drop-shadow">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Blue Yard */}
            <div className="col-span-6 row-span-6 rounded-br-xl border-2 border-blue-500 bg-gradient-to-br from-blue-950/90 to-blue-900/40 p-2 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 rounded-lg border border-blue-400/40 bg-black/40 p-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-blue-500/20 border border-blue-400/50">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-b from-blue-300 to-blue-600 shadow-md border border-blue-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar & Player Cards */}
      <div className="flex items-center justify-between px-1 pb-1">
        {renderPlayerCard("red", "flex-row")}

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button className="flex items-center gap-1 bg-indigo-950/80 border border-indigo-500/40 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-indigo-200 active:scale-95">
            <RefreshCw className="h-3 w-3 text-amber-400" />
            <span>25</span>
          </button>
          <button className="flex items-center gap-1 bg-indigo-950/80 border border-indigo-500/40 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-indigo-200 active:scale-95">
            <Smile className="h-3.5 w-3.5 text-amber-300" />
            <span>EMOJI</span>
          </button>
          <button className="flex items-center gap-1 bg-indigo-950/80 border border-indigo-500/40 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-indigo-200 active:scale-95">
            <MessageSquare className="h-3.5 w-3.5 text-cyan-300" />
            <span>CHAT</span>
          </button>
        </div>

        {renderPlayerCard("blue", "flex-row-reverse")}
      </div>
    </div>
  );
}
