"use client";
import { BETS } from "@/lib/ludo/match";

export function BettingLobby({ balance, bet, setBet, onConfirm }: { balance: number; bet: number; setBet: (b: number) => void; onConfirm: () => void }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#2b1245] to-[#101a3a] p-5 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Betting Lobby</p>
      <p className="mt-1 text-2xl font-black text-white">Ludo Superstar</p>
      <p className="mt-1 text-xs text-white/60">Balance: {balance.toLocaleString()} coins · Winner takes the pot</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {BETS.map((b) => (
          <button key={b} type="button" onClick={() => setBet(b)}
            className={`rounded-2xl border px-4 py-3 text-sm font-black ${bet === b ? "border-amber-300 bg-amber-400 text-black" : "border-white/15 bg-white/5 text-white"}`}>
            {b.toLocaleString()} 🪙
          </button>
        ))}
      </div>
      <button type="button" onClick={onConfirm} disabled={balance < bet}
        className="mt-4 w-full rounded-full bg-emerald-400 py-3 text-sm font-black text-black disabled:opacity-40">
        {balance < bet ? "Not enough coins" : `Find Match · ${bet.toLocaleString()} coins`}
      </button>
    </div>
  );
}

export function Matchmaking({ bet, onCancel }: { bet: number; onCancel: () => void }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#141031] p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-3xl">🎲</div>
      <p className="mt-3 text-lg font-black text-white">Finding opponents…</p>
      <p className="text-xs text-white/60">Bet {bet.toLocaleString()} coins · 4 players</p>
      <div className="mx-auto mt-4 h-2 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400" />
      </div>
      <button type="button" onClick={onCancel} className="mt-4 text-xs font-bold text-white/60">Cancel</button>
    </div>
  );
}

export function WinScreen({ winnerName, pot, onClaim }: { winnerName: string; pot: number; onClaim: () => void }) {
  return (
    <div className="rounded-3xl border border-amber-300/40 bg-gradient-to-b from-amber-500/30 to-[#141031] p-8 text-center">
      <p className="text-6xl">🏆</p>
      <p className="mt-2 text-2xl font-black text-white">You Win!</p>
      <p className="text-sm font-bold text-amber-300">{winnerName} takes {pot.toLocaleString()} coins</p>
      <button type="button" onClick={onClaim} className="mt-5 w-full rounded-full bg-amber-400 py-3 text-sm font-black text-black">Claim {pot.toLocaleString()} Coins</button>
    </div>
  );
}
