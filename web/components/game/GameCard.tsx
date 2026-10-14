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

/**
 * Per-game immersive banner artwork. Because the referenced image files in the
 * catalog are not always present, we synthesize a rich "photographic / 3D"
 * backdrop from layered radial gradients keyed on each game's identity, then
 * drop a large glowing subject glyph on top. This keeps every card visually
 * premium without any broken image assets.
 */
const ART_BY_ID: Record<string, { bg: string; subject: string }> = {
  "poker-ace": {
    bg: "radial-gradient(120% 130% at 22% 8%, #2563eb 0%, #1e3a8a 38%, #0a1230 78%), linear-gradient(120deg,#020617,#0b1436)",
    subject: "♠",
  },
  "gates-of-olympus": {
    bg: "radial-gradient(120% 130% at 82% 12%, #a855f7 0%, #6d28d9 38%, #1c0b3a 78%), linear-gradient(120deg,#0b0616,#1a0b33)",
    subject: "⚡",
  },
  "football-champion": {
    bg: "radial-gradient(120% 130% at 18% 12%, #22c55e 0%, #15803d 40%, #062412 80%), linear-gradient(120deg,#02140a,#06301b)",
    subject: "⚽",
  },
  "sphinx-magic": {
    bg: "radial-gradient(120% 130% at 78% 18%, #f59e0b 0%, #b45309 42%, #2a1602 82%), linear-gradient(120deg,#1a0e02,#33200a)",
    subject: "🏺",
  },
  "fortune-gems": {
    bg: "radial-gradient(120% 130% at 20% 88%, #d946ef 0%, #a21caf 40%, #2b0533 80%), linear-gradient(120deg,#12021a,#2a0533)",
    subject: "💎",
  },
  "wealthy-tiger": {
    bg: "radial-gradient(130% 130% at 80% 20%, #fb923c 0%, #ea580c 40%, #2a1002 82%), linear-gradient(120deg,#1a0a02,#2e1204)",
    subject: "🐅",
  },
  "world-goal": {
    bg: "radial-gradient(120% 130% at 20% 18%, #06b6d4 0%, #0e7490 42%, #04222b 82%), linear-gradient(120deg,#02161c,#053440)",
    subject: "🏆",
  },
  "ludo-superstar": {
    bg: "radial-gradient(120% 130% at 80% 16%, #f43f5e 0%, #be123c 42%, #33060f 84%), linear-gradient(120deg,#150208,#3a0a17)",
    subject: "🎲",
  },
  "whot-classic": {
    bg: "radial-gradient(120% 130% at 22% 16%, #10b981 0%, #047857 42%, #032019 84%), linear-gradient(120deg,#02120c,#043024)",
    subject: "🃏",
  },
  "fortune-tiger": {
    bg: "radial-gradient(120% 130% at 78% 20%, #fbbf24 0%, #d97706 42%, #2a1702 84%), linear-gradient(120deg,#170d02,#31200a)",
    subject: "🐯",
  },
  "dragon-vs-tiger": {
    bg: "radial-gradient(120% 130% at 20% 18%, #ef4444 0%, #b91c1c 42%, #2a0606 84%), linear-gradient(120deg,#150202,#320808)",
    subject: "🐉",
  },
  "mines": {
    bg: "radial-gradient(120% 130% at 82% 16%, #3b82f6 0%, #1d4ed8 42%, #061033 84%), linear-gradient(120deg,#020617,#0a1636)",
    subject: "💣",
  },
  "fishing-star": {
    bg: "radial-gradient(120% 130% at 22% 18%, #38bdf8 0%, #0284c7 42%, #052436 84%), linear-gradient(120deg,#02121c,#053544)",
    subject: "🎣",
  },
};

