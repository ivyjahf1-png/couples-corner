"use client";
import { Hand, SkipForward, Star } from "lucide-react";

/**
 * WhotControls — the bottom action bar, thumb-reach optimised.
 *
 * Orange "Play Card" fires the selected card · blue star "Call WHOT"
 * declares at one card (it pulses gold while a declaration is pending) ·
 * dark "Pass" sends you to market (absorbing any Pick pile).
 */
export function WhotControls({
  myTurn,
  hasSelection,
  canPlaySelection,
  mustDeclare,
  pendingPick,
  busy,
  onPlay,
  onCall,
  onPass,
}: {
  myTurn: boolean;
  hasSelection: boolean;
  canPlaySelection: boolean;
  /** One card left and not yet declared. */
  mustDeclare: boolean;
  /** Pick-pile owed (Pass becomes "Take N"). */
  pendingPick: number;
  busy: boolean;
  onPlay: () => void;
  onCall: () => void;
  onPass: () => void;
}) {
  const playEnabled = myTurn && !busy && hasSelection && canPlaySelection && !mustDeclare;
  const callEnabled = myTurn && !busy && mustDeclare;
  const passEnabled = myTurn && !busy;

  return (
    <div className="flex items-stretch gap-2 px-1 pb-1">
      <button
        type="button"
        onClick={onPlay}
        disabled={!playEnabled}
        aria-label="Play selected card"
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-black uppercase tracking-wide shadow-lg transition active:scale-95 ${
          playEnabled
            ? "bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-orange-600/40 hover:from-orange-300 hover:to-orange-500"
            : "cursor-not-allowed bg-white/8 text-white/30"
        }`}
      >
        <Hand className="h-4 w-4" /> Play Card
      </button>

      <button
        type="button"
        onClick={onCall}
        disabled={!callEnabled}
        aria-label="Call WHOT"
        className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-black uppercase tracking-wide shadow-lg transition active:scale-95 ${
          callEnabled
            ? "animate-pulse bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-blue-500/50 hover:from-sky-300 hover:to-blue-500"
            : "cursor-not-allowed bg-white/8 text-white/30"
        }`}
      >
        <Star className="h-4 w-4 fill-current" /> Call Whot
        {mustDeclare ? (
          <span className="absolute -top-2 right-1 rounded-full bg-amber-400 px-1.5 py-[1px] text-[9px] font-black text-amber-950 shadow">
            NOW
          </span>
        ) : null}
      </button>

      <button
        type="button"
        onClick={onPass}
        disabled={!passEnabled}
        aria-label={pendingPick > 0 ? `Take ${pendingPick} cards` : "Pass to market"}
        className={`flex flex-[0.8] items-center justify-center gap-1.5 rounded-2xl border border-white/15 py-3 text-sm font-black uppercase tracking-wide shadow-lg transition active:scale-95 ${
          passEnabled ? "bg-slate-800/95 text-white hover:bg-slate-700/95" : "cursor-not-allowed bg-white/8 text-white/30"
        }`}
      >
        <SkipForward className="h-4 w-4" /> {pendingPick > 0 ? `Take ${pendingPick}` : "Pass"}
      </button>
    </div>
  );
}