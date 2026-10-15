"use client";
import { useMemo } from "react";
import { ArrowDownUp, MessageCircle } from "lucide-react";
import { sortHand, type WhotCard, type WhotGameState } from "@/lib/whot/engine";
import { WhotCardFace } from "./WhotCard";

/**
 * WhotHand — the hero of the screen: a high-visibility, large-type fan of
 * the player's cards with generous overlap. Tap to select (the card lifts
 * with a golden glow); illegal cards dim when it isn't your turn. The
 * parent passes a pointer-driven tilt so the whole fan parallaxes in 3D.
 *
 * Flanking controls: "Sort" (left) re-orders by value/shape, "Chat" (right)
 * opens the quick emoji tray.
 */
const CHAT_EMOJIS = ["😂", "😤", "🙏", "🔥", "😅", "👏"] as const;

export function WhotHand({
  state,
  tilt,
  selected,
  sortMode,
  chatOpen,
  reaction,
  onSelect,
  onSort,
  onToggleChat,
  onSendEmoji,
}: {
  state: WhotGameState;
  /** CSS transform string for the 3D parallax tilt of the whole fan. */
  tilt: string;
  selected: string | null;
  sortMode: "value" | "shape";
  chatOpen: boolean;
  /** Floating emoji bubble above the hand. */
  reaction: string | null;
  onSelect: (cardId: string) => void;
  onSort: () => void;
  onToggleChat: () => void;
  onSendEmoji: (emoji: string) => void;
}) {
  const myTurn = state.turn === 0 && state.winner === null;
  const hand = state.players[0]?.hand ?? [];
  const cards = useMemo(() => (sortMode === "value" ? sortHand(hand) : hand), [hand, sortMode]);

  const n = cards.length;
  const spread = Math.min(15, 64 / Math.max(n, 1)); // deg between neighbours

  return (
    <div className="relative z-30 mt-1 select-none" style={{ transform: tilt, transformStyle: "preserve-3d" }}>
      {reaction ? (
        <span className="absolute -top-9 left-1/2 z-40 -translate-x-1/2 animate-bounce text-2xl drop-shadow-lg">
          {reaction}
        </span>
      ) : null}

      {chatOpen ? (
        <div className="absolute -top-14 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-2xl border border-white/15 bg-slate-900/95 px-2 py-1.5 shadow-xl backdrop-blur-md">
          {CHAT_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onSendEmoji(e)}
              className="rounded-lg px-1.5 py-1 text-lg transition hover:bg-white/10 active:scale-90"
              aria-label={`Send ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end justify-between px-1">
        <button
          type="button"
          onClick={onSort}
          aria-label="Sort hand"
          className="mb-3 flex h-9 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-md transition hover:bg-white/15 active:scale-95"
        >
          <ArrowDownUp className="h-4 w-4 text-amber-300" /> Sort
        </button>

        {/* The fan */}
        <div className="relative flex h-[104px] items-end justify-center" style={{ perspective: 700 }}>
          {cards.map((c: WhotCard, i) => {
            const isSel = selected === c.id;
            const rot = (i - (n - 1) / 2) * spread;
            const off = (i - (n - 1) / 2) * 10;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                disabled={!myTurn}
                aria-pressed={isSel}
                aria-label={`Card ${c.value} ${c.shape}`}
                data-card={c.id}
                className="absolute bottom-0 transition-[transform,filter] duration-200 focus:outline-none"
                style={{
                  transform: `translateX(${off}px) translateY(${isSel ? -18 : -Math.abs(rot) * 0.16}px) rotate(${rot}deg) rotateX(${isSel ? -8 : 0}deg)`,
                  zIndex: isSel ? 40 : 10 + i,
                  filter: myTurn && !isSel ? "drop-shadow(0 6px 8px rgba(0,0,0,.55))" : undefined,
                }}
              >
                <WhotCardFace card={c} size="lg" dimmed={!myTurn} glow={isSel} />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onToggleChat}
          aria-label="Quick chat"
          className={`mb-3 flex h-9 items-center gap-1 rounded-xl border px-2.5 text-[10px] font-black uppercase tracking-wide backdrop-blur-md transition active:scale-95 ${
            chatOpen ? "border-amber-300/60 bg-amber-500/25 text-amber-100" : "border-white/15 bg-white/10 text-white hover:bg-white/15"
          }`}
        >
          <MessageCircle className="h-4 w-4" /> Chat
        </button>
      </div>
    </div>
  );
}