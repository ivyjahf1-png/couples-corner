"use client";

import Link from "next/link";

/**
 * Floating Game Center action button.
 *
 * Client Component: interactive controls (hover, focus, client-side
 * navigation) require the "use client" boundary, so this component is safe
 * to nest inside any Server Component, such as the Discover page.
 */
export function GameCenterButton() {
  return (
    <div className="fixed right-4 bottom-20 z-40">
      <Link
        href="/games"
        className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-blue-500/40 bg-[#0F172A] text-white shadow-2xl transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        title="Game Center"
        aria-label="Open the Game Center"
      >
        <span className="text-xl" aria-hidden="true">
          🎮
        </span>
        <span className="text-[10px] font-medium text-blue-400">Games</span>
      </Link>
    </div>
  );
}
