"use client";
import { SEATS } from "@/lib/whot/bots";
import type { WhotGameState } from "@/lib/whot/engine";

/**
 * WhotPods — the three opponent seats around the radial table.
 *
 * Seat 1 (Tunde) sits left with a green glowing ring, seat 2 (David) tops
 * the table with the active "Your Turn" pill when his hand moves, and seat
 * 3 (Bella) anchors the right with a red ring. Each pod shows the avatar
 * ring, name · flag · level, a fan of face-down cards plus a count chip,
 * and the call-ribbon when that seat has declared WHOT.
 */

const POS: Record<number, string> = {
  1: "left-1 top-[30%]",   // Tunde · left
  2: "left-1/2 top-0 -translate-x-1/2", // David · top
  3: "right-1 top-[30%]",  // Bella · right
};

function Pod({
  seat,
  state,
  active,
  statusSuffix,
  reaction,
}: {
  seat: number;
  state: WhotGameState;
  active: boolean;
  statusSuffix: string | null;
  reaction: string | null;
}) {
  const p = SEATS[seat]!;
  const handN = state.players[seat]?.hand.length ?? 0;
  const called = state.players[seat]?.called ?? false;
  const fan = Math.min(handN, 6);

  return (
    <div data-seat={seat} className={`absolute z-20 flex w-28 flex-col items-center ${POS[seat]}`}>
      <div className="relative">
        {/* Active-seat rim glow (time dimension — breathes while thinking) */}
        {active ? (
          <span
            aria-hidden
            className="absolute -inset-1.5 animate-pulse rounded-full opacity-70 blur-[6px]"
            style={{ background: `radial-gradient(circle, ${p.ring}88 0%, transparent 70%)` }}
          />
        ) : null}

        <div
          className="relative grid h-12 w-12 place-items-center rounded-full border-[2.5px] bg-slate-800/90 font-black text-white shadow-lg"
          style={{ borderColor: p.ring, boxShadow: active ? `0 0 16px ${p.ring}cc` : `0 0 6px ${p.ring}55` }}
        >
          {p.initials}
        </div>

        {reaction ? (
          <span className="absolute -right-2 -top-2 animate-bounce text-lg drop-shadow">{reaction}</span>
        ) : null}

        {called ? (
          <span className="absolute -left-3 top-0 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-1.5 py-[1px] text-[8px] font-black uppercase tracking-wide text-amber-950 shadow">
            WHOT!
          </span>
        ) : null}
      </div>

      <span className="mt-1 max-w-full truncate text-[11px] font-black text-white drop-shadow">{p.name}</span>
      <span className="text-[9px] font-bold text-white/60">
        {p.flag} Lv.{p.level}
      </span>

      {/* Card-count chip */}
      <span className="mt-1 rounded-full bg-black/55 px-2 py-[2px] text-[9px] font-black text-white/90 ring-1 ring-white/15">
        🃏 {handN}
      </span>

      {/* Face-down mini fan under the avatar */}
      <div className="pointer-events-none mt-1 flex h-5 items-end justify-center">
        {Array.from({ length: fan }).map((_, i) => (
          <span
            key={i}
            className="h-4 w-3 rounded-[2px] border border-amber-500/40 bg-gradient-to-b from-slate-700 to-slate-900 shadow"
            style={{ marginLeft: i === 0 ? 0 : -8, transform: `rotate(${(i - (fan - 1) / 2) * 9}deg)` }}
          />
        ))}
      </div>

      {active ? (
        <span
          className="mt-1 animate-pulse rounded-full px-2 py-[2px] text-[9px] font-black uppercase tracking-wide shadow-lg"
          style={{ background: `linear-gradient(90deg, ${p.ring}, ${p.ring}cc)`, color: "#0f172a" }}
        >
          {statusSuffix ?? "Your Turn"}
        </span>
      ) : null}
    </div>
  );
}

export function WhotPods({
  state,
  turn,
  thinking,
  reactions,
}: {
  state: WhotGameState;
  turn: number;
  /** `${name} ${thinkSuffix}` while a bot is deciding. */
  thinking: string | null;
  /** Seat → reaction emoji thrown after a big play. */
  reactions: Record<number, string | null>;
}) {
  return (
    <>
      {[1, 2, 3].map((seat) => (
        <Pod
          key={seat}
          seat={seat}
          state={state}
          active={turn === seat && state.winner === null}
          statusSuffix={turn === seat && seat !== 0 && thinking ? thinking : null}
          reaction={reactions[seat] ?? null}
        />
      ))}
    </>
  );
}