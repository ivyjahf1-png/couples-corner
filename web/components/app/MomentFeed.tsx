"use client";

import { useState, type ReactNode } from "react";

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
 * ── WHY THE SWITCHER IS A PROP, NOT A ROUTE ────────────────────────────────
 * Both views are ALREADY server-rendered, and keeping them mounted means:
 *   • switching tabs does not refetch, and
 *   • the video player's scroll position and the timeline's scroll position are
 *     each preserved by the browser, because neither unmounts.
 *
 * That is the "state preserved smoothly" requirement, and routing between the
 * two would have thrown it away on every toggle. Only the ACTIVE view is
 * rendered; the inactive one is hidden with `hidden`, which keeps its DOM (and
 * therefore its scrollTop) intact while removing it from the a11y tree and from
 * hit-testing. `display:none` alone would NOT do this — a hidden-by-attribute
 * element is still focusable and still receives scroll.
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

const TABS: { id: MomentViewTab; label: string; hint: string }[] = [
  { id: "videos", label: "Videos", hint: "Full-screen player" },
  { id: "community", label: "Community Feed", hint: "Posts and photos" },
];

export function MomentFeed({
  videos,
  community,
  defaultTab = "videos",
}: MomentFeedProps) {
  const [tab, setTab] = useState<MomentViewTab>(defaultTab);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* The sub-switcher.
          `shrink-0` in a flex column means it cannot be squeezed away by the
          content below it, and it sits ABOVE both views rather than floating —
          a floating switcher over a full-bleed player would overlay the very
          media the member came to watch. */}
      <div className="glam-frame sticky top-0 z-30 shrink-0">
        <div className="glam-frame__inner flex gap-1 p-1" role="tablist" aria-label="Moment view">
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`moment-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`moment-panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={[
                  "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition",
                  selected
                    ? "bg-gradient-to-r from-amber-400/25 via-rose-400/20 to-indigo-400/25 text-white shadow-sm ring-1 ring-white/20"
                    : "text-ink-300 hover:bg-white/[0.06] hover:text-white",
                ].join(" ")}
              >
                {item.label}
                {/* The active tab carries its own description for assistive tech;
                    the `title` is the mouse equivalent. Neither is read by the
                    visible label, so a screen reader announces the pair once. */}
                <span className="sr-only"> — {item.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

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