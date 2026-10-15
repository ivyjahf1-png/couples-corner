"use client";
import { useState } from "react";
import { MoreHorizontal, RotateCcw, Settings, Volume2, VolumeX, X, LogOut, Smartphone } from "lucide-react";

/**
 * WhotTopBar — in-game ACTION CLUSTER (deliberately NOT a header any more).
 *
 * This bar used to be a full second header: its own back arrow plus the
 * crowned "WHOT 4 PLAYERS" title sat directly under GameScreen's single
 * Back · title · coins bar — stacked chrome rows and two back buttons on one
 * screen. The HEADER CLEANUP removed the back button and the title block:
 * `GameScreen` owns the only header on the game viewport now. What remains is
 * the table's control cluster, right-aligned above the felt: audio toggle,
 * settings gear and the ⋯ menu (restart / leave).
 *
 * Settings popover = sound switch + motion (gyro tilt) opt-in + house rules;
 * ⋯ menu = restart / leave. A fixed transparent scrim closes either popover.
 */
const RULES = [
  "🃏 Match the top card's number or the called shape.",
  "1️⃣ Hold On — play again after a 1.",
  "2️⃣3️⃣ Pick Two / Three — stack them or absorb the pile.",
  "8️⃣ Miss a turn · 14 General Market — everyone draws.",
  "👑 WHOT (20) picks the new shape. Call WHOT at one card!",
] as const;

export function WhotTopBar({
  soundOn,
  motionOn,
  onToggleSound,
  onToggleMotion,
  onRestart,
  onLeave,
}: {
  soundOn: boolean;
  motionOn: boolean;
  onToggleSound: () => void;
  onToggleMotion: () => void;
  onRestart: () => void;
  onLeave: () => void;
}) {
  const [open, setOpen] = useState<null | "settings" | "menu">(null);

  return (
    <div className="relative z-40 flex items-center justify-end gap-1.5">
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSound}
          aria-label={soundOn ? "Mute sound" : "Unmute sound"}
          aria-pressed={!soundOn}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-md transition hover:bg-white/15 active:scale-95"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-white/50" />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => (v === "settings" ? null : "settings"))}
          aria-label="Settings and house rules"
          className={`grid h-9 w-9 place-items-center rounded-full border bg-white/8 backdrop-blur-md transition hover:bg-white/15 active:scale-95 ${
            open === "settings" ? "border-amber-300/60 text-amber-300" : "border-white/12 text-white"
          }`}
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => (v === "menu" ? null : "menu"))}
          aria-label="Match menu"
          className={`grid h-9 w-9 place-items-center rounded-full border bg-white/8 backdrop-blur-md transition hover:bg-white/15 active:scale-95 ${
            open === "menu" ? "border-amber-300/60 text-amber-300" : "border-white/12 text-white"
          }`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-[60] cursor-default"
        />
      ) : null}
      {open === "settings" ? (
        <div className="absolute right-0 top-11 z-[70] w-64 rounded-2xl border border-white/15 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-white/60">Table settings</span>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close settings">
              <X className="h-4 w-4 text-white/50" />
            </button>
          </div>
          <ul className="space-y-1.5 text-[11px] font-semibold leading-relaxed text-white/75">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-2.5 py-2">
              <span className="text-xs font-bold text-white/80">Sound effects</span>
              <button
                type="button"
                onClick={onToggleSound}
                role="switch"
                aria-checked={soundOn}
                aria-label="Toggle sound effects"
                className={`relative h-5 w-9 rounded-full transition ${soundOn ? "bg-amber-500" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${soundOn ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-2.5 py-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white/80">
                <Smartphone className="h-3.5 w-3.5" /> Motion tilt
              </span>
              <button
                type="button"
                onClick={onToggleMotion}
                role="switch"
                aria-checked={motionOn}
                aria-label="Toggle motion tilt"
                className={`relative h-5 w-9 rounded-full transition ${motionOn ? "bg-amber-500" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${motionOn ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open === "menu" ? (
        <div className="absolute right-0 top-11 z-[70] w-48 rounded-2xl border border-white/15 bg-slate-900/95 p-1.5 text-white shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => { setOpen(null); onRestart(); }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4 text-amber-300" /> Restart match
          </button>
          <button
            type="button"
            onClick={() => { setOpen(null); onLeave(); }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 text-rose-400" /> Leave table
          </button>
        </div>
      ) : null}
    </div>
  );
}