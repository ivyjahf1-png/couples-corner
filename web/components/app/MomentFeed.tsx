"use client";

import { useEffect, useState, type ReactNode } from "react";

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
 * a panel in here. See the note at the switcher's old position.
 *
 * ── WHY DEFAULT IS VIDEOS ─────────────────────────────────────────────────
 * The tab is called "Moment" and the player is the immersive, media-first
 * experience, so it is what the tab means. A member who wants the timeline is
 * one tap away; the reverse would silently change what the primary tab does.
 */
export type MomentViewTab = "videos" | "community";

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
  if (view === "community") url.searchParams.set("view", "community");
  else url.searchParams.delete("view");
  window.history.replaceState(window.history.state, "", url);
}

export function MomentFeed({
  videos,
  community,
  defaultTab = "videos",
}: MomentFeedProps) {
  const [tab, setTab] = useState<MomentViewTab>(defaultTab);

  /* Keep the address bar in step with the active panel, and read an incoming
     `?view=community` so the header's "Feed-view" link and any shared link land
     on the right panel.

     The read runs on mount only, via `defaultTab` (which the page derives from
     searchParams). Later URL changes are deliberately NOT tracked: this
     component writes `?view=` itself, so a `useSearchParams` dependency would
     re-run this effect on its own writes and could fight the tab switch. */
  useEffect(() => {
    syncViewToUrl(tab);
  }, [tab]);

  return (
    <div className="flex h-full min-h-0 flex-col">
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
          remaining flex height and scroll inside its own region. */}
      <div
        role="tabpanel"
        id="moment-panel-videos"
        aria-labelledby="moment-tab-videos"
        hidden={tab !== "videos"}
        className="min-h-0 flex-1"
      >
        {videos}
      </div>
      <div
        role="tabpanel"
        id="moment-panel-community"
        aria-labelledby="moment-tab-community"
        hidden={tab !== "community"}
        className="min-h-0 flex-1 overflow-y-auto"
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