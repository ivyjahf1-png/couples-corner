"use client";
import { LUDO_COLORS, type LudoColor, type LudoGameState } from "@/lib/ludo/engine";
import { SEATS } from "@/lib/ludo/bots";
import { TURN_SECONDS } from "@/lib/ludo/match";

/**
 * LudoPods — the four glassmorphism player pods pinned to the corners of the
 * board (TL David-style layout from the reference: avatar + online dot, name +
 * flag, Lv badge, home count). The active seat's pod glows amber and shows the
 * depleting turn-timer ring around its avatar.
 *
 * Seat → corner mapping matches the engine quadrants:
 *   3 Green TL · 2 Yellow TR · 0 Red BL · 1 Blue BR.
 */
type Corner = "tl" | "tr" | "bl" | "br";

const CORNER: Record<number, Corner> = { 3: "tl", 2: "tr", 0: "bl", 1: "br" };
const CORNER_CLASS: Record<Corner, string> = {
  tl: "left-0 top-0",
  tr: "right-0 top-0",
  bl: "bottom-0 left-0",
  br: "bottom-0 right-0",
};

/** r=15.5 in the 42×42 ring viewBox. */
const RING_CIRC = 2 * Math.PI * 15.5;

export function LudoPods({
  state,
  mode,
  activeSeat,
  clock,
}: {
  state: LudoGameState;
  mode: "pass" | "cpu";
  activeSeat: LudoColor;
  clock: number;
}) {
  const frac = Math.max(0, Math.min(1, clock / TURN_SECONDS));

  return (
    <>
      {([0, 1, 2, 3] as const).map((seat) => {
        const profile = SEATS[seat];
        const active = activeSeat === seat && state.winner === null;
        const isYou = mode === "cpu" && seat === 0;
        const color = LUDO_COLORS[seat]!;
        const home = state.players[seat]!.finished;
        return (
          <div
            key={seat}
            className={`absolute z-30 w-[44%] max-w-[188px] ${CORNER_CLASS[CORNER[seat]!]}`}
            data-active={active}
          >
            <div
              className={`flex items-center gap-2 rounded-2xl border px-2 py-1.5 backdrop-blur-md transition ${
                active
                  ? "border-amber-300/70 bg-amber-500/12 shadow-[0_0_20px_rgba(251,191,36,.35)]"
                  : "border-white/12 bg-white/8"
              }`}
            >
              <div className="relative h-9 w-9 shrink-0">
                <svg
                  viewBox="0 0 42 42"
                  className="absolute inset-0 h-full w-full -rotate-90"
                  aria-hidden
                >
                  <circle cx="21" cy="21" r="15.5" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" />
                  {active ? (
                    <circle
                      cx="21"
                      cy="21"
                      r="15.5"
                      fill="none"
                      stroke="#FDE68A"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRC}
                      strokeDashoffset={(1 - frac) * RING_CIRC}
                      style={{ transition: "stroke-dashoffset .95s linear" }}
                    />
                  ) : null}
                </svg>
                <span
                  className="absolute inset-[6px] grid place-items-center rounded-full text-[10px] font-black text-white ring-1 ring-white/50"
                  style={{
                    background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.85), ${color} 62%, rgba(0,0,0,.6) 140%)`,
                    boxShadow: "0 3px 6px rgba(0,0,0,.5), inset 0 -2px 3px rgba(0,0,0,.35)",
                  }}
                >
                  {profile.initials}
                </span>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black/50" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black leading-tight text-white">
                  {isYou ? "You" : profile.name} <span className="text-[10px]">{profile.flag}</span>
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-1.5 text-[8px] font-black leading-4 text-black">
                    Lv.{profile.level}
                  </span>
                  {isYou ? (
                    <span className="rounded-full bg-sky-500/85 px-1.5 text-[8px] font-black leading-4 text-white">
                      YOU
                    </span>
                  ) : null}
                  {home > 0 ? (
                    <span className="rounded-full bg-black/45 px-1.5 text-[8px] font-black leading-4 text-emerald-300">
                      🏠×{home}
                    </span>
                  ) : null}
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}