"use client";

import { useEffect, type ReactNode } from "react";
import {
  MOMENT_VIEW_COMMUNITY,
  MOMENT_VIEW_EVENT,
  MOMENT_VIEW_PARAM,
  type MomentViewTab,
} from "@/lib/momentView";

/**
 * Re-exported so `app/(app)/feed/page.tsx` can keep importing the tab type from
 * here alongside the component. The type now lives in `@/lib/momentView` so the
 * header can share it without importing this file, and this re-export is the
 * bridge that stops that move from churning the page's import.
 */
export type { MomentViewTab };

/**
 * The Moment section's dual-view shell.
 *
 * ── WHY TWO VIEWS UNDER ONE TAB ────────────────────────────────────────────
 * The product genuinely has two different things a member comes to "Moment" for,
 * and they are not variations of each other:
 *   • VIDEOLS — the immersive full-screen vertical player. One card at a time,
 *     swipe to advance, creator handle and engagement rail overlaid on the media.
 *   • COMMUNITY FEED — a chronological timeline of status posts and photos,
 *     with the safety banner at the top.
 *
 * Putting them behind one clearly-labelled sub-switcher is honest about that.
 * The regression that caused this work was the opposite: one tab silently
 * served one of the two, and the other was unreachable — so a member tapping
 * "Moment" to watch videos got a blog with no explanation.
 *
 * ── WHY THE SWITCHER IS NOT IN HERE ─────────────────────────────────────────
 * Both views are ALREADY server-rendered, and keeping them mounted means:
 *   • switching views does not refetch, and
 *   • the player and the timeline each keep their scroll position, because
 *     neither unmounts.
 *
 * That is the "state preserved smoothly" requirement, and routing between the
 * two would have thrown it away on every toggle. Only the ACTIVE view is
 * rendered; the inactive one is hidden with `hidden`, which keeps its DOM (and
 * therefore its scrollTop) intact while removing it from the a11y tree and from
 * hit-testing. `display:none` alone would NOT do this — a hidden-by-attribute
 * element is still focusable and still receives scroll.
 *
 * The CONTROL that toggles them is the screen header's "feed-view" button, not
 * a panel in here. See the note at the switcher's old position, and note that
 * with the switcher gone this component no longer holds a `tab` state at all —
 * the active panel is derived from `defaultTab`, which the page derives from
 * `?view=`. That is what lets the header's link actually reach this screen's
 * other panel.
 *
 * ── WHY DEFAULT IS VIDEOS ─────────────────────────────────────────────────
 * The tab is called "Moment" and the player is the immersive, media-first
 * experience, so it is what the tab means. A member who wants the timeline is
 * one tap away; the reverse would silently change what the primary tab does.
 */

export interface MomentFeedProps {
  /** The immersive player. Server-rendered by the page. */
  videos: ReactNode;
  /** The chronological community timeline. Server-rendered by the page. */
  community: ReactNode;
  defaultTab?: MomentViewTab;
}

/**
 * Mirrors a tab back into the URL as `?view=`, so the shared mobile header can
 * offer a "Feed-view" shortcut to the timeline without owning any state.
 *
 * Why the URL and not a callback: `MobileBackHeader` is rendered by `AppShell`,
 * which sits ABOVE the page in the tree, and the tab lives inside this
 * component. There is no path from the header down to here except a URL or a
 * lifted context. The URL was chosen because it is also correct on arrival —
 * a shared `/feed?view=community` link opens the timeline directly, which a
 * context-only approach could not do without a second deep-link mechanism.
 *
 * `replaceState` is used instead of `router.replace` on purpose: routing would
 * re-render the server component and remount this subtree, discarding both
 * panels' scroll positions — the exact thing mounting both panels exists to
 * prevent. Writing the query directly keeps the address bar honest (the toggle
 * is linkable and survives a refresh) while changing nothing about the DOM.
 *
 * Called from an effect only, so it never runs during render.
 */
function syncViewToUrl(view: MomentViewTab) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (view === "community") url.searchParams.set(MOMENT_VIEW_PARAM, MOMENT_VIEW_COMMUNITY);
  else url.searchParams.delete(MOMENT_VIEW_PARAM);
  window.history.replaceState(window.history.state, "", url);

  /* Announce the change. `replaceState` re-renders nothing, so this is the only
     signal the header gets that the view moved — without it the top-right
     toggle keeps its old label and, worse, keeps its old href, so tapping it
     twice navigates to the same place and appears to do nothing.

     Dispatched after the write so a handler that reads `window.location` sees
     the new URL. */
  window.dispatchEvent(
    new CustomEvent<MomentViewTab>(MOMENT_VIEW_EVENT, { detail: view }),
  );
}

