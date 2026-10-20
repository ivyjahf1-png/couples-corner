"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LudoDice } from "./LudoDice";
import { type LudoGameState, type LudoColor } from "@/lib/ludo/engine";

interface LudoHudProps {
  state: LudoGameState;
  dice: number;
  rolling: boolean;
  canRollNow: boolean;
  onRoll: () => void;
  hubLabel: string;
}

export const LudoHud: React.FC<LudoHudProps> = ({
  state,
  dice,
  rolling,
  canRollNow,
  onRoll,
  hubLabel,
}: LudoHudProps) => {
  const players = state.players;
  const activeTurn = state.turn as LudoColor;

  const getPlayerByColor = (colorKey: string) => {
    if (!players) return undefined;
    if (Array.isArray(players)) {
      const found = players.find((p: any) => p?.color === colorKey);
      if (found) return found;
    }
    return (players as Record<string, any>)[colorKey];
  };

  return (
    <div className="w-full max-w-[450px] mx-auto flex flex-col gap-3 px-1">
      {hubLabel ? (
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-white/50">
          {hubLabel}
        </p>
      ) : null}

      {/* TOP ROW: GREEN (Top-Left) & YELLOW (Top-Right) */}
      <div className="flex items-center justify-between w-full">
        <PlayerSeatCard
          player={getPlayerByColor("green") ?? (players as any)?.[3]}
          color="#22C55E"
          name="Green"
          colorKey="green"
          isActive={activeTurn === 3 || activeTurn === ("green" as any)}
          dice={dice}
          rolling={rolling}
          canRollNow={canRollNow}
          onRoll={onRoll}
          align="left"
        />

        <PlayerSeatCard
          player={getPlayerByColor("yellow") ?? (players as any)?.[2]}
          color="#EAB308"
          name="Yellow"
          colorKey="yellow"
          isActive={activeTurn === 2 || activeTurn === ("yellow" as any)}
          dice={dice}
          rolling={rolling}
          canRollNow={canRollNow}
          onRoll={onRoll}
          align="right"
        />
      </div>

      {/* BOTTOM ROW: RED (Bottom-Left) & BLUE (Bottom-Right) */}
      <div className="flex items-center justify-between w-full">
        <PlayerSeatCard
          player={getPlayerByColor("red") ?? (players as any)?.[0]}
          color="#EF4444"
          name="You"
          colorKey="red"
          isActive={activeTurn === 0 || activeTurn === ("red" as any)}
          dice={dice}
          rolling={rolling}
          canRollNow={canRollNow}
          onRoll={onRoll}
          align="left"
          isUser
        />

        <PlayerSeatCard
          player={getPlayerByColor("blue") ?? (players as any)?.[1]}
          color="#3B82F6"
          name="Blue"
          colorKey="blue"
          isActive={activeTurn === 1 || activeTurn === ("blue" as any)}
          dice={dice}
          rolling={rolling}
          canRollNow={canRollNow}
          onRoll={onRoll}
          align="right"
        />
      </div>
    </div>
  );
};

function PlayerSeatCard({
  player,
  color,
  name,
  isActive,
  dice,
  rolling,
  canRollNow,
  onRoll,
  align,
  isUser,
}: {
  player: any;
  color: string;
  name: string;
  colorKey: string;
  isActive: boolean;
  dice: number;
  rolling: boolean;
  canRollNow: boolean;
  onRoll: () => void;
  align: "left" | "right";
  isUser?: boolean;
}) {
  return (
    <div className={`relative flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/95 border transition-all ${
          isActive ? "shadow-lg scale-105" : "border-white/10 opacity-80"
        }`}
        style={{ borderColor: isActive ? color : "rgba(255,255,255,0.1)" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-inner"
          style={{ borderColor: color, background: `${color}33`, color: "#ffffff" }}
        >
          {player?.name?.[0] ?? name[0]}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black text-white truncate max-w-[70px]">
            {isUser ? "You" : player?.name ?? name}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: color }}>
            Lv.{player?.level ?? 1}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="z-30"
          >
            <button
              type="button"
              onClick={onRoll}
              disabled={!canRollNow}
              className="relative flex items-center justify-center p-1.5 rounded-2xl bg-slate-950/95 border-2 shadow-xl active:scale-95 transition cursor-pointer"
              style={{ borderColor: color, boxShadow: `0 0 15px ${color}88` }}
            >
              <LudoDice value={dice} rolling={rolling} active={canRollNow} size={38} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LudoHud;