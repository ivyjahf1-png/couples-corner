"use client";
import React from "react";
import { type LudoGameState, type LudoColor } from "@/lib/ludo/engine";
import { LudoDice } from "./LudoDice";
import { ArrowDown } from "lucide-react";

interface LudoHudProps {
  state: LudoGameState;
  dice: number;
  rolling: boolean;
  canRollNow: boolean;
  onRoll: () => void;
  hubLabel: string;
  names?: string[];
}

export function LudoHud({
  state,
  dice,
  rolling,
  canRollNow,
  onRoll,
  names = ["busybrain", "Bella", "Zaki", "Martin"],
}: LudoHudProps) {
  const currentTurn = Number(state.turn) as LudoColor;

  const seatsConfig = [
    { id: 0, name: names[0] || "busybrain", country: "Nigeria", color: "border-red-500" },
    { id: 1, name: names[1] || "Bella", country: "UK", color: "border-blue-500" },
    { id: 2, name: names[2] || "Zaki", country: "KSA", color: "border-yellow-500" },
    { id: 3, name: names[3] || "Martin", country: "India", color: "border-green-500" },
  ];

  return (
    <div className="w-full px-2 py-1 flex items-center justify-between z-20">
      {seatsConfig.map((seat) => {
        const isActive = currentTurn === seat.id;

        return (
          <div key={seat.id} className="relative flex flex-col items-center">
            {isActive && (
              <div className="absolute -top-5 flex flex-col items-center animate-bounce z-30">
                <ArrowDown size={16} className="text-cyan-300 fill-cyan-400 drop-shadow-[0_0_6px_#22d3ee]" />
              </div>
            )}

            <div className={"flex items-center gap-1 p-1 rounded-2xl bg-[#1A2342]/90 border " + (isActive ? "border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "border-white/10")}>
              <div className="relative">
                <div className={"w-9 h-9 rounded-full border-2 " + seat.color + " p-0.5 bg-black overflow-hidden shadow-md"}>
                  <img src={"https://api.dicebear.com/7.x/avataaars/svg?seed=" + seat.name} alt={seat.name} className="w-full h-full rounded-full" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#050814]" />
              </div>

              <div className="flex flex-col pr-1">
                <span className="text-white text-[10px] font-bold truncate max-w-[55px]">{seat.name}</span>
                <span className="text-[8px] text-gray-300">{seat.country}</span>
              </div>

              {isActive && (
                <div className="ml-0.5 pl-1 border-l border-white/10 flex items-center justify-center">
                  <LudoDice value={dice} rolling={rolling} active={canRollNow} size={34} onRoll={onRoll} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}