"use client";

import React, { useState, useRef, useEffect } from "react";

type Theme = "classic" | "neon";
type GameMode = "friends" | "computer";

interface Player {
  id: number;
  color: "red" | "green" | "yellow" | "blue";
  name: string;
  flag: string;
  tokens: number[]; // -1 = home, 0-51 main path
  isBot?: boolean;
}

export default function LudoSuperstar({ balance = 10000, onWin, onLose }: { balance?: number; onWin?: (n: number) => void; onLose?: (n: number) => void }) {
  const [screen, setScreen] = useState<"lobby" | "game" | "victory">("lobby");
  const [theme, setTheme] = useState<Theme>("classic");
  const [playerCount, setPlayerCount] = useState(4);
  const [stake, setStake] = useState(balance);
  const [mode, setMode] = useState<GameMode>("friends");
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [dice, setDice] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);

  const [players, setPlayers] = useState<Player[]>([
    { id: 0, color: "red", name: "busybrai...", flag: "🇳🇬", tokens: [-1, -1, -1, -1] },
    { id: 1, color: "green", name: "Martin", flag: "🇮🇳", tokens: [-1, -1, -1, -1] },
    { id: 2, color: "yellow", name: "Woozy", flag: "🇧🇩", tokens: [-1, -1, -1, -1] },
    { id: 3, color: "blue", name: "Zaki", flag: "🇸🇦", tokens: [-1, -1, -1, -1] },
  ]);

  // ========== THEME COLORS ==========
  const colors = {
    classic: {
      red: "#e11d48",
      green: "#16a34a",
      yellow: "#eab308",
      blue: "#2563eb",
      boardBg: "#1e1b4b",
      path: "#f8fafc",
    },
    neon: {
      red: "#ff2d55",
      green: "#00ff9d",
      yellow: "#ffee00",
      blue: "#00d4ff",
      boardBg: "#0a0a1a",
      path: "#111827",
    },
  }[theme];

  // ========== PROFESSIONAL 3D SEEDS ==========
  const Seed = ({ color, size = 28 }: { color: string; size?: number }) => {
    if (color === "red") {
      // Soldier style (matches your reference)
      return (
        <div style={{ width: size, height: size * 1.25 }} className="relative">
          <div className="absolute inset-x-1 top-0 h-[55%] bg-gradient-to-b from-red-500 to-red-700 rounded-t-md border border-red-900 shadow-lg">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2.5 bg-red-800 rounded-t-sm" />
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-1.5 bg-amber-100 rounded-full" />
          </div>
          <div className="absolute inset-x-2 bottom-0 h-[48%] bg-gradient-to-b from-red-600 to-red-800 rounded-b-md border border-red-900" />
        </div>
      );
    }
    if (color === "blue") {
      return (
        <div
          style={{ width: size * 0.85, height: size }}
          className="bg-gradient-to-b from-blue-400 to-blue-700 rounded-t-full rounded-b-md border-2 border-blue-300 shadow-lg relative"
        >
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-200 rounded-full" />
        </div>
      );
    }
    if (color === "green") {
      return (
        <div
          style={{ width: size * 0.9, height: size * 0.9 }}
          className="bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-full border-2 border-emerald-200 shadow-lg flex items-center justify-center"
        >
          <div className="w-2.5 h-2.5 bg-emerald-100 rounded-full" />
        </div>
      );
    }
    // Yellow - coin style
    return (
      <div
        style={{ width: size * 0.9, height: size * 0.9 }}
        className="bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full border-2 border-yellow-100 shadow-lg flex items-center justify-center"
      >
        <div className="w-3 h-3 border-2 border-amber-700 rounded-full" />
      </div>
    );
  };


  // ========== DICE ==========
  const DiceFace = ({ value }: { value: number }) => {
    const dots: Record<number, string[]> = {
      1: ["center"],
      2: ["top-left", "bottom-right"],
      3: ["top-left", "center", "bottom-right"],
      4: ["top-left", "top-right", "bottom-left", "bottom-right"],
      5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
      6: ["top-left", "top-right", "mid-left", "mid-right", "bottom-left", "bottom-right"],
    };
    return (
      <div className="w-10 h-10 bg-white rounded-lg shadow-xl border border-gray-200 relative">
        {dots[value]?.map((pos) => (
          <div
            key={pos}
            className={`absolute w-2 h-2 bg-gray-900 rounded-full
              ${pos === "center" ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""}
              ${pos === "top-left" ? "top-1.5 left-1.5" : ""}
              ${pos === "top-right" ? "top-1.5 right-1.5" : ""}
              ${pos === "bottom-left" ? "bottom-1.5 left-1.5" : ""}
              ${pos === "bottom-right" ? "bottom-1.5 right-1.5" : ""}
              ${pos === "mid-left" ? "top-1/2 left-1.5 -translate-y-1/2" : ""}
              ${pos === "mid-right" ? "top-1/2 right-1.5 -translate-y-1/2" : ""}
            `}
          />
        ))}
      </div>
    );
  };

  const rollDice = () => {
    if (hasRolled || isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      const v1 = Math.floor(Math.random() * 6) + 1;
      const rolls = [v1];
      if (v1 === 6) rolls.push(Math.floor(Math.random() * 6) + 1);
      setDice(rolls);
      setHasRolled(true);
      setIsRolling(false);
    }, 600);
  };


  // ========== LOBBY SCREEN ==========
  if (screen === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1e1b4b] to-[#0f0a2e] text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl font-black mb-2 tracking-tight">
          LUDO <span className="text-yellow-400">PRO</span>
        </h1>
        <p className="text-purple-300 mb-8">Professional 4-Player Experience</p>

        {/* Theme Selector */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setTheme("classic")}
            className={`px-5 py-2 rounded-xl font-bold border-2 transition ${
              theme === "classic" ? "bg-yellow-400 text-black border-yellow-300" : "border-purple-500 text-purple-200"
            }`}
          >
            Classic
          </button>
          <button
            onClick={() => setTheme("neon")}
            className={`px-5 py-2 rounded-xl font-bold border-2 transition ${
              theme === "neon" ? "bg-cyan-400 text-black border-cyan-300" : "border-purple-500 text-purple-200"
            }`}
          >
            Neon Glow
          </button>
        </div>

        {/* Players */}
        <div className="w-full max-w-xs mb-6">
          <p className="text-sm text-purple-300 mb-2">Number of Players</p>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  playerCount === n ? "bg-emerald-500 text-white" : "bg-purple-900/60 text-purple-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div className="w-full max-w-xs mb-6">
          <p className="text-sm text-purple-300 mb-2">Game Mode</p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("friends")}
              className={`flex-1 py-3 rounded-xl font-bold ${
                mode === "friends" ? "bg-pink-500" : "bg-purple-900/60"
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setMode("computer")}
              className={`flex-1 py-3 rounded-xl font-bold ${
                mode === "computer" ? "bg-pink-500" : "bg-purple-900/60"
              }`}
            >
              Vs Computer
            </button>
          </div>
        </div>

        {/* Stake */}
        <div className="w-full max-w-xs mb-10">
          <p className="text-sm text-purple-300 mb-2">Stake Amount</p>
          <div className="flex gap-2 flex-wrap">
            {[500, 1000, 2000, 5000, 10000].map((s) => (
              <button
                key={s}
                onClick={() => setStake(s)}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${
                  stake === s ? "bg-amber-400 text-black" : "bg-purple-900/60"
                }`}
              >
                {s.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setScreen("game")}
          className="w-full max-w-xs py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-lg rounded-2xl shadow-xl active:scale-95 transition"
        >
          START GAME • {stake.toLocaleString()}
        </button>
      </div>
    );
  }



  // ========== GAME BOARD ==========
  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "neon" ? "bg-[#050510]" : "bg-[#1e1b4b]"
      }`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setScreen("lobby")} className="text-white/80 text-xl">←</button>
        <div className="font-black text-white tracking-wide">
          COUPLE&apos;S <span className="text-yellow-400">★</span> LUDO
        </div>
        <div className="bg-black/40 px-3 py-1 rounded-full text-yellow-300 font-bold text-sm">
          🪙 {stake.toLocaleString()}
        </div>
      </div>

      {/* BOARD */}
      <div className="flex-1 flex items-center justify-center p-2">
        <div
          className={`relative w-full max-w-[400px] aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 ${
            theme === "neon" ? "border-cyan-500/30 shadow-cyan-500/20" : "border-[#312e81]"
          }`}
          style={{ background: colors.boardBg }}
        >
          {/* 15×15 Grid */}
          <div className="absolute inset-2 grid grid-cols-15 grid-rows-15 gap-0">
            {/* GREEN HOME */}
            <div
              className="col-span-6 row-span-6 rounded-tl-2xl flex items-center justify-center p-3"
              style={{ background: colors.green }}
            >
              <div className="w-full h-full bg-white/95 rounded-2xl grid grid-cols-2 grid-rows-2 gap-2 p-3 place-items-center">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-[3px] border-green-500 flex items-center justify-center">
                    {players[1]?.tokens[i] === -1 && <Seed color="green" size={26} />}
                  </div>
                ))}
              </div>
            </div>

            {/* TOP PATH (Yellow home stretch) */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6">
              {Array.from({ length: 18 }).map((_, i) => {
                const r = Math.floor(i / 3);
                const c = i % 3;
                const isHome = c === 1 && r > 0;
                return (
                  <div
                    key={i}
                    className="border border-white/10 flex items-center justify-center"
                    style={{ background: isHome ? colors.yellow : colors.path }}
                  >
                    {r === 2 && c === 2 && <span className="text-yellow-500 text-xs">★</span>}
                  </div>
                );
              })}
            </div>

            {/* YELLOW HOME */}
            <div
              className="col-span-6 row-span-6 rounded-tr-2xl flex items-center justify-center p-3"
              style={{ background: colors.yellow }}
            >
              <div className="w-full h-full bg-white/95 rounded-2xl grid grid-cols-2 grid-rows-2 gap-2 p-3 place-items-center">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-[3px] border-yellow-500 flex items-center justify-center">
                    {players[2]?.tokens[i] === -1 && <Seed color="yellow" size={26} />}
                  </div>
                ))}
              </div>
            </div>

            {/* LEFT PATH */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3">
              {Array.from({ length: 18 }).map((_, i) => {
                const r = Math.floor(i / 6);
                const c = i % 6;
                const isHome = r === 1 && c < 5;
                return (
                  <div
                    key={i}
                    className="border border-white/10 flex items-center justify-center"
                    style={{ background: isHome ? colors.green : colors.path }}
                  />
                );
              })}
            </div>

            {/* CENTER */}
            <div className="col-span-3 row-span-3 relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: `conic-gradient(
                    ${colors.green} 0deg 90deg,
                    ${colors.yellow} 90deg 180deg,
                    ${colors.blue} 180deg 270deg,
                    ${colors.red} 270deg 360deg
                  )`,
                }}
              />
            </div>

            {/* RIGHT PATH */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3">
              {Array.from({ length: 18 }).map((_, i) => {
                const r = Math.floor(i / 6);
                const c = i % 6;
                const isHome = r === 1 && c > 0;
                return (
                  <div
                    key={i}
                    className="border border-white/10 flex items-center justify-center"
                    style={{ background: isHome ? colors.blue : colors.path }}
                  />
                );
              })}
            </div>

            {/* RED HOME */}
            <div
              className="col-span-6 row-span-6 rounded-bl-2xl flex items-center justify-center p-3 relative"
              style={{ background: colors.red }}
            >
              <div className="w-full h-full bg-white/95 rounded-2xl grid grid-cols-2 grid-rows-2 gap-2 p-3 place-items-center">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-[3px] border-red-500 flex items-center justify-center">
                    {players[0]?.tokens[i] === -1 && <Seed color="red" size={26} />}
                  </div>
                ))}
              </div>
              {/* Name tag */}
              <div className="absolute -bottom-3 left-4 bg-black/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-red-400 flex items-center gap-1">
                🇳🇬 busybrai...
              </div>
            </div>

            {/* BOTTOM PATH */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6">
              {Array.from({ length: 18 }).map((_, i) => {
                const r = Math.floor(i / 3);
                const c = i % 3;
                const isHome = c === 1 && r < 5;
                return (
                  <div
                    key={i}
                    className="border border-white/10 flex items-center justify-center"
                    style={{ background: isHome ? colors.red : colors.path }}
                  >
                    {r === 3 && c === 0 && <span className="text-red-500 text-xs">★</span>}
                  </div>
                );
              })}
            </div>

            {/* BLUE HOME */}
            <div
              className="col-span-6 row-span-6 rounded-br-2xl flex items-center justify-center p-3 relative"
              style={{ background: colors.blue }}
            >
              <div className="w-full h-full bg-white/95 rounded-2xl grid grid-cols-2 grid-rows-2 gap-2 p-3 place-items-center">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-[3px] border-blue-500 flex items-center justify-center">
                    {players[3]?.tokens[i] === -1 && <Seed color="blue" size={26} />}
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-3 right-4 bg-black/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-400 flex items-center gap-1">
                🇸🇦 Zaki
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="px-4 pb-6 pt-2 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 p-0.5 shadow-lg">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-2xl">
              🐉
            </div>
          </div>

          <div className="relative">
            <button
              onClick={rollDice}
              disabled={isRolling || hasRolled}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center gap-1 shadow-xl transition active:scale-95 ${
                isRolling ? "animate-spin" : ""
              } ${theme === "neon" ? "bg-cyan-500" : "bg-emerald-500"}`}
            >
              {dice.length > 0 ? (
                dice.map((d, i) => <DiceFace key={i} value={d} />)
              ) : (
                <span className="text-2xl">🎲</span>
              )}
            </button>
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
              25
            </div>
            <div className="mt-1 text-center text-[10px] text-cyan-300 font-bold">💎 2</div>
          </div>
        </div>

        <div className="flex gap-2">
          {["EMOJI", "CHAT", "CALL"].map((btn) => (
            <button
              key={btn}
              className="px-4 py-2.5 bg-purple-900/60 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-100"
            >
              {btn}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
