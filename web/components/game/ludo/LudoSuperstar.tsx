"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, MessageSquare, Smile, Trophy, ArrowLeft, Bot } from "lucide-react";

export type Color = "red" | "green" | "yellow" | "blue";
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
  userName?: string;
  userAvatar?: string;
  userFlag?: string;
}

const RANDOM_NAMES = [
  { name: "Zainab", flag: "🇳🇬", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100" },
  { name: "Kofi", flag: "🇬🇭", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100" },
  { name: "Chidi", flag: "🇳🇬", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
];

function getRandomOpponents() {
  const shuffled = [...RANDOM_NAMES].sort(() => 0.5 - Math.random());
  return {
    green: { id: "1", name: shuffled[0].name, countryFlag: shuffled[0].flag, avatarUrl: shuffled[0].avatar, color: "green" as Color, score: 0 },
    yellow: { id: "2", name: shuffled[1].name, countryFlag: shuffled[1].flag, avatarUrl: shuffled[1].avatar, color: "yellow" as Color, score: 0 },
    blue: { id: "4", name: shuffled[2].name, countryFlag: shuffled[2].flag, avatarUrl: shuffled[2].avatar, color: "blue" as Color, score: 0 },
  };
}

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
    <div className={`relative h-9 w-9 rounded-xl bg-gradient-to-br from-white via-slate-100 to-slate-300 p-1 shadow-[0_4px_0_#64748b,0_6px_10px_rgba(0,0,0,0.5)] transition-transform duration-300 ${isRolling ? "animate-[spin_0.3s_linear_infinite] scale-110" : ""}`}>
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 items-center justify-items-center">
        {renderPips(value)}
      </div>
    </div>
  );
}

export default function LudoSuperstar({
  balance = 223890000,
  userName = "Player One",
  userAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
  userFlag = "🇳🇬"
}: LudoSuperstarProps) {
  const [screen, setScreen] = useState<"lobby" | "game">("game");

  const [selectedMode, setSelectedMode] = useState<LudoMode>("CLASSIC");
  const [betAmount] = useState<number>(10000000);

  const [opponents, setOpponents] = useState(() => getRandomOpponents());

  const players: Record<Color, Player> = {
    red: { id: "3", name: userName, countryFlag: userFlag, avatarUrl: userAvatar, color: "red", score: 0 },
    green: opponents.green,
    yellow: opponents.yellow,
    blue: opponents.blue,
  };

  const turnOrder: Color[] = ["red", "green", "yellow", "blue"];
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const currentTurn = turnOrder[turnIndex];

  const [diceValue, setDiceValue] = useState<number>(4);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [turnTimer, setTurnTimer] = useState<number>(30);
  const [aiAssistActive, setAiAssistActive] = useState<boolean>(false);

  // Seed states: tracks board positions/status for each player's 4 seeds
  const [playerSeeds, setPlayerSeeds] = useState<Record<Color, number[]>>({
    red: [-1, -1, -1, -1],
    green: [-1, -1, -1, -1],
    yellow: [-1, -1, -1, -1],
    blue: [-1, -1, -1, -1],
  });

  useEffect(() => {
    if (screen !== "game") return;
    const timer = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          triggerAiAssist();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, turnIndex]);

  const triggerAiAssist = () => {
    setAiAssistActive(true);
    handleRollDice();
    setTimeout(() => {
      setAiAssistActive(false);
      passTurn();
    }, 1500);
  };

  const passTurn = () => {
    setTurnIndex((prev) => (prev + 1) % turnOrder.length);
    setTurnTimer(30);
  };

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);

      // Seed movement logic following exact rules:
      // 6 = bring out seed to gate (position 0)
      // 1-5 = count and advance active seed forward by rolled steps
      setPlayerSeeds((prev) => {
        const seeds = [...prev[currentTurn]];
        if (rolled === 6) {
          const yardIndex = seeds.findIndex((s) => s === -1);
          if (yardIndex !== -1) {
            seeds[yardIndex] = 0; // Gate position
          }
        } else {
          const activeIndex = seeds.findIndex((s) => s >= 0);
          if (activeIndex !== -1) {
            seeds[activeIndex] += rolled;
          }
        }
        return { ...prev, [currentTurn]: seeds };
      });

      setTimeout(() => {
        passTurn();
      }, 1200);
    }, 400);
  };

  const handleStartMatch = () => {
    setOpponents(getRandomOpponents());
    setScreen("game");
  };

  if (screen === "lobby") {
    return (
      <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between overflow-hidden bg-[#1E1B4B] p-4 text-white select-none">
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

        <div className="flex flex-col items-center my-2">
          <span className="text-[11px] font-bold text-indigo-300 tracking-wider">Win</span>
          <div className="flex items-center gap-2 text-2xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
            <Trophy className="h-6 w-6 text-amber-400" />
            <span>{(betAmount * 2).toLocaleString()} Coins</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 my-2">
          {(["CLASSIC", "AERO", "TALLY", "SLAY"] as LudoMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
                selectedMode === mode ? "border-amber-400 bg-gradient-to-b from-indigo-900 to-indigo-950 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105" : "border-indigo-500/30 bg-indigo-950/40 opacity-70"
              }`}
            >
              <div className="text-xs font-black text-amber-300 mb-1">🎲</div>
              <span className="text-[10px] font-extrabold tracking-wider">{mode}</span>
            </button>
          ))}
        </div>

        <button onClick={handleStartMatch} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-black font-black text-sm tracking-wider shadow-lg active:scale-95 transition">
          START A MATCH
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between overflow-hidden bg-[#0A071B] p-2 text-white select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-1.5">
          <div className={`relative h-9 w-9 rounded-xl border-2 p-0.5 shadow-md ${currentTurn === "green" ? "border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "border-emerald-500/50"}`}>
            <img src={players.green.avatarUrl} alt={players.green.name} className="h-full w-full rounded-lg object-cover" />
            <div className="absolute -bottom-2 -left-1 flex items-center gap-0.5 rounded-full border border-emerald-400 bg-black/80 px-1 text-[7px] font-bold">
              <span>{players.green.countryFlag}</span>
              <span className="max-w-[35px] truncate">{players.green.name}</span>
            </div>
          </div>
          <button onClick={() => setScreen("lobby")} className="text-[9px] bg-purple-900/60 border border-purple-500/30 px-1.5 py-1 rounded-lg text-purple-200">
            Lobby 🔄
          </button>
        </div>

        {/* Timer & Stake */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
            <span className="text-amber-400 text-xs">🪙</span>
            <span className="text-[10px] font-black text-amber-200">
              {betAmount >= 1000000 ? `${(betAmount / 1000000).toFixed(1)}M` : betAmount.toLocaleString()}
            </span>
          </div>
          <div className={`flex items-center justify-center h-5 w-5 rounded-full border text-[9px] font-black ${turnTimer <= 5 ? "bg-red-500/30 border-red-400 text-red-300 animate-ping" : "bg-indigo-950 border-indigo-400 text-indigo-200"}`}>
            {turnTimer}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className={`relative h-9 w-9 rounded-xl border-2 p-0.5 shadow-md ${currentTurn === "yellow" ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" : "border-amber-500/50"}`}>
            <img src={players.yellow.avatarUrl} alt={players.yellow.name} className="h-full w-full rounded-lg object-cover" />
            <div className="absolute -bottom-2 -right-1 flex items-center gap-0.5 rounded-full border border-amber-400 bg-black/80 px-1 text-[7px] font-bold">
              <span>{players.yellow.countryFlag}</span>
              <span className="max-w-[35px] truncate">{players.yellow.name}</span>
            </div>
          </div>
        </div>
      </div>

      {aiAssistActive && (
        <div className="mx-auto flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-0.5 text-[9px] font-black text-amber-300 animate-pulse">
          <Bot className="h-3 w-3" />
          <span>AI ASSIST PLAYING...</span>
        </div>
      )}

      {/* Main 15x15 Board Grid */}
      <div className="relative flex flex-1 items-center justify-center w-full my-auto overflow-hidden">
        <div className="aspect-square w-full max-w-[85vw] max-h-[44vh] rounded-2xl border border-indigo-500/30 bg-[#120B2E] p-1 shadow-2xl">
          <div 
            className="grid h-full w-full gap-0.5 rounded-xl overflow-hidden bg-indigo-950/40"
            style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))", gridTemplateRows: "repeat(15, minmax(0, 1fr))" }}
          >
            {/* Green Yard */}
            <div className="col-span-6 row-span-6 rounded-tl-xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-950/90 to-emerald-900/40 p-1.5 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5 rounded-lg border border-emerald-400/40 bg-black/40 p-1">
                {playerSeeds.green.map((pos, i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/50">
                    {pos === -1 && <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-600 shadow-md border border-emerald-200" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Track (Yellow): Shield at gate, Star at the 5th tile pointed by fingers */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const isHomePath = col === 1 && row > 0;
                const isStartTile = row === 1 && col === 2; // Gate/Shield
                const isSafeStar = row === 4 && col === 0;   // 5th tile star position per user finger pointer
                return (
                  <div key={idx} className={`relative flex items-center justify-center rounded-xs text-[7px] ${isHomePath ? "bg-amber-500/80 border border-amber-300/40" : "bg-indigo-950/60 border border-indigo-500/20"}`}>
                    {isStartTile && <span className="text-amber-400 text-[8px]">🛡️</span>}
                    {isSafeStar && <span className="text-amber-300 text-[9px] font-bold drop-shadow">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Yellow Yard */}
            <div className="col-span-6 row-span-6 rounded-tr-xl border-2 border-amber-500 bg-gradient-to-br from-amber-950/90 to-amber-900/40 p-1.5 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5 rounded-lg border border-amber-400/40 bg-black/40 p-1">
                {playerSeeds.yellow.map((pos, i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/50">
                    {pos === -1 && <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 shadow-md border border-amber-200" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Left Track (Green): Shield at gate, Star at the 5th tile pointed by fingers */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 6);
                const col = idx % 6;
                const isHomePath = row === 1 && col > 0;
                const isStartTile = row === 0 && col === 1; // Gate/Shield
                const isSafeStar = row === 2 && col === 4;   // 5th tile star position per user finger pointer
                return (
                  <div key={idx} className={`relative flex items-center justify-center rounded-xs text-[7px] ${isHomePath ? "bg-emerald-500/80 border border-emerald-300/40" : "bg-indigo-950/60 border border-indigo-500/20"}`}>
                    {isStartTile && <span className="text-emerald-400 text-[8px]">🛡️</span>}
                    {isSafeStar && <span className="text-emerald-300 text-[9px] font-bold drop-shadow">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Center Home */}
            <div className="col-span-3 row-span-3 relative overflow-hidden rounded-lg border border-indigo-400/50 bg-[#0E0826]">
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div className="bg-emerald-500/60" /><div className="bg-amber-500/60" /><div className="bg-red-500/60" /><div className="bg-blue-500/60" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              </div>
            </div>

            {/* Right Track (Blue): Shield at gate, Star at the 5th tile pointed by fingers */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 6);
                const col = idx % 6;
                const isHomePath = row === 1 && col < 5;
                const isStartTile = row === 2 && col === 4; // Gate/Shield
                const isSafeStar = row === 0 && col === 1;   // 5th tile star position per user finger pointer
                return (
                  <div key={idx} className={`relative flex items-center justify-center rounded-xs text-[7px] ${isHomePath ? "bg-blue-500/80 border border-blue-300/40" : "bg-indigo-950/60 border border-indigo-500/20"}`}>
                    {isStartTile && <span className="text-blue-400 text-[8px]">🛡️</span>}
                    {isSafeStar && <span className="text-blue-300 text-[9px] font-bold drop-shadow">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Red Yard */}
            <div className="col-span-6 row-span-6 rounded-bl-xl border-2 border-red-500 bg-gradient-to-br from-red-950/90 to-red-900/40 p-1.5 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5 rounded-lg border border-red-400/40 bg-black/40 p-1">
                {playerSeeds.red.map((pos, i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/50">
                    {pos === -1 && <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-b from-red-300 to-red-600 shadow-md border border-red-200" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Track (Red): Shield at gate, Star at the 5th tile pointed by fingers */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-black/30 p-0.5">
              {Array.from({ length: 18 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const isHomePath = col === 1 && row < 5;
                const isStartTile = row === 4 && col === 0; // Gate/Shield
                const isSafeStar = row === 1 && col === 2;   // 5th tile star position per user finger pointer
                return (
                  <div key={idx} className={`relative flex items-center justify-center rounded-xs text-[7px] ${isHomePath ? "bg-red-500/80 border border-red-300/40" : "bg-indigo-950/60 border border-indigo-500/20"}`}>
                    {isStartTile && <span className="text-red-400 text-[8px]">🛡️</span>}
                    {isSafeStar && <span className="text-red-300 text-[9px] font-bold drop-shadow">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* Blue Yard */}
            <div className="col-span-6 row-span-6 rounded-br-xl border-2 border-blue-500 bg-gradient-to-br from-blue-950/90 to-blue-900/40 p-1.5 flex items-center justify-center">
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5 rounded-lg border border-blue-400/40 bg-black/40 p-1">
                {playerSeeds.blue.map((pos, i) => (
                  <div key={i} className="flex items-center justify-center rounded-full bg-blue-500/20 border border-blue-400/50">
                    {pos === -1 && <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-b from-blue-300 to-blue-600 shadow-md border border-blue-200" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer - Clean Non-Overlapping Profiles & Responsive Toolbar */}
      <div className="flex items-center justify-between px-1 pb-1 gap-1 w-full">
        
        {/* Left Player Profile Card (Red) */}
        <div className={`flex items-center gap-1 rounded-xl border-2 p-1 bg-black/70 shadow-md w-[31%] max-w-[125px] shrink-0 ${currentTurn === "red" ? "border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]" : "border-red-500/50"}`}>
          <img src={players.red.avatarUrl} alt={players.red.name} className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-0.5 text-[8px] font-bold">
              <span>{players.red.countryFlag}</span>
              <span className="truncate text-red-200">{players.red.name}</span>
            </div>
            <span className="text-[7px] text-red-400 font-extrabold">{currentTurn === "red" ? "YOUR TURN" : "Waiting"}</span>
          </div>
          {currentTurn === "red" && (
            <div className="absolute -top-11 left-6 z-20 cursor-pointer animate-bounce" onClick={handleRollDice}>
              <div className="flex flex-col items-center">
                <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-black">▼</span>
                <Dice3DFace value={diceValue} isRolling={isRolling} />
              </div>
            </div>
          )}
        </div>

        {/* Responsive Toolbar */}
        <div className="flex items-center justify-center gap-1 bg-indigo-950/70 border border-indigo-500/30 px-2 py-1.5 rounded-xl w-[36%] shrink-0">
          <button className="flex items-center gap-0.5 text-[8px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-1.5 py-1 rounded-lg">
            <RefreshCw className="h-2.5 w-2.5" /> 25
          </button>
          <button className="flex items-center gap-0.5 text-[8px] text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-1 rounded-lg">
            <Smile className="h-2.5 w-2.5" /> EMOJI
          </button>
          <button className="flex items-center gap-0.5 text-[8px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-1 rounded-lg">
            <MessageSquare className="h-2.5 w-2.5" /> CHAT
          </button>
        </div>

        {/* Right Player Profile Card (Blue) */}
        <div className={`flex items-center justify-end gap-1 rounded-xl border-2 p-1 bg-black/70 shadow-md w-[31%] max-w-[125px] shrink-0 ${currentTurn === "blue" ? "border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" : "border-blue-500/50"}`}>
          <div className="flex flex-col min-w-0 flex-1 text-right">
            <div className="flex items-center justify-end gap-0.5 text-[8px] font-bold">
              <span className="truncate text-blue-200">{players.blue.name}</span>
              <span>{players.blue.countryFlag}</span>
            </div>
            <span className="text-[7px] text-blue-400 font-extrabold">{currentTurn === "blue" ? "PLAYING" : "Waiting"}</span>
          </div>
          <img src={players.blue.avatarUrl} alt={players.blue.name} className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
          {currentTurn === "blue" && (
            <div className="absolute -top-11 right-6 z-20 cursor-pointer animate-bounce" onClick={handleRollDice}>
              <div className="flex flex-col items-center">
                <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-black">▼</span>
                <Dice3DFace value={diceValue} isRolling={isRolling} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Dice for Green/Yellow Turns */}
      {currentTurn === "green" && (
        <div className="absolute top-14 left-16 z-20 cursor-pointer animate-bounce" onClick={handleRollDice}>
          <div className="flex flex-col items-center">
            <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-black">▼</span>
            <Dice3DFace value={diceValue} isRolling={isRolling} />
          </div>
        </div>
      )}

      {currentTurn === "yellow" && (
        <div className="absolute top-14 right-16 z-20 cursor-pointer animate-bounce" onClick={handleRollDice}>
          <div className="flex flex-col items-center">
            <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-black">▼</span>
            <Dice3DFace value={diceValue} isRolling={isRolling} />
          </div>
        </div>
      )}
    </div>
  );
}