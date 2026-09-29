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
    /* `fixed`, not `absolute`. THE REGRESSION THIS FIXES:
       the wrapper was `absolute` inside the page's `relative` container, so it
       was positioned against the CONTENT BOX — which scrolls. Two consequences,
       both visible in the live screenshot:
         1. It scrolled away with the content instead of floating.
         2. Its `bottom-4` resolved against the container's padding box, so the
            button sat INSIDE the `pb-20` reserve — right on top of the 5-icon
            action row and the card's own bottom controls, clipping into them.

       `fixed` pins it to the VIEWPORT, which is what "floats clearly above the
       action button row by the side of the screen" requires.

       `bottom-24` (96px) clears the 5rem bottom tab bar (80px) plus its own
       16px breathing room, so the cluster can never land under the nav icons
       — the whole reason `Z.nav` exists is that nav links WIN taps in any
       overlapping region.

       `z-[60]` is above `Z.nav` (50) so the touch target is genuinely
       reachable where the two overlap, and well below `Z.sheet` (200) so a
       modal still covers it. The old `z-20` was BELOW the nav, which is why
       the button sometimes could not be tapped at all. */
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-end px-4">
      <a
        href="/games"
        className="nm-raised pointer-events-auto group flex h-14 w-14 flex-col items-center justify-center rounded-full border border-sky-400/40 bg-gradient-to-b from-[#1E293B] to-[#0F172A] text-white transition duration-150 hover:-translate-y-0.5 hover:border-sky-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] active:translate-y-0 active:shadow-none"
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
