"use client";
import { motion } from "framer-motion";
import { BETS } from "@/lib/ludo/match";

const GLASS = "rounded-3xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,.45)]";

export function BettingLobby({ balance, bet, setBet, onConfirm }: { balance: number; bet: number; setBet: (b: number) => void; onConfirm: () => void }) {
  return (
    <div className={`${GLASS} bg-gradient-to-b from-[#2b1245]/80 to-[#101a3a]/80`}>
      <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Betting Lobby</p>
      <p className="mt-1 bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-2xl font-black text-transparent">Ludo Superstar</p>
      <p className="mt-1 text-xs text-white/60">Balance: {balance.toLocaleString()} coins · Winner takes the pot</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {BETS.map((b) => (
          <button key={b} type="button" onClick={() => setBet(b)}
            className={`rounded-2xl border px-4 py-3 text-sm font-black backdrop-blur-md transition ${
              bet === b
                ? "border-amber-300/70 bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_18px_rgba(251,191,36,.6)]"
                : "border-white/10 bg-white/5 text-white"
            }`}>
            {b.toLocaleString()} 🪙
          </button>
        ))}
      </div>
      <button type="button" onClick={onConfirm} disabled={balance < bet}
        className="mt-4 w-full rounded-full bg-gradient-to-b from-brand-400 to-brand-600 py-3 text-sm font-black text-white shadow-[0_6px_20px_rgba(249,115,22,.55)] ring-1 ring-white/20 disabled:opacity-40">
        {balance < bet ? "Not enough coins" : `Find Match · ${bet.toLocaleString()} coins`}
      </button>
    </div>
  );
}

export function Matchmaking({ bet, onCancel }: { bet: number; onCancel: () => void }) {
  return (
    <div className={`${GLASS} bg-[#141031]/80`}>
      <motion.div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-3xl"
        animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        🎲
      </motion.div>
      <p className="mt-3 text-lg font-black text-white">Finding opponents…</p>
      <p className="text-xs text-white/60">Bet {bet.toLocaleString()} coins · 4 players</p>
      <div className="mx-auto mt-4 h-2 w-40 overflow-hidden rounded-full bg-white/10">
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

export function WinScreen({ winnerName, pot, onClaim }: { winnerName: string; pot: number; onClaim: () => void }) {
  return (
    <div className="rounded-3xl border border-amber-300/40 bg-gradient-to-b from-amber-500/30 to-[#141031]/80 p-8 text-center backdrop-blur-xl shadow-[0_10px_50px_rgba(251,191,36,.35)]">
      <motion.div
        className="mx-auto flex h-24 w-24 items-center justify-center text-6xl"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: [0, 1.25, 1], rotate: [0, 10, 0], y: [0, -8, 0] }}
        transition={{ duration: 0.9, times: [0, 0.5, 1], ease: "easeOut" }}
      >
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 6px 14px rgba(251,191,36,.7))" }}
        >
          🏆
        </motion.span>
      </motion.div>
      <motion.p
        className="mt-2 bg-gradient-to-b from-amber-100 to-amber-400 bg-clip-text text-3xl font-black text-transparent"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        You Win!
      </motion.p>
      <p className="text-sm font-bold text-amber-300">{winnerName} takes {pot.toLocaleString()} coins</p>
      <button type="button" onClick={onClaim} className="mt-5 w-full rounded-full bg-gradient-to-b from-amber-300 to-amber-500 py-3 text-sm font-black text-black shadow-[0_6px_20px_rgba(251,191,36,.6)]">Claim {pot.toLocaleString()} Coins</button>
    </div>
  );
}
