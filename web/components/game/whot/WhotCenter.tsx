"use client";
import { SHAPE_COLOR, SHAPE_LABEL, type WhotGameState } from "@/lib/whot/engine";
import { SEATS } from "@/lib/whot/bots";
import { WhotCardBack, WhotCardFace } from "./WhotCard";

/**
 * WhotCenter — the felt middle of the table.
 *
 * Left: a 3D-tilted stack of deck cards with the live counter badge
 * ("Deck 28"). Right: the discard pile showing the active top card with a
 * soft glow. Between/below: the "Last Played" side indicator box
 * ("5 · Tunde — 4 cards left") and the active shape-call ribbon.
 */
export function WhotCenter({
  state,
  discardRef,
}: {
  state: WhotGameState;
  /** Ref target so the orchestrator can fly cards into the discard rect. */
  discardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const top = state.discard[state.discard.length - 1]!;
  const last = state.lastPlay;
  const lastSeat = last && last.seat >= 0 ? SEATS[last.seat] : null;

  return (
    <div className="absolute left-1/2 top-[46%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4">
      {/* Deck stack */}
      <div className="relative" style={{ perspective: 420 }}>
        <div style={{ transform: "rotateX(14deg) rotateZ(-6deg)" }} className="relative">
          {[2, 1, 0].map((i) => (
            <div key={i} className={i === 0 ? "" : "absolute inset-0"} style={{ transform: i ? `translate(${i * -2}px, ${i * -3}px)` : undefined }}>
              <WhotCardBack size="md" />
            </div>
          ))}
        </div>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-400/40 bg-black/70 px-2 py-[2px] text-[10px] font-black text-amber-200 shadow backdrop-blur-sm">
          Deck {state.market.length}
        </span>
      </div>

      {/* Discard pile — the active card */}
      <div ref={discardRef} className="relative" style={{ perspective: 420 }}>
        <div
          className="rounded-xl"
          style={{
            transform: "rotateX(10deg) rotateZ(4deg)",
            filter: "drop-shadow(0 10px 14px rgba(0,0,0,.55))",
          }}
        >
          <WhotCardFace card={top} size="md" glow />
        </div>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-2 py-[2px] text-[10px] font-black uppercase tracking-wide text-white/85 shadow backdrop-blur-sm">
          {top.shape === "whot" ? "WHOT 20" : `${top.value} ${SHAPE_LABEL[top.shape]}`}
        </span>
      </div>

      {/* Last-played side indicator */}
      <div className="absolute -right-2 top-full mt-4 w-max rounded-xl border border-white/15 bg-black/55 px-2.5 py-1.5 text-center shadow-lg backdrop-blur-sm">
        <span className="block text-[9px] font-black uppercase tracking-widest text-white/50">Last played</span>
        <span className="block text-[11px] font-black text-white">
          {last && last.seat >= 0 ? (
            <>
              <span style={{ color: SHAPE_COLOR[last.card.shape] }}>
                {last.card.shape === "whot" ? "WHOT" : last.card.value}
              </span>
              {" · "}
              {lastSeat?.name ?? "Table"} — {state.players[last.seat]?.hand.length ?? 0} cards left
            </>
          ) : (
            "—"
          )}
        </span>
      </div>
    </div>
  );
}