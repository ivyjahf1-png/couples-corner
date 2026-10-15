"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/app/Avatar";
import { LudoHub } from "../LudoHub";
import { SEED_STYLES, type SeedStyleId } from "@/lib/game/seedStyles";

export type LudoMode = "classic" | "power";
export type PlayerCount = 2 | 4;
export type SeedColor = 0 | 1 | 2 | 3;

const GLASS = "rounded-3xl border border-cyan-500/20 bg-slate-950/80 p-5 text-center backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,.6)]";

// Demo opponents for the "Opponent Found" VS screen.
const OPPONENTS: Array<{ name: string; src: string | null; flag: string; streak: number }> = [
  { name: "Kwame", src: null, flag: "🇬🇭", streak: 7 },
  { name: "Amina", src: null, flag: "🇳🇬", streak: 12 },
];

export function BettingLobby({
  balance,
  bet,
  setBet,
  players,
  setPlayers,
  mode,
  setMode,
  seed,
  setSeed,
  seedStyle,
  setSeedStyle,
  onConfirm,
}: {
  balance: number;
  bet: number;
  setBet: (b: number) => void;
  players: PlayerCount;
  setPlayers: (p: PlayerCount) => void;
  mode: LudoMode;
  setMode: (m: LudoMode) => void;
  seed: SeedColor;
  setSeed: (s: SeedColor) => void;
  seedStyle: SeedStyleId;
  setSeedStyle: (s: SeedStyleId) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* 4D/5D Ludo Hub Matrix */}
      <LudoHub
        onStartMatch={(selectedMode, selectedBet, selectedPlayers) => {
          setBet(selectedBet);
          setPlayers(selectedPlayers as PlayerCount);
          setMode(selectedMode === "aero" ? "power" : "classic");
          onConfirm();
        }}
      />
    </div>
  );
}

/** A single player column in the VS screen. */
function VsCard({
  name,
  src,
  flag,
  streak,
  side,
  you,
}: {
  name: string;
  src: string | null;
  flag: string;
  streak: number;
  side: "left" | "right";
  you?: boolean;
}) {
  const glow = you
    ? "shadow-[0_0_30px_rgba(6,182,212,.4)] border-cyan-400/60 bg-cyan-950/30"
    : "shadow-[0_0_30px_rgba(244,114,182,.4)] border-rose-400/60 bg-rose-950/30";

  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-3.5 backdrop-blur-md ${glow}`}
    >
      <div className="relative">
        <Avatar name={name} src={src} size="lg" className="ring-2 ring-amber-300/70" />
        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-base ring-1 ring-white/20">
          {flag}
        </span>
      </div>
      <p className="text-sm font-black text-white">{you ? "You" : name}</p>
      <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
        🔥 {streak} win{streak === 1 ? "" : "s"}
      </span>
    </motion.div>
  );
}

export function Matchmaking({ bet, onCancel }: { bet: number; onCancel: () => void }) {
  return (
    <div className={`${GLASS} bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950`}>
      <motion.p
        className="bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-2xl font-black text-transparent tracking-wide"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
      >
        Opponent Found!
      </motion.p>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <VsCard name="You" src={null} flag="🇳🇬" streak={5} side="left" you />
        <motion.div
          className="text-2xl font-black text-cyan-400 italic"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          VS
        </motion.div>
        <VsCard {...OPPONENTS[0]!} side="right" />
      </div>

      <p className="mt-5 text-xs font-bold text-cyan-200/80">
        4D Match Bet: <span className="text-amber-300">{bet.toLocaleString()} coins</span> · Winner takes pot
      </p>

      <div className="mx-auto mt-3 h-2 w-48 overflow-hidden rounded-full bg-slate-800 border border-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "60%" }}
        />
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="mt-5 text-xs font-black tracking-widest text-slate-400 hover:text-white transition"
      >
        CANCEL MATCHMAKING
      </button>
    </div>
  );
}

export function WinScreen({
  winnerName,
  pot,
  onClaim,
  onRematch,
}: {
  winnerName: string;
  pot: number;
  onClaim: () => void;
  onRematch: () => void;
}) {
  return (
    <div className="rounded-3xl border-2 border-amber-400/40 bg-gradient-to-b from-amber-500/20 via-slate-950 to-black p-8 text-center backdrop-blur-2xl shadow-[0_10px_60px_rgba(251,191,36,.3)]">
      {/* 5D Golden Trophy Drop */}
      <div className="relative mx-auto h-28 w-28" style={{ perspective: "600px" }}>
        <motion.div
          className="h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
          initial={{ scale: 0, rotateY: 0 }}
          animate={{ scale: [0, 1.25, 1], rotateY: 360, y: [0, -8, 0] }}
          transition={{ duration: 1.6, times: [0, 0.4, 1], ease: "easeOut" }}
        >
          <div
            className="flex h-full w-full items-center justify-center text-6xl"
            style={{ filter: "drop-shadow(0 10px 20px rgba(251,191,36,.8))" }}
          >
            🏆
          </div>
        </motion.div>
      </div>

      <motion.p
        className="mt-3 bg-gradient-to-b from-amber-100 to-amber-400 bg-clip-text text-3xl font-black text-transparent tracking-wide"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        VICTORY!
      </motion.p>
      
      <p className="text-sm font-bold text-amber-300">
        {winnerName} claims the {pot.toLocaleString()} coin pot!
      </p>

      {/* 4D Reward Drop Card */}
      <motion.div
        className="mt-5 inline-flex flex-col items-center gap-1 rounded-2xl border border-amber-400/30 bg-slate-900/90 px-6 py-3.5 shadow-xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 16 }}
      >
        <motion.span
          className="text-4xl"
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          🎁
        </motion.span>
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">4D Chest Reward</p>
        <p className="text-sm font-black text-white">+{(pot * 0.1).toLocaleString()} bonus coins</p>
      </motion.div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClaim}
          className="flex-1 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 py-3.5 text-xs font-black text-slate-950 shadow-[0_0_25px_rgba(251,191,36,.5)] transition active:scale-95"
        >
          CLAIM {pot.toLocaleString()} COINS
        </button>
        <button
          type="button"
          onClick={onRematch}
          className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-xs font-black text-white backdrop-blur-md transition active:scale-95 hover:bg-white/20"
        >
          REMATCH
        </button>
      </div>
    </div>
  );
}