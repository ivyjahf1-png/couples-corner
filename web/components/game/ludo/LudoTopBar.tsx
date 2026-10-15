"use client";
import { useState } from "react";
import { MoreHorizontal, RotateCcw, Settings, Volume2, VolumeX, X, LogOut } from "lucide-react";

/**
 * LudoTopBar — in-game ACTION CLUSTER (deliberately NOT a header any more).
 *
 * This bar used to be a full second header: its own back arrow plus the
 * "Couples Corner · 4 Players · 3D Ludo" title sat directly under GameScreen's
 * single Back · title · coins bar — stacked chrome rows and two back buttons
 * on one screen. The HEADER CLEANUP removed the back button and the title
 * block: `GameScreen` owns the only header on the game viewport now. What
 * remains is the game's control cluster, right-aligned above the board:
 * audio toggle, house-rules settings and the ⋯ menu (restart / leave).
 *
 * Settings popover = house rules + sound switch; ⋯ menu = restart / leave.
 * A fixed transparent scrim closes either popover.
 */
const RULES = [
  "🎲 Roll a 6 to leave your base.",
  "🎁 A 6, a capture or a home run earns another roll.",
  "⭐ Star tiles are safe — no captures there.",
  "🏁 Exact roll needed to finish · 3 sixes forfeit the turn.",
] as const;

export function LudoTopBar({
  soundOn,
  onToggleSound,
  onRestart,
  onLeave,
}: {
  soundOn: boolean;
  onToggleSound: () => void;
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
            <span className="text-xs font-black uppercase tracking-wider text-white/60">House rules</span>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close rules">
              <X className="h-4 w-4 text-white/50" />
            </button>
          </div>
          <ul className="space-y-1.5 text-[11px] font-semibold leading-relaxed text-white/75">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 px-2.5 py-2">
            <span className="text-xs font-bold text-white/80">Sound effects</span>
            <button
              type="button"
              onClick={onToggleSound}
              role="switch"
              aria-checked={soundOn}
              aria-label="Toggle sound effects"
              className={`relative h-6 w-11 rounded-full transition ${soundOn ? "bg-emerald-500" : "bg-white/20"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  soundOn ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      ) : null}
            {open === "menu" ? (
        <div className="absolute right-0 top-11 z-[70] w-44 overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 text-white shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(null);
              onRestart();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4 text-amber-300" /> Restart match
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(null);
              onLeave();
            }}
            className="flex w-full items-center gap-2.5 border-t border-white/10 px-3 py-2.5 text-xs font-bold transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 text-rose-400" /> Leave match
          </button>
        </div>
      ) : null}
    </div>
  );
}