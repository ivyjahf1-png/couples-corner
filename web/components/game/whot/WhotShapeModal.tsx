"use client";
import { Crown } from "lucide-react";
import { SHAPE_COLOR, SHAPE_LABEL, SHAPE_ORDER, type ShapeCall } from "@/lib/whot/engine";
import { haptic, whotCall } from "@/lib/whot/sensory";

/**
 * WhotShapeModal — the wild-card moment. Playing WHOT 20 opens this picker
 * so the caller chooses the new active shape. Confirms with the crown
 * fanfare + a WHOT haptic triple-pulse.
 */
export function WhotShapeModal({ onPick }: { onPick: (shape: ShapeCall) => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-3xl border border-amber-400/40 bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-center shadow-2xl">
        <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 shadow-[0_0_20px_rgba(245,158,11,.6)]">
          <Crown className="h-6 w-6 fill-white text-white" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-widest text-amber-300">Whot! Call a shape</h3>
        <p className="mb-4 text-[11px] font-semibold text-white/55">Every player must follow the shape you pick.</p>

        <div className="grid grid-cols-2 gap-2">
          {SHAPE_ORDER.map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => {
                haptic("call");
                whotCall();
                onPick(shape);
              }}
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-left transition hover:border-amber-300/60 hover:bg-white/10 active:scale-95"
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                style={{ background: `${SHAPE_COLOR[shape]}22`, border: `2px solid ${SHAPE_COLOR[shape]}` }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: SHAPE_COLOR[shape] }} />
              </span>
              <span className="text-sm font-black text-white">{SHAPE_LABEL[shape]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}