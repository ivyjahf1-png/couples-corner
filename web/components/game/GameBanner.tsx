"use client";
import Link from "next/link";
import { Gamepad2, Lock } from "lucide-react";
import type { CatalogGame } from "@/lib/game/catalog";

export function GameBanner({ g, open }: { g: CatalogGame; open: boolean }) {
  if (!open) {
    return (
      <li className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#3b3550] via-[#232136] to-[#101326] shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-4 p-4 opacity-80 grayscale-[0.4]">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-inner"
            style={{ background: `linear-gradient(135deg, ${g.accent}, #0b0b18)` }}
          >
            {g.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-black tracking-tight text-white/85">{g.title}</span>
            <span className="block truncate text-xs text-white/55">{g.tagline} · {g.category}</span>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/70">
              <Lock className="h-3.5 w-3.5" /> Level {g.levelRequired} required
            </span>
          </span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px]">
          <p className="rounded-full border border-white/15 bg-black/70 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
            🔒 Unlocks when you reach game level {g.levelRequired}
          </p>
        </div>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={`/games/${g.id}`}
        className="group block overflow-hidden rounded-3xl border border-white/10 shadow-[0_10px_36px_rgba(0,0,0,0.5),0_0_24px_-8px_var(--glow)] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
        style={{ background: `linear-gradient(115deg, ${g.accent} 0%, #1a1230 62%, #0b0e22 100%)`, ["--glow" as string]: `${g.accent}66` }}
      >
        <div className="flex items-center gap-4 p-4">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/40 text-2xl font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
          >
            {g.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-lg font-black tracking-tight text-white drop-shadow">{g.title}</span>
              {g.badge ? (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow ${
                    g.badge === "New" ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  {g.badge}
                </span>
              ) : null}
            </span>
            <span className="block truncate text-xs text-white/75">{g.tagline} · {g.category}</span>
            <span className="mt-1.5 inline-block rounded-full bg-white px-3.5 py-1 text-[11px] font-black tracking-wide text-black shadow transition group-hover:bg-amber-300">
              PLAY NOW
            </span>
          </span>
          <Gamepad2 className="h-8 w-8 shrink-0 text-white/70" />
        </div>
      </Link>
    </li>
  );
}

