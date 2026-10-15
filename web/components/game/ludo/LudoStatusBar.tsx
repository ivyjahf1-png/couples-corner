"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, Smile } from "lucide-react";

/**
 * LudoStatusBar — the glass strip under the board: emoji quick-reaction tray
 * (left), live status line with a pulsing dot while bots are thinking (centre),
 * and the current pot (right). Floating reaction emojis drift up and fade.
 */
const EMOJIS = ["😂", "😡", "👏", "😍", "🍀", "🔥", "👍", "😭"] as const;

export interface EmojiBurst {
  id: number;
  emoji: string;
}

export function LudoStatusBar({
  status,
  thinking,
  pot,
  bursts,
  onReact,
}: {
  status: string;
  thinking: boolean;
  pot: number;
  bursts: ReadonlyArray<EmojiBurst>;
  onReact: (emoji: string) => void;
}) {
  const [tray, setTray] = useState(false);

  return (
    <div className="relative mt-3">
      {/* Floating reactions */}
      <div className="pointer-events-none absolute inset-x-0 -top-2 z-40 h-16">
        <AnimatePresence>
          {bursts.map((b) => (
            <motion.span
              key={b.id}
              className="absolute bottom-0 text-2xl drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]"
              style={{ left: `${14 + ((b.id * 19) % 70)}%` }}
              initial={{ y: 0, opacity: 0, scale: 0.6 }}
              animate={{ y: -64, opacity: [0, 1, 1, 0], scale: [0.6, 1.3, 1.15, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, times: [0, 0.16, 0.6, 1] }}
            >
              {b.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Emoji tray */}
      <AnimatePresence>
        {tray ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full z-30 mb-2 flex w-full gap-1 rounded-2xl border border-white/12 bg-slate-900/95 p-2 shadow-xl backdrop-blur-xl"
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onReact(e);
                  setTray(false);
                }}
                aria-label={`React ${e}`}
                className="grid h-9 flex-1 place-items-center rounded-xl text-lg transition hover:bg-white/10 active:scale-90"
              >
                {e}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-2.5 py-2 backdrop-blur-md">
        <button
          type="button"
          aria-label="Send an emoji"
          aria-expanded={tray}
          onClick={() => setTray((v) => !v)}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition active:scale-95 ${
            tray
              ? "border-amber-300/70 bg-amber-400/15 text-amber-300"
              : "border-white/12 bg-white/8 text-white/80 hover:bg-white/15"
          }`}
        >
          <Smile className="h-4 w-4" />
        </button>

        <p className="min-w-0 flex-1 truncate text-center text-[11px] font-black text-white/85 sm:text-xs">
          {thinking ? (
            <motion.span
              className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-300 align-middle"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
            />
          ) : null}
          {status}
        </p>

        <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] font-black text-amber-300">
          <Coins className="h-3 w-3" />
          {pot.toLocaleString("en-US")}
        </span>
      </div>
    </div>
  );
}