"use client";
import Link from "next/link";
import { Flame, Gamepad2, Lock, Sparkles } from "lucide-react";
import { Avatar } from "@/components/app/Avatar";
import type { CatalogGame } from "@/lib/game/catalog";

/** A recent winner shown in the laurel frame on each banner. */
export interface WinnerRef {
  name: string;
  src: string | null;
}

/** Golden laurel wreath framing the winner avatar (decorative SVG). */
function Laurels() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="gc-laurel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="45%" stopColor="#F6D365" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#gc-laurel)" strokeWidth="3" strokeLinecap="round">
        <path d="M22 78 C10 62 12 40 28 26" />
        <path d="M20 66 l-9 -3" />
        <path d="M16 54 l-9 -2" />
        <path d="M15 42 l-8 0" />
        <path d="M18 33 l-7 3" />
        <path d="M78 78 C90 62 88 40 72 26" />
        <path d="M80 66 l9 -3" />
        <path d="M84 54 l9 -2" />
        <path d="M85 42 l8 0" />
        <path d="M82 33 l7 3" />
      </g>
      <g fill="url(#gc-laurel)" opacity="0.9">
        <ellipse cx="13" cy="63" rx="5" ry="2.6" transform="rotate(-30 13 63)" />
        <ellipse cx="9" cy="52" rx="5" ry="2.6" transform="rotate(-20 9 52)" />
        <ellipse cx="10" cy="41" rx="5" ry="2.6" transform="rotate(0 10 41)" />
        <ellipse cx="87" cy="63" rx="5" ry="2.6" transform="rotate(30 87 63)" />
        <ellipse cx="91" cy="52" rx="5" ry="2.6" transform="rotate(20 91 52)" />
        <ellipse cx="90" cy="41" rx="5" ry="2.6" transform="rotate(0 90 41)" />
      </g>
    </svg>
  );
}

/**
 * GameCard — a large, commercial gradient banner for a single catalog game.
 * Unlocked games link to their local runner; locked games render a translucent
 * dark mask with a lock and the "Unlocks when you reach game level X" note.
 */
export function GameCard({
  g,
  unlocked,
  winner,
}: {
  g: CatalogGame;
  unlocked: boolean;
  winner: WinnerRef | null;
}) {
  const body = (
    <div
      className={`relative overflow-hidden rounded-3xl border shadow-[0_12px_40px_rgba(0,0,0,0.55)] transition-transform duration-200 ${
        unlocked ? "hover:scale-[1.01] active:scale-[0.99]" : "cursor-not-allowed"
      }`}
      style={{
        background: `linear-gradient(115deg, ${g.accent} 0%, #1a1230 58%, #0b0e22 100%)`,
        borderColor: unlocked ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-40 blur-2xl"
        style={{ background: `${g.accent}66` }}
      />

      <div className={`relative flex items-center gap-4 p-4 ${unlocked ? "" : "grayscale-[0.35]"}`}>
        {/* Winner avatar frame with golden laurels */}
        <div className="relative h-20 w-20 shrink-0">
          <Laurels />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {winner ? (
              <span className="block h-12 w-12 overflow-hidden rounded-full ring-2 ring-amber-300/70">
                <Avatar name={winner.name} src={winner.src} size="sm" className="h-12 w-12" />
              </span>
            ) : (
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white ring-2 ring-amber-300/70"
                style={{ background: `linear-gradient(135deg, ${g.accent}, #0b0b18)` }}
              >
                {g.emoji}
              </span>
            )}
          </div>
        </div>

        {/* Title + tagline */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-black tracking-tight text-white drop-shadow">{g.title}</p>
          <p className="truncate text-xs font-medium text-white/70">{g.tagline}</p>
          {unlocked ? (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-white to-slate-200 px-3.5 py-1 text-[11px] font-black tracking-wide text-black shadow transition group-hover:from-amber-200 group-hover:to-amber-400">
              <Gamepad2 className="h-3.5 w-3.5" aria-hidden /> PLAY NOW
            </span>
          ) : (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/70">
              <Lock className="h-3 w-3" aria-hidden /> Level {g.levelRequired} required
            </span>
          )}
        </div>

        <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/80">
          {g.category}
        </span>

        {/* Hot / New glowing pill — bottom-right */}
        {g.badge ? (
          <span
            className={`absolute bottom-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_0_16px_rgba(249,115,22,0.8)] ${
              g.badge === "New"
                ? "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_16px_rgba(16,185,129,0.8)]"
                : "bg-gradient-to-r from-orange-500 to-red-600"
            }`}
          >
            {g.badge === "New" ? <Sparkles className="h-3 w-3" aria-hidden /> : <Flame className="h-3 w-3" aria-hidden />}
            {g.badge}
          </span>
        ) : null}
      </div>

      {/* Locked overlay */}
      {!unlocked ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/65 backdrop-blur-[2px]">
          <p className="flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-4 py-2 text-xs font-bold text-white shadow-lg">
            <Lock className="h-3.5 w-3.5 text-amber-300" aria-hidden />
            Unlocks when you reach game level {g.levelRequired}
          </p>
        </div>
      ) : null}
    </div>
  );

  if (!unlocked) return body;
  return (
    <Link href={`/games/${g.id}`} className="group block" aria-label={`Play ${g.title}`}>
      {body}
    </Link>
  );
}
