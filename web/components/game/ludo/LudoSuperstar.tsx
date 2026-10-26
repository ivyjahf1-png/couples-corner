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

  // Helper to render pawn seed graphics based on player color
  const renderPawnSeed = (color: string) => {
    if (color === "red") {
      return (
        <div className="w-6 h-6 rounded-full bg-red-600 border-2 border-red-300 flex items-center justify-center shadow-[0_4px_6px_rgba(0,0,0,0.4)]">
          <span className="text-[10px]">💂</span>
        </div>
      );
    }
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
      <div className="w-5 h-5 bg-blue-600 clip-cone border-b-2 border-blue-300 shadow-md flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-200" />
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen max-w-[480px] mx-auto bg-[#32177a] text-white font-sans flex flex-col justify-between overflow-hidden relative shadow-2xl">
      
      {/* TOP BAR */}
      <div className="flex items-center justify-between p-3 bg-[#24105c]/90 border-b border-purple-500/20">
        <div className="flex items-center space-x-1.5">
          <button className="p-1.5 rounded-lg bg-purple-900/60 text-purple-200 text-xs font-bold">☰</button>
          <button className="p-1.5 rounded-lg bg-purple-900/60 text-purple-200 text-xs font-bold">🏆</button>
          <button className="p-1.5 rounded-lg bg-purple-900/60 text-purple-200 text-xs font-bold">👁️</button>
          <button className="p-1.5 rounded-lg bg-purple-900/60 text-purple-200 text-xs font-bold">🎯</button>
          <span className="bg-purple-900/80 px-3 py-1 rounded-full text-xs font-black text-white border border-purple-400/30">
            Aero
          </span>
        </div>
        <div className="flex items-center space-x-2 bg-purple-950/90 px-3 py-1 rounded-full border border-cyan-500/40">
          <span className="text-cyan-300 font-black text-xs">💎 0</span>
          <button className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">＋</button>
        </div>
      </div>

      {currentScreen === "game" && (
        <div className="flex-1 px-3 py-2 flex flex-col justify-between items-center relative">
          
          {/* TOP PLAYER PROFILES (Top-Left: Manish / Top-Right: Woozy mi...) */}
          <div className="w-full flex justify-between items-start px-1 z-10">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 p-0.5 border-2 border-yellow-300 shadow-lg">
                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center text-xl overflow-hidden">
                  {players[1].avatar}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <button className="w-8 h-8 rounded-xl bg-purple-900/70 border border-purple-400/30 flex items-center justify-center text-xs">🎁</button>
                <button className="w-8 h-8 rounded-xl bg-purple-900/70 border border-purple-400/30 flex items-center justify-center text-xs">⚡</button>
              </div>
              <div className="w-12 h-12 rounded-2xl p-0.5 border-2 border-pink-500 bg-gradient-to-tr from-yellow-400 to-pink-500 shadow-lg relative">
                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center text-xl overflow-hidden">
                  {players[2].avatar}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN 4D LUDO BOARD CLONE */}
          <div className="w-full aspect-square bg-[#ffffff] border-[6px] border-[#22104d] rounded-[28px] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.6)] grid grid-cols-15 gap-0 relative overflow-hidden my-auto">
            
            {/* GREEN BASE (TOP-LEFT) */}
            <div className="col-span-6 row-span-6 bg-[#00a651] rounded-tl-[20px] p-3 flex items-center justify-center relative">
              <div className="w-full h-full bg-white rounded-[22px] grid grid-cols-2 p-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].map((podIdx) => (
                  <div key={podIdx} className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-[3px] border-[#00a651] flex items-center justify-center bg-emerald-50">
                      {players[1].tokens[podIdx] === -1 && renderPawnSeed("green")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOP TRACK (COLUMNS 6 to 8, ROWS 0 to 5) */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 border-x border-slate-300 bg-white">
              {Array.from({ length: 18 }, (_, i) => {
                const r = Math.floor(i / 3);
                const c = 6 + (i % 3);
                const isYellowHomePath = c === 7 && r > 0;
                const isGreenStart = r === 1 && c === 6;
                return (
                  <div
                    key={i}
                    className={`border-[0.5px] border-slate-200 flex items-center justify-center relative ${
                      isYellowHomePath ? "bg-[#ffc20e]" : isGreenStart ? "bg-[#00a651]" : "bg-white"
                    }`}
                  >
                    {r === 2 && c === 8 && <span className="text-[10px]">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* YELLOW BASE (TOP-RIGHT) */}
            <div className="col-span-6 row-span-6 bg-[#ffc20e] rounded-tr-[20px] p-3 flex items-center justify-center relative">
              {/* Pinned Tag */}
              <div className="absolute top-1 left-2 bg-[#22104d] text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-yellow-300 flex items-center space-x-1 z-10 shadow-md">
                <span>🇧🇩</span>
                <span>Woozy mi...</span>
              </div>
              <div className="w-full h-full bg-white rounded-[22px] grid grid-cols-2 p-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].map((podIdx) => (
                  <div key={podIdx} className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-[3px] border-[#ffc20e] flex items-center justify-center bg-amber-50">
                      {players[2].tokens[podIdx] === -1 && renderPawnSeed("yellow")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LEFT TRACK (ROWS 6 to 8, COLS 0 to 5) */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 border-y border-slate-300 bg-white">
              {Array.from({ length: 18 }, (_, i) => {
                const r = 6 + Math.floor(i / 6);
                const c = i % 6;
                const isGreenHomePath = r === 7 && c < 5;
                const isRedStart = r === 8 && c === 1;
                return (
                  <div
                    key={i}
                    className={`border-[0.5px] border-slate-200 flex items-center justify-center relative ${
                      isGreenHomePath ? "bg-[#00a651]" : isRedStart ? "bg-[#ed1c24]" : "bg-white"
                    }`}
                  >
                    {r === 6 && c === 1 && <span className="text-[10px]">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* CENTER HOME HUB */}
            <div className="col-span-3 row-span-3 bg-slate-900 relative flex items-center justify-center overflow-hidden border border-slate-400">
              <div className="absolute top-0 left-0 w-full h-full border-t-[20px] border-t-[#ffc20e] border-r-[20px] border-r-[#0054a6] border-b-[20px] border-b-[#ed1c24] border-l-[20px] border-l-[#00a651]" />
            </div>

            {/* RIGHT TRACK (ROWS 6 to 8, COLS 9 to 14) */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 border-y border-slate-300 bg-white">
              {Array.from({ length: 18 }, (_, i) => {
                const r = 6 + Math.floor(i / 6);
                const c = 9 + (i % 6);
                const isBlueHomePath = r === 7 && c > 9;
                const isYellowStart = r === 6 && c === 13;
                return (
                  <div
                    key={i}
                    className={`border-[0.5px] border-slate-200 flex items-center justify-center relative ${
                      isBlueHomePath ? "bg-[#0054a6]" : isYellowStart ? "bg-[#ffc20e]" : "bg-white"
                    }`}
                  >
                    {r === 8 && c === 13 && <span className="text-[10px]">⭐</span>}
                  </div>
                );
              })}
            </div>

            {/* RED BASE (BOTTOM-LEFT) */}
            <div className="col-span-6 row-span-6 bg-[#ed1c24] rounded-bl-[20px] p-3 flex items-center justify-center relative">
              {/* Pinned Active Tag */}
              <div className="absolute -bottom-2 left-3 bg-[#22104d] text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-red-400 flex items-center space-x-1 z-10 shadow-md">
                <span>🇳🇬</span>
                <span>busybra...</span>
              </div>
              <div className="w-full h-full bg-white rounded-[22px] grid grid-cols-2 p-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].map((podIdx) => (
                  <div key={podIdx} className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-[3px] border-[#ed1c24] flex items-center justify-center bg-red-50">
                      {players[0].tokens[podIdx] === -1 && renderPawnSeed("red")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM TRACK (COLUMNS 6 to 8, ROWS 9 to 14) */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 border-x border-slate-300 bg-white">
              {Array.from({ length: 18 }, (_, i) => {
                const r = 9 + Math.floor(i / 3);
                const c = 6 + (i % 3);
                const isRedHomePath = c === 7 && r < 14;
                const isBlueStart = r === 13 && c === 8;
                return (
                  <div
                    key={i}
                    className={`border-[0.5px] border-slate-200 flex items-center justify-center relative ${
                      isRedHomePath ? "bg-[#ed1c24]" : isBlueStart ? "bg-[#0054a6]" : "bg-white"
                    }`}
                  >
                    {r === 12 && c === 6 && <span className="text-[10px]">⭐</span>}
                    {r === 13 && c === 7 && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        {renderPawnSeed("red")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BLUE BASE (BOTTOM-RIGHT) */}
            <div className="col-span-6 row-span-6 bg-[#0054a6] rounded-br-[20px] p-3 flex items-center justify-center relative">
              <div className="w-full h-full bg-white rounded-[22px] grid grid-cols-2 p-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].map((podIdx) => (
                  <div key={podIdx} className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-[3px] border-[#0054a6] flex items-center justify-center bg-blue-50">
                      {players[3].tokens[podIdx] === -1 && renderPawnSeed("blue")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GREEN ANIMATED TURN ARROW POINTING AT RED PLAYER TAG */}
            {currentPlayer === 0 && (
              <div className="absolute bottom-1 left-12 transform translate-y-full z-30 animate-bounce">
                <span className="text-3xl text-emerald-400 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">⬇️</span>
              </div>
            )}
          </div>

          {/* BOTTOM PROFILE & DYNAMICS CONTROLS */}
          <div className="w-full flex justify-between items-end px-1 mt-2">
            
            {/* Active Player Card Frame */}
            <div className="flex items-center space-x-2">
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-1 border-2 border-yellow-200 shadow-2xl">
                <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center text-3xl overflow-hidden">
                  {players[0].avatar}
                </div>
                <div className="absolute -top-2 -left-2 bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow">
                  👑
                </div>
              </div>
              {/* Floral Dice Container */}
              <div className="relative">
                <button
                  onClick={rollDice}
                  disabled={hasRolled || diceRolling}
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 border-2 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center text-white font-black text-2xl transition-transform ${
                    diceRolling ? "animate-spin" : "hover:scale-105 active:scale-95"
                  }`}
                >
                  {diceRolling ? "🎲" : diceValues.length > 0 ? (
                    <div className="flex space-x-1">
                      {diceValues.map((v, idx) => (
                        <span key={idx} className="bg-white text-slate-950 px-1.5 py-0.5 rounded text-xs font-black shadow">
                          {v}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "🎲"
                  )}
                </button>

                {/* Dice Multiplier Badge */}
                <div className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full border border-white shadow">
                  25
                </div>
                
                {/* Gem Re-roll Button */}
                <button className="mt-1 w-full bg-purple-950/80 border border-purple-400/40 rounded-lg py-0.5 flex items-center justify-center text-[10px] text-cyan-300 font-bold">
                  💎 2
                </button>
              </div>
            </div>

            {/* Action Buttons (EMOJI, CHAT, CALL) */}
            <div className="flex space-x-1.5">
              <button className="px-3 py-2 bg-purple-900/60 border border-purple-400/30 rounded-xl text-xs font-black text-purple-200 hover:bg-purple-800/80 transition-colors">
                EMOJI
              </button>
              <button className="px-3 py-2 bg-purple-900/60 border border-purple-400/30 rounded-xl text-xs font-black text-purple-200 hover:bg-purple-800/80 transition-colors">
                CHAT
              </button>
              <button className="px-3 py-2 bg-purple-900/60 border border-purple-400/30 rounded-xl text-xs font-black text-purple-200 hover:bg-purple-800/80 transition-colors">
                CALL
              </button>
            </div>
          </div>
        </div>
      )}

      {currentScreen === "victory" && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-[#24105c] border-2 border-amber-400 rounded-3xl p-8 text-center max-w-sm w-full space-y-4 shadow-2xl">
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