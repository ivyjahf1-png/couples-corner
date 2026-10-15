"use client";
import Link from "next/link";
import { ArrowLeft, Coins } from "lucide-react";
import { LocalGameRunner } from "@/components/game/LocalGameRunner";
import { useGameWallet } from "@/components/game/useGameWallet";
import type { CatalogGame } from "@/lib/game/catalog";

/**
 * GameScreen — THE game viewport container, and the ONLY header on it.
 *
 * HEADER STACK, BEFORE: on phones every `/games/<id>` route stacked up to
 * three chrome rows — the root-mounted `MobileBackHeader` ("Couples Corner" +
 * "Home"), this container's own back/title/coins row, and, inside the engines,
 * each game's own top bar (LudoTopBar / WhotTopBar) carrying a SECOND back
 * arrow and title. That is the "double header / double back button" bug.
 *
 * NOW: `MobileBackHeader` suppresses itself on the `games` segment (see that
 * component), and the engine top bars keep only their right-aligned action
 * cluster — no back button, no duplicate title. This bar is the single header
 * on every game screen:
 *
 *   LEFT   back arrow → /games (the Game Center hub)
 *   CENTER the catalog game title
 *   RIGHT  wallet coin balance
 *
 * VIEWPORT FIT: the column below the header is `flex-1 min-h-0` inside
 * `AppMain`, which already reserves the fixed bottom tab bar's height
 * (`pb-28`), so the game region ends exactly where the dock begins — no page
 * scroll, no overlap with `app-bottom-nav`. The region itself is the only
 * scrollable area (`overflow-y-auto`), used solely if an engine renders
 * taller than the space it was given; the PAGE can never scroll here.
 */
export function GameScreen({ game }: { game: CatalogGame }) {
  const { balance, applyDelta } = useGameWallet();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The one and only game header. Safe-area inset on top because this route
          no longer has the root-mounted MobileBackHeader above it to consume
          the notch. */}
      <header className="relative z-30 flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <Link
          href="/games"
          aria-label="Back to Game Center"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {/* Absolutely centred so the title stays on the same x regardless of the
            side elements' widths; bounded + truncated so a long catalog title can
            never run under the coins pill on a narrow phone. */}
        <h1 className="pointer-events-none absolute inset-x-0 mx-auto max-w-[55%] truncate text-center text-sm font-black uppercase tracking-[0.14em] text-white">
          {game.title}
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-sm font-extrabold text-amber-300">
          <Coins className="h-4 w-4" />
          {balance.toLocaleString("en-US")}
        </div>
      </header>

      {/* The game fills EVERYTHING the header leaves. The accent gradient keeps
          the old framed-card look, now edge to edge. `min-h-full` + centered
          content: short games centre in the space; tall ones grow and scroll
          inside this region only. */}
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
        style={{ background: `linear-gradient(160deg, ${game.accent}33, #0f172a)` }}
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center p-3">
          <LocalGameRunner engine={game.engine} balance={balance} onWin={(n) => applyDelta(n)} onLose={(n) => applyDelta(-n)} />
        </div>
      </div>
    </div>
  );
}