export function MomentFeed({
  videos,
  community,
  defaultTab = "videos",
}: MomentFeedProps) {
  /* ── WHY `tab` IS NOT STATE ───────────────────────────────────────────────
     This is the bug the header's "feed-view" link was hitting: `tab` used to be
     `useState(defaultTab)`, written by the in-page pill switcher. That switcher
     was removed (the header took over the choice, freeing vertical space on the
     full-bleed player), which left `setTab` with no remaining caller. The state
     was therefore frozen at whatever `defaultTab` was on MOUNT and could never
     change again.

     `defaultTab` comes from the page, which derives it from `?view=`. Tapping
     "feed-view" navigates to `/feed?view=community`; the server re-renders and
     passes `defaultTab="community"`. But `useState` ignores its initial argument
     after the first render, and Next.js reconciles this as the same component in
     the same position rather than remounting it — so the new prop arrived and
     was discarded. The button navigated, the address bar changed, and the video
     player stayed on screen. The community view was unreachable.

     Deriving the panel from the prop instead of storing it is the fix, and it is
     also the design the rest of this file already describes: the URL is the
     single source of truth. Storing it in state introduced a second copy that
     could silently disagree with the URL, and the header — which reads the URL —
     is exactly the consumer that got the wrong answer.

     Scroll positions are unaffected. Both panels stay mounted and the inactive
     one is `hidden` rather than unmounted, so each keeps its own `scrollTop`
     across a toggle. Only a real remount would lose them, and none happens. */
  const tab = defaultTab;

  /* Keep the address bar in step with the rendered panel, and tell the header
     which view is showing.

     The event is dispatched AFTER the `replaceState` so a subscriber reading
     `window.location` in its handler sees the new URL. It is a no-op on the
     server and safe to fire when the URL already matches — the handler re-reads
     and writes the same value. */
  useEffect(() => {
    syncViewToUrl(tab);
  }, [tab]);

  return (
    // `w-full overflow-hidden`: this is the root of the Moment screen's column and
    // must never become a scroll region — the panels below own the scrolling.
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* ── IN-PAGE TABS REMOVED ───────────────────────────────────────────────
          The "Videos / Community Feed" pill container is gone. It was a bordered,
          padded, gradient-filled box that ate roughly 56px of vertical space on
          a full-bleed 9:16 player — the most valuable pixels on the screen — to
          offer a two-way choice the screen's own header now makes in ONE tap.

          `MobileBackHeader` renders a "feed-view" control on this route precisely
          so the choice survives here. That trade is the whole point: the header
          is chrome costing no vertical space over the video, and the pill box
          was chrome that did.

          The panels below stay mounted and one stays `hidden` — see the note
          there. Both views are still server-rendered and still preserve their
          scroll positions across a toggle; only the switcher moved. */}

      {/* Both panels stay MOUNTED so their scroll positions survive a toggle.
          `hidden` (not unmount, not aria-hidden) is what removes the inactive
          one from the a11y tree and from hit-testing while its DOM — and thus
          its scrollTop — is retained. `min-h-0` lets the active panel take the
          remaining flex height and scroll inside its own region.

          `aria-label` rather than `aria-labelledby`: the panels used to be
          labelled by `moment-tab-videos` / `moment-tab-community`, ids on the
          in-page pill switcher that was removed when the header took over. Those
          references were left dangling — pointing at elements that no longer
          exist, which is worse than no label because a screen reader announces a
          broken relationship. Each panel now names itself. */}
      {/* ── THE VIDEOS PANEL ───────────────────────────────────────────────────
          `flex flex-col` (NEW) so the media feed's `<section>` — which is
          `flex-1`/`h-full` and NOT a direct flex child of this column otherwise —
          actually resolves to "fill the remaining height". Without a column
          context here the section's `h-full` resolves against this panel's
          content height and the player collapses to zero on some paths.

          `overflow-hidden` keeps this panel from EVER becoming the scroll region:
          the only scroller is `MediaFeed`'s inner snap scroller, one level down.
          That is what keeps the header, the bottom nav and the floating upload
          button pinned while the cards move under them. */}
      <div
        role="region"
        aria-label="Moment reels"
        id="moment-panel-videos"
        hidden={tab !== "videos"}
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
      >
        {videos}
      </div>
      {/* ── THE COMMUNITY PANEL ────────────────────────────────────────────────
          The ONE scroll region on this screen. `overscroll-contain` stops a flick
          at the very top or bottom of the timeline from chaining to the body
          behind the shell, which would otherwise nudge the header — the same
          failure mode the media scroller already guards against. */}
      <div
        role="region"
        aria-label="Community feed"
        id="moment-panel-community"
        hidden={tab !== "community"}
        className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain"
      >
        {/* Rendered unconditionally. The `hidden` attribute above is what
            suppresses it — a conditional here would unmount the timeline and
            throw away its scroll position, which is the exact thing this
            component exists to prevent. */}
        {community}
      </div>
    </div>
  );
}