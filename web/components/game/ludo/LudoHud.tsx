"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LudoDice } from "./LudoDice";
import { LUDO_COLORS, type LudoGameState, type LudoColor } from "@/lib/ludo/engine";
import { SEATS } from "@/lib/ludo/bots";

interface LudoHudProps {
  state: LudoGameState;
  dice: number;
  rolling: boolean;
  canRollNow: boolean;
  onRoll: () => void;
  hubLabel: string;
  /** Optional per-seat display names from the lobby; index matches seat number. */
  names?: readonly string[];
}

/** Initials for a display name (custom friend names render the same way as
 *  the bot personas: first letters of up to two words, uppercase). */
function initialsOf(name: string): string {
  return (
    name
      .split(/[\s&]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "P"
  );
}

export const LudoHud: React.FC<LudoHudProps> = ({
  state,
  dice,
  rolling,
  canRollNow,
  onRoll,
  hubLabel,
  names,
}: LudoHudProps) => {
  const activeTurn = state.turn as LudoColor;

  /**
   * Seat display name. Seat 0 is always "You" (the device holder); seats 1-3
   * fall back to the bot persona name and can be renamed from the lobby.
   */
  const seatName = (seat: LudoColor): string => {
    if (seat === 0) return "You";
    return names?.[seat] ?? SEATS[seat].name;
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
          color={LUDO_COLORS[3]}
          name={seatName(3)}
          level={SEATS[3].level}
          isActive={activeTurn === 3}
          dice={dice}
          rolling={rolling}
          canRollNow={canRollNow}
          onRoll={onRoll}
          align="left"
        />

        <PlayerSeatCard
          color={LUDO_COLORS[2]}
          name={seatName(2)}
          level={SEATS[2].level}
          isActive={activeTurn === 2}
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
          color={LUDO_COLORS[0]}
          name={seatName(0)}
          level={SEATS[0].level}
          isActive={activeTurn === 0}
          dice={dice}
          rolling={rolling}
          canRollNow={canRollNow}
          onRoll={onRoll}
          align="left"
          isUser
        />

        <PlayerSeatCard
          color={LUDO_COLORS[1]}
          name={seatName(1)}
          level={SEATS[1].level}
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
  color,
  name,
  level,
  isActive,
  dice,
  rolling,
  canRollNow,
  onRoll,
  align,
  isUser,
}: {
  color: string;
  name: string;
  /** Seat level shown under the player name. */
  level: number;
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
          {initialsOf(name)}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black text-white truncate max-w-[70px]">
            {isUser ? "You" : name}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: color }}>
            Lv.{level}
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