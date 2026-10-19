"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LudoDice } from "./LudoDice";
import { LUDO_COLORS, type LudoGameState } from "@/lib/ludo/engine";

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
}) => {
  // Player seat layout definitions: 0 (BL - You), 1 (BR), 2 (TR), 3 (TL)
  const players = state.players;

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col gap-3">
      {/* Top Players Row (Seat 3 Green TL & Seat 2 Yellow TR) */}
      <div className="flex items-center justify-between px-2">
        {/* Seat 3: Green Player */}
        <div className="relative flex items-center gap-2">
          <PlayerCard
            player={players[3]}
            color={LUDO_COLORS[3]}
            isActive={state.turn === 3}
          />
          {/* Active 5D Dice Attached to Seat 3 */}
          <AnimatePresence>
            {state.turn === 3 && (
              <motion.div
                initial={{ scale: 0, opacity: 0, x: -10 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="z-30"
              >
                <button
                  type="button"
                  onClick={onRoll}
                  disabled={!canRollNow}
                  className="relative flex items-center justify-center p-1 rounded-2xl bg-slate-900/90 border border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 transition"
                >
                  <LudoDice value={dice} rolling={rolling} active={canRollNow} size={42} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Seat 2: Yellow Player */}
        <div className="relative flex items-center gap-2 flex-row-reverse">
          <PlayerCard
            player={players[2]}
            color={LUDO_COLORS[2]}
            isActive={state.turn === 2}
          />
          {/* Active 5D Dice Attached to Seat 2 */}
          <AnimatePresence>
            {state.turn === 2 && (
              <motion.div
                initial={{ scale: 0, opacity: 0, x: 10 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="z-30"
              >
                <button
                  type="button"
                  onClick={onRoll}
                  disabled={!canRollNow}
                  className="relative flex items-center justify-center p-1 rounded-2xl bg-slate-900/90 border border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 transition"
                >
                  <LudoDice value={dice} rolling={rolling} active={canRollNow} size={42} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Players Row (Seat 0 Red BL - Local User & Seat 1 Blue BR) */}
      <div className="flex items-center justify-between px-2 mt-2">
        {/* Seat 0: Red Local Player (You) */}
        <div className="relative flex items-center gap-2">
          <PlayerCard
            player={players[0]}
            color={LUDO_COLORS[0]}
            isActive={state.turn === 0}
            isUser
          />
          {/* Active 5D Dice Attached to Seat 0 */}
          <AnimatePresence>
            {state.turn === 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0, x: -10 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="z-30"
              >
                <button
                  type="button"
                  onClick={onRoll}
                  disabled={!canRollNow}
                  className="relative flex items-center justify-center p-1.5 rounded-2xl bg-slate-900/95 border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)] active:scale-95 transition"
                >
                  <LudoDice value={dice} rolling={rolling} active={canRollNow} size={46} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Seat 1: Blue Player */}
        <div className="relative flex items-center gap-2 flex-row-reverse">
          <PlayerCard
            player={players[1]}
            color={LUDO_COLORS[1]}
            isActive={state.turn === 1}
          />
          {/* Active 5D Dice Attached to Seat 1 */}
          <AnimatePresence>
            {state.turn === 1 && (
              <motion.div
                initial={{ scale: 0, opacity: 0, x: 10 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="z-30"
              >
                <button
                  type="button"
                  onClick={onRoll}
                  disabled={!canRollNow}
                  className="relative flex items-center justify-center p-1.5 rounded-2xl bg-slate-900/95 border-2 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.6)] active:scale-95 transition"
                >
                  <LudoDice value={dice} rolling={rolling} active={canRollNow} size={42} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

function PlayerCard({
  player,
  color,
  isActive,
  isUser,
}: {
  player: any;
  color: string;
  isActive: boolean;
  isUser?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 border transition-all ${
        isActive
          ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.4)] scale-105"
          : "border-white/10 opacity-80"
      }`}
    >
      <div
        className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs"
        style={{ borderColor: color, background: ${color}33 }}
      >
        {player?.name?.[0] ?? "P"}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-black text-white truncate max-w-[80px]">
          {isUser ? "You" : player?.name ?? "Player"}
        </span>
        <span className="text-[10px] text-amber-300 font-semibold">
          Lv.{player?.level ?? 1}
        </span>
      </div>
    </div>
  );
}