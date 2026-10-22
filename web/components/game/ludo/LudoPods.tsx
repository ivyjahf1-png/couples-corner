"use client";
import { LUDO_COLORS, type LudoColor, type LudoGameState } from "@/lib/ludo/engine";
import { SEATS } from "@/lib/ludo/bots";
import { TURN_SECONDS } from "@/lib/ludo/match";

type Corner = "tl" | "tr" | "bl" | "br";

const CORNER: Record<number, Corner> = { 3: "tl", 2: "tr", 0: "bl", 1: "br" };
const CORNER_CLASS: Record<Corner, string> = {
  tl: "left-2 top-2", // Added slight inset so it doesn't touch the absolute edge
  tr: "right-2 top-2",
  bl: "bottom-2 left-2",
  br: "bottom-2 right-2",
};

function initialsOf(name: string): string {
  return (
    name
      .split(/[\s&]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "P"
  );
}

const RING_CIRC = 2 * Math.PI * 15.5;

export function LudoPods({
  state,
  activeSeat,
  clock,
  photoUrls,
  activeSeats,
  names,
}: {
  state: LudoGameState;
  activeSeat: LudoColor;
  clock: number;
  photoUrls?: (string | null)[];
  activeSeats: readonly LudoColor[];
  names: string[];
}) {
  const frac = Math.max(0, Math.min(1, clock / TURN_SECONDS));

  return (
    <>
      {([0, 1, 2, 3] as const).map((seat) => {
        if (!activeSeats.includes(seat)) return null;
        const profile = SEATS[seat];
        const active = activeSeat === seat && state.winner === null;
        const isYou = seat === 0;
        const color = LUDO_COLORS[seat]!;
        const home = state.players[seat]!.finished;
        const name = names[seat] ?? profile.name;
        
        return (
          <div
            key={seat}
            // CHANGED: w-[calc(50%-8px)] ensures they can never overlap in the middle
            className={`absolute z-30 w-[calc(50%-8px)] max-w-[188px] ${CORNER_CLASS[CORNER[seat]!]}`}
            data-active={active}
          >
            <div
              // CHANGED: Added overflow-hidden to clip any long text/badges
              className={`flex items-center gap-2 rounded-2xl border px-2 py-1.5 backdrop-blur-md transition overflow-hidden ${
                active
                  ? "border-white/60 bg-white/6"
                  : "border-white/12 bg-white/8"
              }`}
              style={{ boxShadow: active ? `0 0 20px ${color}` : undefined }}
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
                      stroke={color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRC}
                      strokeDashoffset={(1 - frac) * RING_CIRC}
                      style={{ transition: "stroke-dashoffset .95s linear" }}
                    />
                  ) : null}
                </svg>
                <span
                  className="absolute inset-[6px] grid place-items-center overflow-hidden rounded-full text-[10px] font-black text-white ring-1 ring-white/50"
                  style={{
                    background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.85), ${color} 62%, rgba(0,0,0,.6) 140%)`,
                    boxShadow: "0 3px 6px rgba(0,0,0,.5), inset 0 -2px 3px rgba(0,0,0,.35)",
                  }}
                >
                  {photoUrls?.[seat] ? (
                    <img
                      src={photoUrls[seat]!}
                      alt={isYou ? "You" : name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{initialsOf(name)}</span>
                  )}
                </span>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black/50" />
              </div>

              {/* Added overflow-hidden here to ensure text truncation works perfectly */}
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-[11px] font-black leading-tight text-white">
                  {name} <span className="text-[10px]">{profile.flag}</span>
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-1.5 text-[8px] font-black leading-4 text-black">
                    Lv.{profile.level}
                  </span>
                  {isYou ? (
                    <span
                      className="rounded-full px-1.5 text-[8px] font-black leading-4 text-white"
                      style={{ background: color }}
                    >
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