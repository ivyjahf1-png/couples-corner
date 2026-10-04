"use client";

import Link from "next/link";

/**
 * Compact Game Center badge, for use INSIDE a card's header area.
 *
 * WHY THIS EXISTS ALONGSIDE `GameCenterButton`. The floating button is pinned
 * to the viewport's bottom-right, which on Discover puts it in the same band as
 * the 5-icon action row and the fixed nav — every offset that "clears" one of
 * them collides with another, because all three stack. Rather than keep tuning
 * `bottom-*` values against a moving target, the badge form moves the control
 * out of that band entirely and into the card's own top-right corner, where it
 * competes for space with nothing.
 *
 * IT IS POSITIONED BY ITS PARENT, NOT BY ITSELF. `GameCenterButton` owns its
 * `fixed` placement; this one renders `static` content inside a wrapper the
 * caller positions, so the same component works on the Discover card and on any
 * other card-shaped surface without a second set of offsets to maintain.
 *
 * Kept as an <a> for the same reason as the floating button: the statically
 * hosted build can strand a client-side route transition on a not-yet-hydrated
 * document, so this always does a full document navigation.
 */
export function GameCenterBadge({
  /** Visible caption beside the glyph. */
  label = "Games",
  /** Accessible name — supply it when `label` alone is not descriptive. */
  ariaLabel = "Open the Game Center",
  /** Wrapper classes. The caller supplies the position (`absolute`, insets). */
  className = "",
}: {
  label?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <a
        href="/games"
        className="nm-raised group inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-[#0F172A]/90 px-3 py-1.5 text-white backdrop-blur transition duration-150 hover:border-sky-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]"
        title="Game Center"
        aria-label={ariaLabel}
      >
        <span className="text-sm transition-transform duration-150 group-hover:scale-110" aria-hidden="true">
          🎮
        </span>
        <span className="text-[11px] font-medium text-sky-300">{label}</span>
      </a>
    </div>
  );
}

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
export function GameCenterButton({
  /**
   * Tailwind `bottom-*` utility. A class string rather than a number so the
   * value stays inspectable in the DOM and cannot drift out of sync with the
   * nav height the way an inline `style` would.
   */
  bottomOffset = "bottom-32",
  /** Visible caption under the glyph. */
  label = "Games",
  /** Accessible name — supply it when `label` alone is not descriptive. */
  ariaLabel = "Open the Game Center",
}: {
  bottomOffset?: string;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    /* `fixed`, not `absolute`. THE REGRESSION THIS FIXES:
       the wrapper was `absolute` inside the page's `relative` container, so it
       was positioned against the CONTENT BOX — which scrolls. Two consequences:
         1. It scrolled away with the content instead of floating.
         2. Its `bottom-4` resolved against the container's padding box, so the
            button sat INSIDE the `pb-20` reserve — right on top of the 5-icon
            action row and the card's own bottom controls, clipping into them.

       `fixed` pins it to the VIEWPORT, which is what "floats clearly above the
       action button row by the side of the screen" requires.

       ── WHY `bottom-32` AND NOT `bottom-24` ────────────────────────────────
       `bottom-24` (96px) cleared the 5rem tab bar (80px) and nothing else, so
       the 56px button still overlapped the card's own 5-icon action row — the
       one at `bottom-0 p-5` inside DiscoverCardStack, which is ALSO a fixed
       height above the nav. Clearing the nav is necessary but NOT sufficient:
       the action row is the taller obstacle and sits above it.

       `bottom-32` (128px) = 80px nav + 48px action row + clearance. The two
       offsets are now in proportion to what they clear, so neither can hide
       under the other.

       `z-[60]` is above `Z.nav` (50) so the touch target is genuinely
       reachable where the two overlap, and well below `Z.sheet` (200) so a
       modal still covers it. The old `z-20` was BELOW the nav, which is why
       the button sometimes could not be tapped at all.

       NOTE: `bottom-32` is specific to Discover. Any other surface that floats
       this button must pass its own `bottomOffset`, sized to what THAT page
       stacks underneath it — /messages has the nav but no action row, so it
       passes `bottom-24`. Copying the Discover value onto a page with less
       beneath it is what left the button floating oddly high in the inbox. */
    <div
      className={`pointer-events-none fixed inset-x-0 ${bottomOffset} z-[60] flex justify-end px-4`}
    >
      <a
        href="/games"
        className="nm-raised pointer-events-auto group flex h-14 w-14 flex-col items-center justify-center rounded-full border border-sky-400/40 bg-gradient-to-b from-[#1E293B] to-[#0F172A] text-white transition duration-150 hover:-translate-y-0.5 hover:border-sky-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] active:translate-y-0 active:shadow-none"
        title="Game Center"
        aria-label={ariaLabel}
      >
        <span className="text-xl transition-transform duration-150 group-hover:scale-110" aria-hidden="true">
          🎮
        </span>
        {/* THE YELLOW HALF OF THE BLUE/YELLOW PAIR. The chrome above is blue
            (`sky-400` border, slate gradient), so the label carries the warm
            accent — amber, the same value as the profile action bar's Chat button
            and the `nav-pill` active state. Two-tone is what makes this read as a
            deliberate game widget rather than a generic dark FAB.

            `text-amber-300` (not `amber-400`) because it sits on a near-black
            gradient: 400 is vivid enough to vibrate against `#0F172A` at this
            size, 300 keeps it legible without glowing. */}
        <span className="text-[10px] font-semibold text-amber-300">{label}</span>
      </a>
    </div>
  );
}