function gameArt(g: CatalogGame): { bg: string; subject: string } {
  return (
    ART_BY_ID[g.id] ?? {
      bg: `radial-gradient(120% 130% at 20% 15%, ${g.accent} 0%, ${g.accent}55 42%, #0b0e22 84%), linear-gradient(120deg,#050716,#0b0e22)`,
      subject: g.emoji,
    }
  );
}

/** Golden laurel wreath framing the winner avatar (decorative SVG). */
function Laurels() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
      <defs>
        <linearGradient id="gc-laurel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF3C4" />
          <stop offset="45%" stopColor="#F6D365" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#gc-laurel)" strokeWidth="3.5" strokeLinecap="round">
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

/** Ornate crown placed above the winner avatar (decorative SVG). */
function Crown() {
  return (
    <svg viewBox="0 0 40 26" aria-hidden className="absolute -top-3 left-1/2 h-5 w-8 -translate-x-1/2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
      <defs>
        <linearGradient id="gc-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF0B0" />
          <stop offset="60%" stopColor="#F6D365" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>
      <path
        d="M4 22 L8 8 L14 15 L20 5 L26 15 L32 8 L36 22 Z"
        fill="url(#gc-crown)"
        stroke="#8a5a06"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="3.5" r="2" fill="#fff3c4" stroke="#8a5a06" strokeWidth="0.8" />
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
  const art = gameArt(g);
  const body = (
    <div
      className={`relative block h-40 w-full overflow-hidden rounded-3xl border shadow-[0_16px_48px_rgba(0,0,0,0.6)] transition-transform duration-200 sm:h-44 ${
        unlocked ? "hover:scale-[1.01] active:scale-[0.99]" : "cursor-not-allowed"
      }`}
      style={{
        background: art.bg,
        borderColor: unlocked ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
      }}
    >
      {/* large glowing "3D" subject glyph, bleeding off the right edge */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 select-none text-[8rem] leading-none opacity-90 drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)] sm:text-[9rem] ${
          unlocked ? "" : "grayscale-[0.4]"
        }`}
      >
        {art.subject}
      </span>

      {/* cinematic vignette + light sweep for depth */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_15%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />

      {/* content layer */}
      <div className="relative flex h-full items-center gap-4 p-4">
        {/* Winner avatar frame with golden laurels + crown */}
        <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
          <Laurels />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {winner ? (
              <span className="relative block h-12 w-12 overflow-hidden rounded-full ring-2 ring-amber-300/80 sm:h-14 sm:w-14">
                <Avatar name={winner.name} src={winner.src} size="sm" className="h-12 w-12 sm:h-14 sm:w-14" />
                <Crown />
              </span>
            ) : (
              <span
                className="relative flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white ring-2 ring-amber-300/80 sm:h-14 sm:w-14"
                style={{ background: `linear-gradient(135deg, ${g.accent}, #0b0b18)` }}
              >
                {g.emoji}
                <Crown />
              </span>
            )}
          </div>
        </div>

        {/* Title + tagline + CTA */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{g.title}</p>
          <p className="truncate text-xs font-medium text-white/75">{g.tagline}</p>
          {unlocked ? (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-white to-slate-200 px-3.5 py-1 text-[11px] font-black tracking-wide text-black shadow transition group-hover:from-amber-200 group-hover:to-amber-400">
              <Gamepad2 className="h-3.5 w-3.5" aria-hidden /> PLAY NOW
            </span>
          ) : (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-bold text-white/80">
              <Lock className="h-3 w-3" aria-hidden /> Level {g.levelRequired} required
            </span>
          )}
        </div>

        {/* category chip */}
        <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85">
          {g.category}
        </span>

        {/* Hot / New floating glowing pill — bottom-right */}
        {g.badge ? (
          <span
            className={`absolute bottom-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white ${
              g.badge === "New"
                ? "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.9),0_0_8px_rgba(16,185,129,0.7)]"
                : "bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_0_20px_rgba(249,115,22,0.9),0_0_8px_rgba(249,115,22,0.7)]"
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
