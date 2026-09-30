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
 * `bottom-24` (96px) clears the 5rem fixed tab bar (80px) plus 16px of gap.
 * This page stacks no action row beneath the nav the way Discover does, so it
 * must NOT reuse Discover's `bottom-32`.
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
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-end px-4">
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
