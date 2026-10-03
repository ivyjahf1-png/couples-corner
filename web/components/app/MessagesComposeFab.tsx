"use client";

import Link from "next/link";
import { Icon } from "@/components/landing/Icon";

/**
 * Floating compose button on /messages.
 *
 * The blue FAB the inbox is specified around. Distinct from `GameCenterButton`,
 * which this page no longer renders — two round floating buttons on one screen
 * would compete for the same corner and the bottom-right slot.
 *
 * ── `bottom-28` (112px), RAISED FROM `bottom-24` ─────────────────────────────
 * The nav is 5rem (80px), so `bottom-24` (96px) cleared it by 16px — a gap
 * small enough that the 56px button still read as sitting ON the bar rather
 * than above it, which is the crowding the brief reports.
 *
 * `bottom-28` gives 32px of clearance: enough for the button to read as
 * floating, while still sitting well below the conversation list so it does
 * not cover the last two rows on a short screen. `MessagesInbox` reserves
 * `pb-28` for exactly this pair — the nav and this button — so raising the
 * button further would start hiding rows behind it.
 *
 * The `sm:` variant is dropped for the same reason as in MediaFeed: the nav is
 * `md:hidden` with no wider breakpoint of its own, so a second offset is one
 * more number to keep in step with nothing.
 *
 * `fixed`, not `absolute`: the wrapper is a full-width flex row, so an absolute
 * child would resolve its `bottom` against the scrolling content box and ride
 * away with the list.
 *
 * `z-[60]` is above `Z.nav` (50) so the button is genuinely tappable where the
 * two overlap, and below `Z.sheet` (200) so a modal still covers it.
 *
 * `px-4` on the wrapper keeps the button off the screen bezel, matching the
 * page's own side padding.
 */
export function MessagesComposeFab() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-end px-4 md:bottom-24">
      <Link
        href="/discover"
        aria-label="Start a new chat"
        title="New chat"
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-900/40 transition duration-150 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0A1C] active:translate-y-0 active:shadow-none"
      >
        <Icon name="plus" className="h-6 w-6" />
      </Link>
    </div>
  );
}
