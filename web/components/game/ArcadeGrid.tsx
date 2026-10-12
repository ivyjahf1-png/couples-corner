"use client";

/**
 * THE ARCADE GRID — the interactive half of `/games`.
 *
 * The route is a Server Component that resolves the whole catalog once and
 * passes the already-validated entries down. This component owns only what
 * needs a browser: the active category and the search query. It renders one
 * tile per game and each tile is a real `<Link>` to `/games/<id>`, where the
 * `[gameId]` route mounts the single working iframe.
 *
 * WHY NOT EMBED ALL 28 IFRAMES AT ONCE. A grid of 28 live third-party frames is
 * a performance and rate-limit disaster — dozens of parallel WebGL contexts,
 * hundreds of requests to GameDistribution on first paint, most of them
 * off-screen. The storefront pattern is the tile grid as the catalogue and one
 * frame at a time on the detail route, which is exactly what `/games/[gameId]`
 * already is. So the working iframe embeds live on the detail page; this page
 * links into them.
 *
 * WHY CATEGORY + QUERY FILTERING IS CLIENT-SIDE. The catalog is 28 static
 * entries shipped in the bundle; re-navigating to the server for each filter
 * tap would be a round trip to sort an array the client already holds. A
 * `useMemo` over the same list is instant and keeps the URL clean.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gamepad2, Search } from "lucide-react";

import type { CatalogGame } from "@/lib/game/catalog";

/** The `FOCUS` ring every interactive control in the app shell uses. */
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]";

/** Neutral tile colour when an entry has no `accent`. */
const DEFAULT_ACCENT = "#475569";

interface ArcadeGridProps {
  games: CatalogGame[];
}

export function ArcadeGrid({ games }: ArcadeGridProps) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  /** Distinct categories in authored order, "All" first. */
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const game of games) {
      if (game.category && !seen.includes(game.category)) seen.push(game.category);
    }
    return ["All", ...seen];
  }, [games]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((game) => {
      const matchesCategory = category === "All" || game.category === category;
      const matchesQuery =
        q.length === 0 ||
        game.title.toLowerCase().includes(q) ||
        game.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [games, category, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* SEARCH — a real input, not decoration: 28 titles is exactly the count
          where scanning by eye stops being faster than typing. */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search games"
          aria-label="Search games"
          className={`w-full rounded-full border border-slate-700 bg-[#0F172A] py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 ${FOCUS}`}
        />
      </div>

      {/* CATEGORY FILTER — a scrolling chip rail so a long list of genres never
          wraps the grid down. `aria-pressed` keeps the active chip honest for
          assistive tech. */}
      <div
        role="group"
        aria-label="Filter by category"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {categories.map((name) => {
          const active = name === category;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              aria-pressed={active}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-[#FF7A00] text-[#0F172A]"
                  : "bg-white/10 text-slate-200 hover:bg-white/20"
              } ${FOCUS}`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* COUNT — sets the expectation before the grid, and confirms a filter
          narrowed things down rather than silently emptying the page. */}
      <p className="text-xs font-medium text-slate-400">
        {visible.length} {visible.length === 1 ? "game" : "games"}
        {category !== "All" ? ` in ${category}` : ""}
      </p>

      {/* EMPTY STATE — reachable only via a search that matches nothing. */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-8 text-center">
          <p className="text-sm font-semibold text-white">No games match that.</p>
          <p className="mt-1 text-xs text-slate-400">
            Try a different search or pick another category.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((game) => (
            <li key={game.id} className="min-w-0">
              <Link
                href={`/games/${game.id}`}
                className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A] transition hover:border-slate-600 ${FOCUS}`}
              >
                {/* THE TILE ART. A gradient tinted by the game's own accent plus
                    a centred glyph, so every tile is distinct without shipping
                    dozens of image assets. `aspect-video` keeps the row even. */}
                <span
                  aria-hidden
                  className="relative flex aspect-video w-full items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${game.accent ?? DEFAULT_ACCENT} 0%, rgba(15,23,42,0.9) 120%)`,
                  }}
                >
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.28),transparent_60%)]" />
                  <Gamepad2 className="relative h-8 w-8 text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-110" />
                  <span className="absolute bottom-1.5 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                    {game.category}
                  </span>
                </span>

                {/* TITLE — `line-clamp-2` so a long name wraps to two lines then
                    ellipsizes instead of stretching the tile's track. */}
                <span className="flex min-w-0 flex-1 flex-col p-2.5">
                  <span className="line-clamp-2 text-sm font-bold text-white">
                    {game.title}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
