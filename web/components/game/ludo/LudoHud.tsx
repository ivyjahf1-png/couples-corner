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
  names = ["You", "Itzel", "Zaki", "Martin"],
}: LudoHudProps) {
  const currentTurn = Number(state.turn) as LudoColor;

  // 4 Corner Seats mapping to match video layout
  const seats = [
    { id: 3, name: names[3] || "Martin", country: "India", color: "border-green-500", bg: "bg-green-950/40" },
    { id: 2, name: names[2] || "Itzel", country: "MEX", color: "border-yellow-500", bg: "bg-yellow-950/40" },
    { id: 0, name: names[0] || "busybrain", country: "Nigeria", color: "border-red-500", bg: "bg-red-950/40" },
    { id: 1, name: names[1] || "Zaki", country: "KSA", color: "border-blue-500", bg: "bg-blue-950/40" },
  ];

  return (
    <div className="w-full px-2 py-1 grid grid-cols-2 gap-3 z-20">
      {seats.map((seat) => {
        const isActive = currentTurn === seat.id;

        return (
          <div 
            key={seat.id} 
            className={"relative flex items-center justify-between p-2 rounded-2xl border transition-all shadow-lg " + seat.bg + " " + (isActive ? "border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.02]" : "border-white/10 opacity-75")}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-shrink-0">
                <div className={"w-10 h-10 rounded-full border-2 " + seat.color + " p-0.5 bg-black overflow-hidden shadow-md"}>
                  <img src={"https://api.dicebear.com/7.x/avataaars/svg?seed=" + seat.name} alt={seat.name} className="w-full h-full rounded-full" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#090D1A]" />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-white text-xs font-bold truncate max-w-[70px]">{seat.name}</span>
                <span className="text-[9px] text-gray-300 truncate">{seat.country}</span>
              </div>
            </div>

            {/* Docked 5D Dice integrated directly inside the active player pod */}
            {isActive ? (
              <div className="flex-shrink-0 pl-2">
                <LudoDice value={dice} rolling={rolling} active={canRollNow} size={38} onRoll={onRoll} />
              </div>
            ) : (
              <div className="text-[9px] font-bold text-gray-400 px-2 py-1 rounded-lg bg-black/40 border border-white/5">
                Waiting
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}