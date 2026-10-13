"use client";
import Link from "next/link";
import { Gamepad2, Lock } from "lucide-react";
import type { CatalogGame } from "@/lib/game/catalog";

export function GameBanner({ g, open }: { g: CatalogGame; open: boolean }) {
  if (!open) {
    return (
      <li className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-slate-700 to-slate-950">
        <div className="flex items-center gap-4 p-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/50 text-2xl font-black text-white/70">{g.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-black text-white/80">{g.title}</span>
            <span className="block truncate text-xs text-white/60">{g.tagline}</span>
          </span>
          <Lock className="h-6 w-6 text-white/60" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
          <p className="rounded-full bg-black/70 px-4 py-1.5 text-xs font-bold text-white">Unlocks when you reach game level {g.levelRequired}</p>
        </div>
      </li>
    );
  }
  return (
    <li>
      <Link href={`/games/${g.id}`} className="block overflow-hidden rounded-3xl border border-white/10" style={{ background: `linear-gradient(120deg, ${g.accent} 0%, #141031 72%)` }}>
        <div className="flex items-center gap-4 p-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/40 text-2xl font-black text-white">{g.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-lg font-black text-white">{g.title}</span>
              {g.badge ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">{g.badge}</span> : null}
            </span>
            <span className="block truncate text-xs text-white/75">{g.tagline} · {g.category}</span>
            <span className="mt-1.5 inline-block rounded-full bg-white px-3 py-1 text-[11px] font-black text-black">PLAY NOW</span>
          </span>
          <Gamepad2 className="h-8 w-8 text-white/70" />
        </div>
      </Link>
    </li>
  );
}
