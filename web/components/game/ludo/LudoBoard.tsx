"use client";

import React from "react";
import { 
  ArrowLeft, 
  Trophy, 
  Lock, 
  Smile, 
  MessageSquare, 
  PhoneCall, 
  Sparkles 
} from "lucide-react";
import { 
  FINISH_STEP,
  trackCell,
  type LudoColor,
  type LudoGameState,
} from "@/lib/ludo/engine";

interface LudoBoardProps {
  state: LudoGameState;
  selectable: readonly number[];
  onSelect: (tokenIdx: number) => void;
  diceValue?: number;
  rolling?: boolean;
  onRoll?: () => void;
  isNeon?: boolean;
}

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

const HOME_PATHS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Red
  1: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Blue
  2: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Yellow
  3: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Green
};

const BASE_SPOTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  0: [[1.8, 10.8], [4.2, 10.8], [1.8, 13.2], [4.2, 13.2]], // Red
  1: [[10.8, 10.8], [13.2, 10.8], [10.8, 13.2], [13.2, 13.2]], // Blue
  2: [[10.8, 1.8], [13.2, 1.8], [10.8, 4.2], [13.2, 4.2]], // Yellow
  3: [[1.8, 1.8], [4.2, 1.8], [1.8, 4.2], [4.2, 4.2]], // Green
};

const START_TRACK_POS = [0, 14, 28, 42];

function getCoords(color: number, tokenIdx: number, steps: number) {
  if (steps < 0) {
    const spot = BASE_SPOTS[color]?.[tokenIdx] || [7, 7];
    return { isBase: true, col: spot[0], row: spot[1] };
  }
  if (steps === FINISH_STEP) {
    return { isBase: false, col: 7, row: 7 };
  }
  if (steps <= 50) {
   const cellIdx = trackCell(color as LudoColor, steps);
    const safeCellIdx = cellIdx !== null ? cellIdx : 0;
    const pos = TRACK_PATH[((safeCellIdx % 52) + 52) % 52] || [7, 7];
    return { isBase: false, col: pos[0], row: pos[1] };
  }
  const homePath = HOME_PATHS[color];
  const pos = homePath?.[steps - 51] || [7, 7];
  return { isBase: false, col: pos[0], row: pos[1] };
}

