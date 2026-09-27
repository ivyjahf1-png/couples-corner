"use client";

import { createContext, useContext } from "react";

/**
 * Which card the feed currently has snapped into view.
 *
 * WHY THIS EXISTS: the sponsored card needs to know whether IT is the visible
 * card, so it can run its watch timer only while a member is actually looking at
 * it. The obvious wiring - passing a render function down from the page - does
 * not work: `MediaFeed` is a Client Component and the page is a Server
 * Component, and functions cannot cross that boundary. Doing so fails at
 * RUNTIME, not at build time:
 *
 *     Error: Functions cannot be passed directly to Client Components...
 *     sponsoredSlot: function sponsoredSlot
 *     digest: '2944027577'
 *
 * A Server Action is NOT the answer either: those must be async and return
 * serializable data, whereas this returns JSX.
 *
 * So the page passes a plain element (fully serializable) and the card learns
 * its active state from this context, which only client code can provide.
 */
export interface FeedActiveState {
  /** Index of the card currently snapped into view. */
  activeIndex: number;
  /**
   * Index the sponsored card occupies, or null when there is no such card.
   * The sponsored card compares this against `activeIndex` to know whether the
   * member is looking at it.
   */
  sponsoredIndex: number | null;
}

/**
 * `null` is the default rather than a zeroed state so a card rendered OUTSIDE a
 * MediaFeed (a storybook entry, a test, a future standalone placement) does not
 * silently believe it is the active card and start its timer.
 */
const FeedActiveContext = createContext<FeedActiveState | null>(null);

export const FeedActiveProvider = FeedActiveContext.Provider;

/** Active-card state, or null when no MediaFeed is above this component. */
export function useFeedActiveState(): FeedActiveState | null {
  return useContext(FeedActiveContext);
}
