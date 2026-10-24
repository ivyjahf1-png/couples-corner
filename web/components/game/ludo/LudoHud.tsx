"use client";
import React from "react";
import { type LudoGameState, type LudoColor } from "@/lib/ludo/engine";
import { LudoDice } from "./LudoDice";

interface LudoHudProps {
  state: LudoGameState;
  dice: number;
  rolling: boolean;
  canRollNow: boolean;
  onRoll: () => void;
  hubLabel?: string;
  names?: string[];
}

export function LudoHud({
  state,
  dice,
  rolling,
  canRollNow,
  onRoll,
  names = ["You", "Bella", "Zaki", "Martin"],
}: LudoHudProps) {
  const currentTurn = Number(state.turn) as LudoColor;

  // Seats ordered to match the 4 quadrants: 
  // 0: Red (Bottom-Left), 1: Blue (Bottom-Right), 2: Yellow (Top-Right), 3: Green (Top-Left)
  const seats = [
    { id: 0, name: names[0] || "You", country: "Nigeria", color: "border-red-500", text: "text-red-400" },
    { id: 1, name: names[1] || "Bella", country: "UK", color: "border-blue-500", text: "text-blue-400" },
    { id: 2, name: names[2] || "Zaki", country: "KSA", color: "border-yellow-500", text: "text-yellow-400" },
    { id: 3, name: names[3] || "Martin", country: "India", color: "border-green-500", text: "text-green-400" },
  ];

  return (
    <div className="w-full px-4 py-1.5 grid grid-cols-2 gap-2 z-20">
      {seats.map((seat) => {
        const isActive = currentTurn === seat.id;

        return (
          <div 
            key={seat.id} 
            className={"flex items-center gap-2 p-1.5 rounded-2xl bg-[#12192E]/95 border transition-all " + (isActive ? "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] scale-[1.02]" : "border-white/10 opacity-75")}
          >
            <div className="relative">
              <div className={"w-10 h-10 rounded-full border-2 " + seat.color + " p-0.5 bg-black overflow-hidden shadow-md"}>
                <img src={"https://api.dicebear.com/7.x/avataaars/svg?seed=" + seat.name} alt={seat.name} className="w-full h-full rounded-full" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050814]" />
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <span className={"text-xs font-bold truncate " + seat.text}>{seat.name}</span>
              <span className="text-[9px] text-gray-300">{seat.country}</span>
            </div>

            {/* Active 5D Dice right beside the current player's card */}
            {isActive && (
              <div className="pl-1 border-l border-white/10 flex items-center justify-center">
                <LudoDice value={dice} rolling={rolling} active={canRollNow} size={40} onRoll={onRoll} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}