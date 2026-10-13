"use client";
import Link from "next/link";
import { ArrowLeft, Coins } from "lucide-react";
import { LocalGameRunner } from "@/components/game/LocalGameRunner";
import { useGameWallet } from "@/components/game/useGameWallet";
import type { CatalogGame } from "@/lib/game/catalog";

export function GameScreen({ game }: { game: CatalogGame }) {
  const { balance, applyDelta } = useGameWallet();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <div className="flex items-center gap-3">
        <Link href="/games" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-black text-white">{game.title}</h1>
          <p className="text-xs text-white/60">{game.tagline}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-sm font-extrabold text-amber-300">
          <Coins className="h-4 w-4" />{balance.toLocaleString("en-US")}
        </div>
      </div>
      <div className="mt-4 rounded-3xl border border-white/10 p-3" style={{ background: `linear-gradient(160deg, ${game.accent}33, #0f172a)` }}>
        <LocalGameRunner engine={game.engine} onWin={(n) => applyDelta(n)} onLose={(n) => applyDelta(-n)} />
      </div>
      <p className="mt-3 text-center text-[11px] text-white/50">Stake coins to play. Winnings are added to your Supabase game wallet.</p>
    </div>
  );
}
