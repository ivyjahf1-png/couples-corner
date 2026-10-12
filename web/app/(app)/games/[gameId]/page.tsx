import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { GameRunner } from "@/components/game/GameRunner";
import { findCatalogGame, isSafeGameUrl, listGames } from "@/lib/game/catalog";

/**
 * THE GAME ROUTE — `/games/<gameId>`.
 *
 * A Server Component. It resolves the catalog entry, refuses anything that is not
 * in the catalogue, and hands the runner values that have already been checked.
 *
 * ── WHY `(app)` AND NOT A TOP-LEVEL `app/games` ───────────────────────────────
 * Route groups are a layout mechanism, not part of the URL: `app/(app)/games/
 * [gameId]/page.tsx` serves `/games/<gameId>`, exactly as asked. Putting it inside
 * the authenticated group means `AppLayout` gates it on a session and supplies the
 * shell's nav, and `MobileBackHeader` stays out of the way — a top-level file would
 * render unauthenticated AND get a second header stacked above this page's own bar.
 *
 * ── THE ID NEVER BECOMES AN ADDRESS ───────────────────────────────────────────
 * The path segment selects WHICH entry to read; the URL that reaches the iframe is
 * looked up out of `data/games.json` by that id and then re-validated. There is no
 * code path here where request input is treated as a URL, so the parameter cannot
 * steer the iframe at an arbitrary origin. `isSafeGameUrl` also runs on the way out
 * of the catalogue, so a future bad entry fails here rather than in every browser.
 *
 * ── UNKNOWN ID REDIRECTS, IT DOES NOT 404 ─────────────────────────────────────
 * `next.config.ts` used to carry a blanket `/games/:path*` → `/dashboard` redirect
 * to keep the legacy Game Center's old links alive (notably the task-center seed
 * row, `/games/couples-ludo-advance`). It was removed because it shadowed this new
 * route, and that behaviour moves here instead: an id absent from the catalogue is
 * a dead legacy link, so it is sent to the dashboard rather than rendered as an
 * error page. Only a genuinely unsafe catalog URL 404s, because that is a bug in
 * `data/games.json` and must never reach a member's browser.
 */

interface GamePageProps {
  params: Promise<{ gameId: string }>;
}

/**
 * Pre-resolve every id so `/games/nonsense` is a real 404 rather than a render-time
 * throw, and so the shell is never built for a path that cannot render.
 */
export function generateStaticParams() {
  return listGames().map((game) => ({ gameId: game.id }));
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { gameId } = await params;
  const game = findCatalogGame(gameId);
  return { title: game ? `${game.title} — Game Center` : "Game not found" };
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;
  const game = findCatalogGame(gameId);

  /* ── UNKNOWN ID: REDIRECT, DO NOT 404 ────────────────────────────────────────
     This is the legacy-link path. An id that is not in the catalogue is what
     `/games/couples-ludo-advance` — the task-center seed row — now resolves to,
     so it is sent to the dashboard, which is the behaviour the removed
     `next.config.ts` blanket redirect provided. */
  if (!game) {
    redirect("/dashboard");
  }

  /* ── KNOWN ID, UNSAFE URL: 404 ───────────────────────────────────────────────
     Different failure, different response. The id is real but its catalog entry
     carries an address the allow-list refuses, which is a bug in
     `data/games.json` and must fail loudly here rather than reach a browser.
     Refusing outright also keeps the runner's contract: it only ever receives a
     URL that has been checked. */
  if (!isSafeGameUrl(game.iframeUrl)) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <GameRunner
        gameId={game.id}
        title={game.title}
        category={game.category}
        gameUrl={game.iframeUrl}
      />
    </div>
  );
}
