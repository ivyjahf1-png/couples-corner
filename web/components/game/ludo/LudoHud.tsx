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

  const seats = [
    { id: 0, name: names[0] || "You", country: "Nigeria", color: "border-red-500", bg: "from-red-950/80 to-[#12192E]" },
    { id: 1, name: names[1] || "Bella", country: "UK", color: "border-blue-500", bg: "from-blue-950/80 to-[#12192E]" },
    { id: 2, name: names[2] || "Zaki", country: "KSA", color: "border-yellow-500", bg: "from-yellow-950/80 to-[#12192E]" },
    { id: 3, name: names[3] || "Martin", country: "India", color: "border-green-500", bg: "from-green-950/80 to-[#12192E]" },
  ];

  return (
    <div className="w-full px-3 py-1 grid grid-cols-2 gap-2 z-20">
      {seats.map((seat) => {
        const isActive = currentTurn === seat.id;

        return (
          <div 
            key={seat.id} 
            className={"flex items-center justify-between p-1.5 rounded-2xl bg-gradient-to-r " + seat.bg + " border transition-all shadow-lg " + (isActive ? "border-cyan-400 ring-2 ring-cyan-400/40 scale-[1.02]" : "border-white/10 opacity-70")}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-shrink-0">
                <div className={"w-9 h-9 rounded-full border-2 " + seat.color + " p-0.5 bg-black overflow-hidden shadow"}>
                  <img src={"https://api.dicebear.com/7.x/avataaars/svg?seed=" + seat.name} alt={seat.name} className="w-full h-full rounded-full" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#050814]" />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-white text-xs font-bold truncate">{seat.name}</span>
                <span className="text-[9px] text-gray-300 truncate">{seat.country}</span>
              </div>
            </div>

            {isActive ? (
              <div className="flex-shrink-0 pl-1.5">
                <LudoDice value={dice} rolling={rolling} active={canRollNow} size={38} onRoll={onRoll} />
              </div>
            ) : (
              <div className="text-[9px] font-bold text-gray-400 px-2 py-0.5 rounded bg-black/30">
                Wait
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}