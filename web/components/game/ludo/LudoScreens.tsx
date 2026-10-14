"use client";
import { motion } from "framer-motion";
import { Avatar } from "@/components/app/Avatar";
import { BETS } from "@/lib/ludo/match";
import { SEED_STYLES, type SeedStyleId } from "@/lib/game/seedStyles";

export type LudoMode = "classic" | "power";
export type PlayerCount = 2 | 4;
/** Index into the engine's color palette (0 Red, 1 Blue, 2 Green, 3 Yellow). */
export type SeedColor = 0 | 1 | 2 | 3;

const SEED_COLORS: Array<{ v: SeedColor; label: string; hex: string }> = [
  { v: 0, label: "Red", hex: "#E11D48" },
  { v: 1, label: "Blue", hex: "#2563EB" },
  { v: 2, label: "Green", hex: "#16A34A" },
  { v: 3, label: "Yellow", hex: "#F59E0B" },
];

const GLASS = "rounded-3xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,.45)]";

// Demo opponents for the "Opponent Found" VS screen.
const OPPONENTS: Array<{ name: string; src: string | null; flag: string; streak: number }> = [
  { name: "Kwame", src: null, flag: "🇬🇭", streak: 7 },
  { name: "Amina", src: null, flag: "🇳🇬", streak: 12 },
];

