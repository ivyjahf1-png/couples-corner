"use client";

import React, { useState, useRef } from "react";

interface Player {
  id: number;
  color: "red" | "green" | "yellow" | "blue";
  name: string;
  avatar: string;
  countryFlag: string;
  tokens: number[]; // -1 = home yard, 0..51 = main path, 52..56 = home stretch, 57 = finished
}

interface LudoProps {
  balance?: number;
  onWin?: (n: number) => void;
  onLose?: (n: number) => void;
}

export default function LudoSuperstar({ balance = 10000, onWin, onLose }: LudoProps) {
  const [currentScreen, setCurrentScreen] = useState<"dashboard" | "game" | "victory">("game");
  const [wager] = useState<number>(balance);
  const [playerCount] = useState<number>(4);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [diceRolling, setDiceRolling] = useState<boolean>(false);

  const [currentPlayer, setCurrentPlayer] = useState<number>(0); // 0: Red, 1: Green, 2: Yellow, 3: Blue
  const [diceValues, setDiceValues] = useState<number[]>([6, 6]);
  const [hasRolled, setHasRolled] = useState<boolean>(false);

  const [players, setPlayers] = useState<Player[]>([
    { id: 0, color: "red", name: "busybrain...", avatar: "👑", countryFlag: "🇳🇬", tokens: [-1, -1, -1, 0] },
    { id: 1, color: "green", name: "Manish", avatar: "🧕", countryFlag: "🇮🇳", tokens: [-1, -1, -1, -1] },
    { id: 2, color: "yellow", name: "Woozy mi...", avatar: "🕶️", countryFlag: "🇧🇩", tokens: [-1, -1, -1, -1] },
    { id: 3, color: "blue", name: "Azeel", avatar: "🦌", countryFlag: "🇸🇦", tokens: [-1, -1, -1, -1] },
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // 52 Main Track Coordinates [row, col]
  const mainPathGrid: [number, number][] = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8],
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14],
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6],
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0], [6, 0]
  ];

  // Starting indices on main path for each color
  const startIndices: Record<string, number> = {
    green: 0,
    yellow: 13,
    blue: 26,
    red: 39
  };

  // Safe star cell coordinates [row, col]
  const starCells: [number, number][] = [
    [6, 1], [2, 6], [1, 8], [6, 12],
    [8, 13], [12, 8], [13, 6], [8, 2]
  ];

  const playAudio = (type: "roll" | "move") => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "roll") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(320, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "move") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch {
      // Audio fallback
    }
  };

  const passTurn = (extraTurn: boolean) => {
    setHasRolled(false);
    setDiceValues([]);
    if (!extraTurn) {
      setCurrentPlayer((prev) => (prev + 1) % playerCount);
    }
  };

  const rollDice = () => {
    if (hasRolled || diceRolling) return;
    playAudio("roll");
    setDiceRolling(true);

    setTimeout(() => {
      const val1 = Math.floor(Math.random() * 6) + 1;
      const rolls = [val1];
      if (val1 === 6) rolls.push(Math.floor(Math.random() * 6) + 1);

      setDiceValues(rolls);
      setHasRolled(true);
      setDiceRolling(false);

      const activePlayer = players[currentPlayer];
      const canMove = activePlayer.tokens.some(
        (pos) => (pos === -1 && rolls.includes(6)) || pos >= 0
      );

      if (!canMove) {
        setTimeout(() => passTurn(false), 1000);
      }
    }, 500);
  };

  const handleTokenClick = (playerId: number, tokenIdx: number) => {
    if (!hasRolled || playerId !== currentPlayer || diceValues.length === 0) return;

    const dieToUse = diceValues[0];
    const updatedPlayers = [...players];
    const player = updatedPlayers[playerId];
    const currentPos = player.tokens[tokenIdx];

    if (currentPos === -1) {
      if (dieToUse === 6) {
        player.tokens[tokenIdx] = startIndices[player.color];
        playAudio("move");
        const remainingDice = diceValues.slice(1);
        setDiceValues(remainingDice);
        setPlayers(updatedPlayers);

        if (remainingDice.length === 0) passTurn(true);
      }
    } else {
      const nextPos = (currentPos + dieToUse) % mainPathGrid.length;
      player.tokens[tokenIdx] = nextPos;
      playAudio("move");
      const remainingDice = diceValues.slice(1);
      setDiceValues(remainingDice);
      setPlayers(updatedPlayers);

      if (player.tokens.every((p) => p >= 52)) {
        setCurrentScreen("victory");
        if (onWin) onWin(wager * 2);
        return;
      }

      if (remainingDice.length === 0) {
        passTurn(dieToUse === 6);
      }
    }
  };

  // Exact red soldier seeds from the screenshot
  const renderRedSeed = (size = "md") => (
    <div className={`${size === "sm" ? "w-5 h-6" : "w-6 h-7"} relative flex flex-col items-center`}>
      <div className="w-full h-[55%] bg-red-700 rounded-t-md border border-red-900 relative">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-2 bg-red-800 rounded-t-sm border border-red-950" />
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2.5 h-1.5 bg-amber-100 rounded-full" />
      </div>
      <div className="w-[70%] h-[45%] bg-red-600 rounded-b-md border border-red-800 -mt-0.5" />
    </div>
  );

  // Simple seeds for other colors (not visible in screenshot but kept for logic)
  const renderPawnSeed = (color: string) => {
    if (color === "red") return renderRedSeed();
    if (color === "yellow") {
      return (
        <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-200 flex items-center justify-center shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
        </div>
      );
    }
    if (color === "green") {
      return (
        <div className="w-5 h-5 rounded-full border-2 border-emerald-400 bg-emerald-600 flex items-center justify-center shadow-md">
          <div className="w-2 h-2 rounded-full bg-emerald-200" />
        </div>
      );
    }
    return (
      <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-blue-300 shadow-md flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-200" />
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen max-w-[480px] mx-auto bg-[#2b1a6e] text-white font-sans flex flex-col justify-between overflow-hidden relative shadow-2xl">
      
      {/* TOP BAR - exact match */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#1e1048]/95">
        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 rounded-lg bg-[#3a2580] flex items-center justify-center text-sm">☰</button>
          <button className="w-8 h-8 rounded-lg bg-[#3a2580] flex items-center justify-center text-sm">🏆</button>
          <button className="w-8 h-8 rounded-lg bg-[#3a2580] flex items-center justify-center text-sm">👁️</button>
          <button className="w-8 h-8 rounded-lg bg-[#3a2580] flex items-center justify-center text-sm">🎯</button>
          <span className="bg-[#3a2580] px-3 py-1 rounded-full text-xs font-bold text-white">
            Aero
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#1a0d3a] px-2.5 py-1 rounded-full border border-cyan-500/30">
          <span className="text-cyan-300 text-sm">💎</span>
          <span className="text-white font-bold text-sm">0</span>
          <button className="w-5 h-5 rounded-full bg-emerald-500 text-slate-900 font-black text-xs flex items-center justify-center">+</button>
        </div>
      </div>

      {currentScreen === "game" && (
        <div className="flex-1 px-2 py-1 flex flex-col justify-between items-center relative">
          
          {/* TOP RIGHT PROFILE + ICONS (exact placement) */}
          <div className="w-full flex justify-end items-start pr-1 z-20 absolute top-2 right-3">
            <div className="flex items-center gap-1.5">
              <button className="w-8 h-8 rounded-xl bg-[#3a2580]/80 flex items-center justify-center text-sm">🎁</button>
              <button className="w-8 h-8 rounded-xl bg-[#3a2580]/80 flex items-center justify-center text-sm">⚡</button>
              <div className="w-12 h-12 rounded-2xl p-[2px] bg-gradient-to-br from-yellow-300 via-pink-500 to-purple-500 shadow-lg relative">
                <div className="w-full h-full bg-slate-900 rounded-[14px] overflow-hidden flex items-center justify-center">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Woozy&backgroundColor=b6e3f4" alt="avatar" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* MAIN BOARD - exact clone */}
          <div className="w-full max-w-[380px] aspect-square bg-white border-[5px] border-[#1a0d3a] rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.55)] grid grid-cols-15 grid-rows-15 gap-0 relative overflow-hidden my-1">
            
            {/* ========== GREEN YARD (TOP-LEFT) - large 4-pip die ========== */}
            <div className="col-span-6 row-span-6 bg-[#00a651] rounded-tl-[18px] p-2.5 flex items-center justify-center relative">
              <div className="w-full h-full bg-white rounded-[18px] relative shadow-inner flex items-center justify-center">
                {/* 4 green pips */}
                <div className="absolute top-[18%] left-[18%] w-[26%] h-[26%] rounded-full bg-[#00a651]" />
                <div className="absolute top-[18%] right-[18%] w-[26%] h-[26%] rounded-full bg-[#00a651]" />
                <div className="absolute bottom-[18%] left-[18%] w-[26%] h-[26%] rounded-full bg-[#00a651]" />
                <div className="absolute bottom-[18%] right-[18%] w-[26%] h-[26%] rounded-full bg-[#00a651]" />
                {/* home tokens (none visible in screenshot) */}
              </div>
            </div>

            {/* ========== TOP TRACK (yellow home stretch) ========== */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6">
              {Array.from({ length: 18 }, (_, i) => {
                const r = Math.floor(i / 3);
                const c = i % 3;
                const isYellowPath = c === 1 && r >= 1;
                const isStar = (r === 2 && c === 2) || (r === 1 && c === 0);
                const isLock = r === 1 && c === 1;
                const isArrow = r === 5 && c === 0;
                return (
                  <div
                    key={i}
                    className={`border-[0.5px] border-slate-200 flex items-center justify-center relative ${
                      isYellowPath ? "bg-[#ffc20e]" : "bg-white"
                    }`}
                  >
                    {isStar && <span className="text-[9px] text-amber-500">★</span>}
                    {isLock && <span className="text-[11px]">🔒</span>}
                    {isArrow && <span className="text-[10px] text-slate-600">↑</span>}
                    {/* small yellow ring token as in screenshot */}
                    {r === 3 && c === 2 && (
                      <div className="w-3.5 h-3.5 rounded-full border-[3px] border-amber-400 bg-white" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ========== YELLOW YARD (TOP-RIGHT) - large 4-ring die ========== */}
            <div className="col-span-6 row-span-6 bg-[#ffc20e] rounded-tr-[18px] p-2.5 flex items-center justify-center relative">
              {/* Name tag exactly as screenshot */}
              <div className="absolute -top-1 right-2 z-20 bg-[#1a0d3a] text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-yellow-300 flex items-center gap-1 shadow">
                <span>🇧🇩</span>
                <span>Woozy mi...</span>
              </div>
              <div className="w-full h-full bg-white rounded-[18px] relative shadow-inner flex items-center justify-center">
                {/* 4 yellow rings */}
                <div className="absolute top-[18%] left-[18%] w-[26%] h-[26%] rounded-full border-[4px] border-[#ffc20e] bg-white" />
                <div className="absolute top-[18%] right-[18%] w-[26%] h-[26%] rounded-full border-[4px] border-[#ffc20e] bg-white" />
                <div className="absolute bottom-[18%] left-[18%] w-[26%] h-[26%] rounded-full border-[4px] border-[#ffc20e] bg-white" />
                <div className="absolute bottom-[18%] right-[18%] w-[26%] h-[26%] rounded-full border-[4px] border-[#ffc20e] bg-white" />
              </div>
            </div>

            {/* ========== LEFT TRACK (green home stretch) ========== */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3">
              {Array.from({ length: 18 }, (_, i) => {
                const r = Math.floor(i / 6);
                const c = i % 6;
                const isGreenPath = r === 1 && c <= 4;
                const isStar = (r === 0 && c === 1) || (r === 2 && c === 2);
                const isArrow = r === 1 && c === 0;
                return (
                  <div
                    key={i}
                    className={`border-[0.5px] border-slate-200 flex items-center justify-center relative ${
                      isGreenPath ? "bg-[#00a651]" : "bg-white"
                    }`}
                  >
                    {isStar && <span className="text-[9px] text-emerald-600">★</span>}
                    {isArrow && <span className="text-[10px] text-slate-600">←</span>}
                  </div>
                );
              })}
            </div>

            {/* ========== CENTER HOME HUB (exact 4-triangle) ========== */}
            <div className="col-span-3 row-span-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-slate-800" />
              {/* Four colored triangles meeting at center */}
              <div className="absolute top-0 left-0 w-0 h-0 border-t-[48px] border-t-[#00a651] border-r-[48px] border-r-transparent" />
              <div className="absolute top-0 right-0 w-0 h-0 border-t-[48px] border-t-[#ffc20e] border-l-[48px] border-l-transparent" />
              <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[48px] border-b-[#0054a6] border-l-[48px] border-l-transparent" />
              <div className="absolute bottom-0 left-0 w-0 h-0 border-b-[48px] border-b-[#ed1c24] border-r-[48px] border-r-transparent" />
            </div>

            {/* ========== RIGHT TRACK (blue home stretch) ========== */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3">
              {Array.from({ length: 18 }, (_, i) => {
                const r = Math.floor(i / 6);
                const c = i % 6;
                const isBluePath = r === 1 && c >= 1;
                const isStar = (r === 0 && c === 4) || (r === 2 && c === 3);
                const isArrow = r === 1 && c === 5;
                return (
                  <div
                    key={i}
                    className={`border-[0.5px] border-slate-200 flex items-center justify-center relative ${
                      isBluePath ? "bg-[#0054a6]" : "bg-white"
                    }`}
                  >
                    {isStar && <span className="text-[9px] text-blue-500">★</span>}
                    {isArrow && <span className="text-[10px] text-slate-600">→</span>}
                    {/* small blue marker as in screenshot */}
                    {r === 0 && c === 2 && (
                      <div className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ========== RED YARD (BOTTOM-LEFT) - large 1-pip die + 3 seeds ========== */}
            <div className="col-span-6 row-span-6 bg-[#ed1c24] rounded-bl-[18px] p-2.5 flex items-center justify-center relative">
              <div className="w-full h-full bg-white rounded-[18px] relative shadow-inner">
                {/* large red pip (face 1) */}
                <div className="absolute top-[22%] left-[18%] w-[32%] h-[32%] rounded-full bg-[#ed1c24]" />
                
                {/* 3 red soldier seeds exactly positioned like screenshot */}
                <div className="absolute top-[18%] right-[18%]">
                  {renderRedSeed("sm")}
                </div>
                <div className="absolute bottom-[16%] left-[22%]">
                  {renderRedSeed("sm")}
                </div>
                <div className="absolute bottom-[16%] right-[22%]">
                  {renderRedSeed("sm")}
                </div>
              </div>
              
              {/* Name tag + green arrow exactly as screenshot */}
              <div className="absolute -bottom-3 left-3 z-30 flex flex-col items-start">
                <div className="bg-[#1a0d3a] text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-400 flex items-center gap-1 shadow">
                  <span>🇳🇬</span>
                  <span>busybra...</span>
                </div>
              </div>
            </div>

            {/* ========== BOTTOM TRACK (red home stretch) ========== */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6">
              {Array.from({ length: 18 }, (_, i) => {
                const r = Math.floor(i / 3);
                const c = i % 3;
                const isRedPath = c === 1 && r <= 4;
                const isStar = (r === 3 && c === 0) || (r === 2 && c === 2);
                const isLock = r === 4 && c === 1;
                const isArrow = r === 0 && c === 2;
                return (
                  <div
                    key={i}
                    className={`border-[0.5px] border-slate-200 flex items-center justify-center relative ${
                      isRedPath ? "bg-[#ed1c24]" : "bg-white"
                    }`}
                  >
                    {isStar && <span className="text-[9px] text-red-500">★</span>}
                    {isLock && <span className="text-[11px]">🔒</span>}
                    {isArrow && <span className="text-[10px] text-slate-600">↓</span>}
                    
                    {/* the 4th red seed sitting on the path (exactly as screenshot) */}
                    {r === 4 && c === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        {renderRedSeed("sm")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* ========== BLUE YARD (BOTTOM-RIGHT) - large 4-pip die ========== */}
            <div className="col-span-6 row-span-6 bg-[#0054a6] rounded-br-[18px] p-2.5 flex items-center justify-center relative">
              <div className="w-full h-full bg-white rounded-[18px] relative shadow-inner flex items-center justify-center">
                {/* 4 blue pips */}
                <div className="absolute top-[18%] left-[18%] w-[26%] h-[26%] rounded-full bg-[#0054a6]" />
                <div className="absolute top-[18%] right-[18%] w-[26%] h-[26%] rounded-full bg-[#0054a6]" />
                <div className="absolute bottom-[18%] left-[18%] w-[26%] h-[26%] rounded-full bg-[#0054a6]" />
                <div className="absolute bottom-[18%] right-[18%] w-[26%] h-[26%] rounded-full bg-[#0054a6]" />
              </div>
            </div>

            {/* Green turn arrow pointing at red player tag */}
            {currentPlayer === 0 && (
              <div className="absolute bottom-[-18px] left-[70px] z-40 animate-bounce">
                <span className="text-3xl drop-shadow-lg">⬇️</span>
              </div>
            )}
          </div>

          {/* BOTTOM SECTION - exact layout from screenshot */}
          <div className="w-full flex items-end justify-between px-1 mt-3 mb-1">
            
            {/* Left: Active player card + dice */}
            <div className="flex items-end gap-2">
              {/* Big active avatar (green warrior style matching screenshot feel) */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 p-[2px] shadow-xl">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] overflow-hidden flex items-center justify-center">
                    <div className="text-3xl">🐉</div>
                  </div>
                </div>
                <div className="absolute -top-1.5 -left-1.5 bg-amber-400 text-slate-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white shadow">
                  👑
                </div>
              </div>

              {/* Dice / power-up area */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="relative">
                  <button
                    onClick={rollDice}
                    disabled={hasRolled || diceRolling}
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-800 border-2 border-emerald-300 shadow-lg flex items-center justify-center transition-transform ${
                      diceRolling ? "animate-spin" : "active:scale-95"
                    }`}
                  >
                    {diceRolling ? (
                      <span className="text-2xl">🎲</span>
                    ) : diceValues.length > 0 ? (
                      <div className="flex gap-0.5">
                        {diceValues.map((v, idx) => (
                          <span key={idx} className="bg-white text-slate-900 text-xs font-black px-1.5 py-0.5 rounded shadow">
                            {v}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-2xl">🎲</span>
                    )}
                  </button>
                  <div className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white shadow">
                    25
                  </div>
                </div>
                <button className="w-full bg-[#1a0d3a] border border-purple-500/40 rounded-md py-0.5 flex items-center justify-center gap-1 text-[10px] text-cyan-300 font-bold">
                  💎 2
                </button>
              </div>
            </div>

            {/* Right: EMOJI / CHAT / CALL */}
            <div className="flex gap-1.5">
              <button className="px-3.5 py-2 bg-[#3a2580]/80 border border-purple-400/30 rounded-xl text-[11px] font-bold text-purple-100">
                EMOJI
              </button>
              <button className="px-3.5 py-2 bg-[#3a2580]/80 border border-purple-400/30 rounded-xl text-[11px] font-bold text-purple-100">
                CHAT
              </button>
              <button className="px-3.5 py-2 bg-[#3a2580]/80 border border-purple-400/30 rounded-xl text-[11px] font-bold text-purple-100">
                CALL
              </button>
            </div>
          </div>
        </div>
      )}

      {currentScreen === "victory" && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-[#1e1048] border-2 border-amber-400 rounded-3xl p-8 text-center max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-6xl animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-amber-400">VICTORY!</h2>
            <p className="text-purple-200 font-bold">
              +{(wager * 2).toLocaleString()} Coins
            </p>
            <button
              onClick={() => setCurrentScreen("game")}
              className="w-full py-3 bg-amber-400 text-slate-950 font-black rounded-xl hover:bg-amber-300 transition-colors shadow-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}