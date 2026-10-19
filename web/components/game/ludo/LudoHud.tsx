"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LudoDice } from "./LudoDice";
import { LUDO_COLORS, LUDO_NAMES, type LudoGameState, type LudoColor, type LudoPlayerState } from "@/lib/ludo/engine";

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

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col gap-2.5 px-1">
      {/* Turn/status prompt from the caller (e.g. "Tap to Roll", "Pick a pawn",
          "Room {id}") — the member's only signal for what to do next. */}
      {hubLabel ? (
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-white/50">
          {hubLabel}
        </p>
      ) : null}
      {/* Top Row: Green (3) & Yellow (2) */}
      <div className="flex items-center justify-between">
        {/* Green Player (Seat 3) */}
        <PlayerSeatCard
          player={players[3]}
          color={LUDO_COLORS[3]}
          name={LUDO_NAMES[3]}
          isActive={activeTurn === 3}
          dice={dice}
          rolling={rolling}
          canRollNow={canRollNow}
          onRoll={onRoll}
          align="left"
        />

        {/* Yellow Player (Seat 2) */}
        <PlayerSeatCard
          player={players[2]}
          color={LUDO_COLORS[2]}
          name={LUDO_NAMES[2]}
          isActive={activeTurn === 2}
          dice={dice}
          rolling={rolling}
          canRollNow={canRollNow}
          onRoll={onRoll}
          align="right"
        />
      </div>

      {/* Bottom Row: Red (0 - You) & Blue (1) */}
      <div className="flex items-center justify-between">
        {/* Red Player / You (Seat 0) */}
        <PlayerSeatCard
          player={players[0]}
          color={LUDO_COLORS[0]}
          name="You"
          isActive={activeTurn === 0}
          dice={dice}
          rolling={rolling}
          canRollNow={canRollNow}
          onRoll={onRoll}
          align="left"
          isUser
        />

        {/* Blue Player (Seat 1) */}
        <PlayerSeatCard
          player={players[1]}
          color={LUDO_COLORS[1]}
          name={LUDO_NAMES[1]}
          isActive={activeTurn === 1}
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
  player: (LudoPlayerState & { name?: string; level?: number }) | undefined;
  color: string;
  name: string;
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
      {/* Player Profile Card */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 border transition-all ${
          isActive
            ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.4)] scale-105"
            : "border-white/10 opacity-80"
        }`}
      >
        <div
          className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs"
          style={{ borderColor: color, background: `${color}33` }}
        >
          {player?.name?.[0] ?? name[0]}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black text-white truncate max-w-[70px]">
            {isUser ? "You" : player?.name ?? name}
          </span>
          <span className="text-[10px] text-amber-300 font-semibold">
            Lv.{player?.level ?? 1}
          </span>
        </div>
      </div>

      {/* 5D Dice attached directly beside ONLY the active player */}
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
              className="relative flex items-center justify-center p-1.5 rounded-2xl bg-slate-950/95 border-2 shadow-xl active:scale-95 transition"
              style={{ borderColor: color, boxShadow: `0 0 20px ${color}66` }}
            >
              <LudoDice value={dice} rolling={rolling} active={canRollNow} size={42} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};