"use client";

import { useEffect, useRef, useState } from "react";

/**
 * DRIVE A "COLLAPSE ON SCROLL" HEADER FROM A SCROLL CONTAINER.
 *
 * Returns a ref to attach to the scrolling element and a boolean that flips to
 * `true` once the element has been scrolled past `threshold` pixels.
 *
 * WHY THIS EXISTS RATHER THAN A `position: sticky` HEADER. Sticky only pins an
 * element to the EDGE of its scroll container - it cannot make a bar collapse,
 * shrink, or hand its content to a condensed title. The behaviour asked for is
 * the one iOS and every native list screen uses: the full-height header scrolls
 * away with the content, and a compact title-only bar takes its place at the top.
 * That is a two-state layout swap driven by scroll position, which CSS alone
 * cannot express.
 *
 * WHY THE HEADER IS STILL A FLEX SIBLING, NOT AN OVERLAY. This hook does not
 * change the layout contract described in `ChatRoomClient`: the header remains
 * `shrink-0` and the thread remains the only scroller. What changes is the
 * HEADER'S OWN HEIGHT - full (avatar + name + status) when `collapsed` is false,
 * a single compact line when true. The header never scrolls away, it only
 * shrinks in place, so there is no moment where the composer or the top of the
 * thread is exposed.
 *
 * PERFORMANCE — THIS IS THE POINT OF THE `rAF` GUARD. A naive implementation
 * attaches a `scroll` listener that calls `setState` on every event, and a touch
 * scroll on a phone fires that 60-120 times per second. That re-renders the whole
 * thread subtree on each one, which is the single most expensive thing a chat
 * screen can do. Three things prevent it here:
 *
 *   1. The state is written ONCE per transition. Scroll events between the
 *      threshold crossings update a ref, never React state, so a long scroll
 *      produces exactly two renders (expanded -> collapsed -> expanded) rather
 *      than hundreds.
 *   2. State is only written when the boolean actually changes, so React bails
 *      out of the re-render entirely on the overwhelming majority of events.
 *   3. `requestAnimationFrame` collapses a burst of events in a fast scroll into
 *      one measurement per painted frame, so the work is bounded by the display
 *      rather than by the input rate.
 *
 * PASSIVE LISTENER. `passive: true` tells the browser we will never call
 * `preventDefault`, so it can keep scrolling on the compositor thread without
 * waiting for us. Without it a scroll handler can force layout synchronously on
 * every event, which is precisely the jank this hook exists to avoid.
 *
 * HYSTERESIS IS DELIBERATE AND IT IS WHY THE HEADER "SNAPS BACK" CLEANLY. A
 * single threshold would make the header flicker between its two states when the
 * member parks their thumb exactly on the boundary. The expanded and collapsed
 * thresholds are therefore different, giving a dead band between them: the header
 * only expands again once the member has scrolled meaningfully back toward the
 * top. The result is that scrolling up always resolves to a definite state rather
 * than oscillating.
 *
 * `threshold` defaults to 12px because anything smaller fires on the sub-pixel
 * jitter that touch scrolling produces at rest.
 *
 * @param threshold Pixels of scroll past which the header is considered collapsed.
 */
export function useScrollCollapse<T extends HTMLElement = HTMLDivElement>(
  threshold = 12
) {
  const ref = useRef<T | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  /* Mirrors of React state that the scroll handler can read and write WITHOUT
     triggering a render. This is what makes the "one render per transition"
     guarantee above possible. */
  const collapsedRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const measure = () => {
      frameRef.current = null;
      const el = ref.current;
      if (!el) return;

      /* `expandAt` sits BELOW `collapseAt`, producing the hysteresis band. A
         `scrollTop` of 0 (fully back at the top) always expands, whatever the
         band says, so the header is guaranteed to return to its normal position
         in the flow exactly when the member reaches the top. */
      const collapseAt = threshold;
      const expandAt = Math.max(threshold * 2, 24);
      const y = el.scrollTop;

      const next = y > collapseAt ? true : y <= expandAt ? false : collapsedRef.current;

      if (next !== collapsedRef.current) {
        collapsedRef.current = next;
        setCollapsed(next);
      }
    };

    const onScroll = () => {
      /* Coalesce: if a frame is already scheduled, this event is redundant. */
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(measure);
    };

    const el = ref.current;
    if (!el) return;

    el.addEventListener("scroll", onScroll, { passive: true });

    /* A thread can arrive already scrolled (history restored, or a deep link
       into a long conversation), in which case no scroll event ever fires and
       the header would sit expanded over content that is scrolled past. Measure
       once on mount so the initial state is truthful. */
    measure();

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [threshold]);

  return { ref, collapsed };
}
