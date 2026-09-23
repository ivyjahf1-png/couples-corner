"use client";

import Link from "next/link";

/**
 * Floating Game Center action button.
 *
 * Client Component: interactive controls (hover, focus, client-side
 * navigation) require the "use client" boundary, so this component is safe
 * to nest inside any Server Component, such as the Discover page.
 *
 * The control is rendered as an <a> rather than a <Link> on purpose: in the
 * statically hosted build (Firebase Hosting serving `web/out`) client-side
 * route transitions to a not-yet-hydrated document can strand the user on a
 * blank screen, so the Game Center always does a full document navigation.
 */
export function GameCenterButton() {
  return (
    <div className="fixed right-4 bottom-20 z-40">
      <a
        href="/games"
        className="nm-raised group flex h-14 w-14 flex-col items-center justify-center rounded-full border border-sky-400/40 bg-gradient-to-b from-[#1E293B] to-[#0F172A] text-white transition duration-150 hover:-translate-y-0.5 hover:border-sky-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] active:translate-y-0 active:shadow-none"
        title="Game Center"
        aria-label="Open the Game Center"
      >
        <span className="text-xl transition-transform duration-150 group-hover:scale-110" aria-hidden="true">
          🎮
        </span>
        <span className="text-[10px] font-medium text-sky-300">Games</span>
      </a>
    </div>
  );
}