function SegToggle<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ v: T; label: string; sub?: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((o) => {
          const on = value === o.v;
          return (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => onChange(o.v)}
              className={`rounded-2xl border px-3 py-2.5 text-sm font-black backdrop-blur-md transition active:scale-95 ${
                on
                  ? "border-amber-300/70 bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_18px_rgba(251,191,36,.6)]"
                  : "border-white/10 bg-white/5 text-white/80"
              }`}
            >
              {o.label}
              {o.sub ? <span className="ml-1 text-[10px] font-bold opacity-70">{o.sub}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className={`${GLASS} bg-gradient-to-b from-[#2b1245]/80 to-[#101a3a]/80`}>
      <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Betting Lobby</p>
      <p className="mt-1 bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-2xl font-black text-transparent">Couple&rsquo;s ⭐ Ludo</p>
      <p className="mt-1 text-xs text-white/60">Balance: {balance.toLocaleString()} coins · Winner takes the pot</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {BETS.map((b) => (
          <button key={b} type="button" onClick={() => setBet(b)}
            className={`rounded-2xl border px-4 py-3 text-sm font-black backdrop-blur-md transition active:scale-95 ${
              bet === b
                ? "border-amber-300/70 bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_18px_rgba(251,191,36,.6)]"
                : "border-white/10 bg-white/5 text-white"
            }`}>
            {b.toLocaleString()} 🪙
          </button>
        ))}
      </div>
      <SegToggle
        label="Players"
        value={players}
        onChange={setPlayers}
        options={[
          { v: 2, label: "2 Players", sub: "1v1" },
          { v: 4, label: "4 Players", sub: "team up" },
        ]}
      />
      <SegToggle
        label="Game Mode"
        value={mode}
        onChange={setMode}
        options={[
          { v: "classic", label: "Classic" },
          { v: "power", label: "Power", sub: "⚡Aero" },
        ]}
      />
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Pawn Color</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {SEED_COLORS.map((c) => {
            const on = seed === c.v;
            return (
              <button
                key={c.v}
                type="button"
                onClick={() => setSeed(c.v)}
                aria-pressed={on}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 transition active:scale-95 ${
                  on
                    ? "border-white/70 bg-white/15 shadow-[0_0_16px_rgba(255,255,255,0.35)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span
                  className="h-6 w-6 rounded-full ring-2 ring-white/70"
                  style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${c.hex} 60%, #00000066)` }}
                />
                <span className={`text-[11px] font-black ${on ? "text-white" : "text-white/70"}`}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seed Style selector — bold high-gloss pawn themes */}
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Seed Style</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SEED_STYLES.map((s) => {
            const on = seedStyle === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeedStyle(s.id)}
                aria-pressed={on}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 transition active:scale-95 ${
                  on
                    ? "border-white/70 bg-white/15 shadow-[0_0_16px_rgba(255,255,255,0.35)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span
                  className="relative flex h-8 w-8 items-center justify-center"
                  style={{ filter: on ? s.glow : "none" }}
                >
                  {/* glossy pawn preview */}
                  <span
                    className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full"
                    style={{ background: s.swatch, boxShadow: s.shadow }}
                  />
                  <span
                    className="absolute bottom-0 h-5 w-5"
                    style={{
                      background: s.swatch,
                      borderRadius: "48% 48% 50% 50% / 60% 60% 40% 40%",
                      boxShadow: s.shadow,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{ background: s.gloss, mixBlendMode: "screen", opacity: 0.6 }}
                  />
                </span>
                <span className={`text-[11px] font-black ${on ? "text-white" : "text-white/70"}`}>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" onClick={onConfirm} disabled={balance < bet}
        className="mt-5 w-full rounded-full bg-gradient-to-b from-brand-400 to-brand-600 py-3 text-sm font-black text-white shadow-[0_6px_20px_rgba(249,115,22,.55)] ring-1 ring-white/20 disabled:opacity-40">
        {balance < bet ? "Not enough coins" : `Find Match · ${bet.toLocaleString()} coins`}
      </button>
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
    ? "shadow-[0_0_24px_rgba(56,189,248,.55)] border-sky-300/60"
    : "shadow-[0_0_24px_rgba(244,114,182,.55)] border-rose-300/60";
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className={`flex flex-col items-center gap-2 rounded-2xl border bg-white/5 p-3 backdrop-blur-md ${glow}`}
    >
      <div className="relative">
        <Avatar name={name} src={src} size="lg" className="ring-2 ring-amber-300/70" />
        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-base ring-1 ring-white/20">{flag}</span>
      </div>
      <p className="text-sm font-black text-white">{you ? "You" : name}</p>
      <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-2 py-0.5 text-[10px] font-black text-white">
        🔥 {streak} win{streak === 1 ? "" : "s"}
      </span>
    </motion.div>
  );
}

export function Matchmaking({ bet, onCancel }: { bet: number; onCancel: () => void }) {
  return (
    <div className={`${GLASS} bg-[#141031]/80`}>
      <motion.p
        className="bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-2xl font-black text-transparent"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
      >
        Opponent Found!
      </motion.p>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <VsCard name="You" src={null} flag="🇬🇭" streak={5} side="left" you />
        <motion.div
          className="text-2xl font-black text-amber-300"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          VS
        </motion.div>
        <VsCard {...OPPONENTS[0]!} side="right" />
      </div>
      <p className="mt-4 text-xs text-white/60">Bet {bet.toLocaleString()} coins · Winner takes the pot</p>
      <div className="mx-auto mt-3 h-2 w-40 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-300 to-brand-500"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "60%" }}
        />
      </div>
      <button type="button" onClick={onCancel} className="mt-4 text-xs font-bold text-white/60">Cancel</button>
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
    <div className="rounded-3xl border border-amber-300/40 bg-gradient-to-b from-amber-500/30 to-[#141031]/80 p-8 text-center backdrop-blur-xl shadow-[0_10px_50px_rgba(251,191,36,.35)]">
      {/* Rotating 3D golden trophy */}
      <div className="relative mx-auto h-28 w-28" style={{ perspective: "600px" }}>
        <motion.div
          className="h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
          initial={{ scale: 0, rotateY: 0 }}
          animate={{ scale: [0, 1.25, 1], rotateY: 360, y: [0, -8, 0] }}
          transition={{ duration: 1.6, times: [0, 0.4, 1], ease: "easeOut" }}
        >
          <div className="flex h-full w-full items-center justify-center text-6xl" style={{ filter: "drop-shadow(0 8px 16px rgba(251,191,36,.7))" }}>
            🏆
          </div>
        </motion.div>
      </div>
      <motion.p
        className="mt-2 bg-gradient-to-b from-amber-100 to-amber-400 bg-clip-text text-3xl font-black text-transparent"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        You Win!
      </motion.p>
      <p className="text-sm font-bold text-amber-300">{winnerName} takes {pot.toLocaleString()} coins</p>

      {/* Chest reward drop */}
      <motion.div
        className="mt-4 inline-flex flex-col items-center gap-1 rounded-2xl border border-amber-300/40 bg-black/40 px-5 py-3"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 16 }}
      >
        <motion.span
          className="text-4xl"
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          🎁
        </motion.span>
        <p className="text-xs font-black text-amber-200">Chest Reward</p>
        <p className="text-sm font-black text-white">+{(pot * 0.1).toLocaleString()} bonus coins</p>
      </motion.div>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onClaim} className="flex-1 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 py-3 text-sm font-black text-black shadow-[0_6px_20px_rgba(251,191,36,.6)]">Claim {pot.toLocaleString()} Coins</button>
        <button type="button" onClick={onRematch} className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur-md active:scale-95">Rematch</button>
      </div>
    </div>
  );
}