export default function LudoBoard({
  state,
  selectable,
  onSelect,
  diceValue = 1,
  rolling = false,
  onRoll,
}: LudoBoardProps) {
  const currentTurn = Number(state.turn);
  const players = (state.players as unknown as ReadonlyArray<{ tokens: ReadonlyArray<{ steps: number }> }>) || [];

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
          <div className={`relative p-0.5 rounded-2xl border-2 ${currentTurn === 3 ? "border-emerald-400 animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.8)]" : "border-emerald-600/60"} bg-[#151838]`}>
            <div className="w-11 h-11 rounded-xl bg-[#1E224F] flex items-center justify-center text-xl">👩🏽‍🦰</div>
            <span className="absolute -bottom-1 -right-1 text-[10px]">🇲🇽</span>
          </div>
          <span className="text-xs font-bold text-slate-200 tracking-wide">Itzel</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200 tracking-wide">Miray</span>
          <div className={`relative p-0.5 rounded-2xl border-2 ${currentTurn === 2 ? "border-amber-400 animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.8)]" : "border-amber-600/60"} bg-[#151838]`}>
            <div className="w-11 h-11 rounded-xl bg-[#1E224F] flex items-center justify-center text-xl">👱🏼‍♀️</div>
            <span className="absolute -bottom-1 -right-1 text-[10px]">🇺🇸</span>
          </div>
        </div>
      </div>

      {/* Main Ludo Board Container */}
      <div className="relative w-full max-w-[350px] aspect-square bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-2.5 grid grid-cols-15 grid-rows-15 gap-0.5 z-10 border border-slate-200">
        
        {/* Green Base (Top Left) */}
        <div className="col-span-6 row-span-6 bg-[#22c55e] rounded-2xl p-3 flex flex-col justify-between shadow-inner relative">
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 gap-2 p-3 items-center justify-center shadow-inner">
            {players[3]?.tokens?.map((token, idx) => {
              const isMovable = currentTurn === 3 && selectable.includes(idx);
              return (
                token.steps === -1 ? (
                  <button
                    key={idx}
                    onClick={() => currentTurn === 3 && onSelect(idx)}
                    className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-xs shadow transition ${
                      isMovable ? "scale-110 ring-4 ring-emerald-400 animate-bounce cursor-pointer" : ""
                    }`}
                  >
                    🛡️
                  </button>
                ) : <div key={idx} className="w-7 h-7 opacity-0"></div>
              );
            })}
          </div>
        </div>

        {/* Top Pathway */}
        <div className="col-span-3 row-span-6 bg-slate-50 flex flex-col items-center justify-between py-1 border border-slate-200">
          <div className="w-full h-1/6 bg-amber-400 flex items-center justify-center text-[10px]">⭐</div>
          <div className="w-full h-1/6 bg-yellow-100 flex items-center justify-center"><Lock size={12} className="text-amber-600"/></div>
          <div className="w-full h-1/6 bg-amber-400 flex items-center justify-center">🏰</div>
        </div>

        {/* Yellow Base (Top Right) */}
        <div className="col-span-6 row-span-6 bg-[#eab308] rounded-2xl p-3 flex flex-col justify-between shadow-inner relative">
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 gap-2 p-3 items-center justify-center shadow-inner">
            {players[2]?.tokens?.map((token, idx) => {
              const isMovable = currentTurn === 2 && selectable.includes(idx);
              return (
                token.steps === -1 ? (
                  <button
                    key={idx}
                    onClick={() => currentTurn === 2 && onSelect(idx)}
                    className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-xs shadow transition ${
                      isMovable ? "scale-110 ring-4 ring-amber-300 animate-bounce cursor-pointer" : ""
                    }`}
                  >
                    🏰
                  </button>
                ) : <div key={idx} className="w-7 h-7 opacity-0"></div>
              );
            })}
          </div>
        </div>

        {/* Center Finish Triangle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-slate-900 border-2 border-amber-400 rounded-xl flex items-center justify-center z-30 shadow-2xl rotate-45">
          <Trophy size={20} className="text-amber-400 -rotate-45" />
        </div>

        {/* Blue Base (Bottom Right) */}
        <div className="col-span-6 row-span-6 bg-[#3b82f6] rounded-2xl p-3 flex flex-col justify-between shadow-inner relative self-end">
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 gap-2 p-3 items-center justify-center shadow-inner">
            {players[1]?.tokens?.map((token, idx) => {
              const isMovable = currentTurn === 1 && selectable.includes(idx);
              return (
                token.steps === -1 ? (
                  <button
                    key={idx}
                    onClick={() => currentTurn === 1 && onSelect(idx)}
                    className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center text-xs shadow transition ${
                      isMovable ? "scale-110 ring-4 ring-blue-400 animate-bounce cursor-pointer" : ""
                    }`}
                  >
                    💧
                  </button>
                ) : <div key={idx} className="w-7 h-7 opacity-0"></div>
              );
            })}
          </div>
        </div>

        {/* Red Base (Bottom Left) */}
        <div className="col-span-6 row-span-6 bg-[#ef4444] rounded-2xl p-3 flex flex-col justify-between shadow-inner relative self-end">
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 gap-2 p-3 items-center justify-center shadow-inner">
            {players[0]?.tokens?.map((token, idx) => {
              const isMovable = currentTurn === 0 && selectable.includes(idx);
              return (
                token.steps === -1 ? (
                  <button
                    key={idx}
                    onClick={() => currentTurn === 0 && onSelect(idx)}
                    className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-red-500 flex items-center justify-center text-xs shadow transition ${
                      isMovable ? "scale-110 ring-4 ring-red-400 animate-bounce cursor-pointer" : ""
                    }`}
                  >
                    🐅
                  </button>
                ) : <div key={idx} className="w-7 h-7 opacity-0"></div>
              );
            })}
          </div>
        </div>

        {/* Track Seeds Overlay Layer */}
        <div className="absolute inset-0 grid grid-cols-15 grid-rows-15 pointer-events-none p-2.5">
          {players.map((player, colorIdx) =>
            player?.tokens?.map((token, tokenIdx) => {
              if (token.steps === -1) return null;
              const coords = getCoords(colorIdx, tokenIdx, token.steps);
              const isMovable = currentTurn === colorIdx && selectable.includes(tokenIdx);
              const icons = ["🐅", "💧", "🏰", "🛡️"];

              return (
                <div
                  key={`${colorIdx}-${tokenIdx}`}
                  className="absolute z-30 transition-all duration-300 ease-in-out flex items-center justify-center pointer-events-auto"
                  style={{
                    left: `${(coords.col / 15) * 100}%`,
                    top: `${(coords.row / 15) * 100}%`,
                    width: `${(1 / 15) * 100}%`,
                    height: `${(1 / 15) * 100}%`,
                  }}
                >
                  <button
                    onClick={() => currentTurn === colorIdx && onSelect(tokenIdx)}
                    className={`w-6 h-6 rounded-full bg-slate-900 text-white border-2 flex items-center justify-center text-[10px] shadow-lg ${
                      colorIdx === 0 ? "border-red-500" : colorIdx === 3 ? "border-emerald-500" : colorIdx === 2 ? "border-amber-400" : "border-blue-500"
                    } ${isMovable ? "scale-125 ring-2 ring-white animate-bounce cursor-pointer" : ""}`}
                  >
                    {icons[colorIdx]}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Floating 3D Dice */}
        <div 
          onClick={onRoll}
          className={`absolute bottom-4 left-4 w-14 h-14 bg-white rounded-2xl border-2 border-red-300 shadow-[0_10px_25px_rgba(239,68,68,0.6)] flex items-center justify-center cursor-pointer transform hover:scale-105 transition z-40 ${
            currentTurn === 0 ? "ring-4 ring-amber-400 animate-pulse" : "opacity-80"
          }`}
        >
          <span className={`text-lg font-black text-slate-900 ${rolling ? "animate-spin" : ""}`}>
            {diceValue}
          </span>
        </div>

      </div>

      {/* Bottom Player Row */}
      <div className="w-full max-w-sm flex items-center justify-between px-1 mt-2 z-20">
        <div className="flex items-center gap-3 relative">
          {currentTurn === 0 && (
            <div className="absolute -top-7 left-3 text-emerald-400 animate-bounce z-30 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18L4 8h16L12 18z"/></svg>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className={`relative p-0.5 rounded-2xl border-2 ${currentTurn === 0 ? "border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)]" : "border-red-600/60"} bg-[#151838]`}>
              <div className="w-11 h-11 rounded-xl bg-[#1E224F] flex items-center justify-center text-xl">🧔🏽‍♂️</div>
              <span className="absolute -bottom-1 -right-1 text-[10px]">🇳🇬</span>
            </div>
            <span className="text-xs font-bold text-white tracking-wide">busybrain...</span>
          </div>

          {currentTurn === 0 && (
            <button
              onClick={onRoll}
              disabled={rolling}
              className="px-3 py-2 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-xl text-xs font-black shadow-lg uppercase tracking-wider transition active:scale-95 cursor-pointer"
            >
              {rolling ? "Rolling..." : "Roll"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200">Azeel</span>
          <div
            className={`relative p-0.5 rounded-2xl border-2 ${
              currentTurn === 1
                ? "border-blue-400 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.8)]"
                : "border-blue-600/60"
            } bg-[#151838]`}
          >
            <div className="w-11 h-11 rounded-xl bg-[#1E224F] flex items-center justify-center text-xl">👦🏽</div>
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