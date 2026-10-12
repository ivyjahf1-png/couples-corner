import type { Metadata } from "next";

import { ArcadeGrid } from "@/components/game/ArcadeGrid";
import { listGames } from "@/lib/game/catalog";

/**
 * THE ARCADE — `/games`, the browsable Game Center.
 *
 * A Server Component. It resolves the whole catalog once, from the single
 * allow-listed module, and hands the already-validated entries to the client
 * grid. No entry's URL is ever read or re-derived from request input here: the
 * parameter-less route has nothing to spoof, and the grid only ever navigates
 * to `/games/<id>`, where the detail route looks the URL back up by id.
 *
 * ── WHY THIS ROUTE EXISTS AT ALL ────────────────────────────────────────────
 * `/games/[gameId]` already serves the individual runner, but nothing linked to
 * it as a catalogue — the profile's "Recommended Games" chevron went to
 * `/store`, and the old modal-only Game Center had no browsable shelf. This is
 * that shelf: all 28 games, filterable by category and searchable, each tile
 * opening its dedicated embed route.
 *
 * ── INSIDE `(app)` ──────────────────────────────────────────────────────────
 * Like the detail page, it lives in the authenticated group so `AppLayout`
 * gates it on a session and supplies the shell nav. A top-level `app/games`
 * would render unauthenticated.
 *
 * `metadata` is a `title` only: the grid is fully interactive, so there is no
 * server-rendered body to describe, and the catalog count is not something the
 * head should try to summarise.
 */

export const metadata: Metadata = {
  title: "Game Center — Arcade",
};

export default function GamesPage() {
  const games = listGames();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-white">Game Center</h1>
        <p className="mt-1 text-sm text-slate-400">
          {games.length} games to play together. Pick one to open the runner.
        </p>
      </header>

      <ArcadeGrid games={[...games]} />
    </div>
  );
}
