"use client";

import { useState, type ReactNode } from "react";
import { User, Wallet, Sparkles, type LucideIcon } from "lucide-react";

/**
 * Tabbed shell for the "Me" profile view.
 *
 * WHY THIS EXISTS: the profile used to be one long vertical stack — identity
 * card, wallet, membership, relationship, a 4-up game grid, four quick-action
 * tiles, seven menu rows, media gallery, bio, edit button. On a phone that
 * pushed the meaningful content several screens down and forced the page itself
 * to scroll. Grouping that into three tabs shows ONE category at a time, so the
 * first screen is never cluttered and the inner scroller is bounded.
 *
 * LAYOUT CONTRACT:
 *   • The tab BAR is `shrink-0` and sits in `PageLock`'s pinned head slot, so it
 *     never scrolls away.
 *   • The active PANEL is the only child of `PageLock`'s body, which is already
 *     the single `overflow-y-auto` region. The page itself never scrolls — the
 *     shell's fixed bottom nav therefore cannot be pushed around.
 *
 * The server page keeps ownership of all data and markup; this component only
 * holds which tab is active and swaps the panels. Panels are passed in as
 * already-rendered children so no data fetching moves to the client.
 */

export type ProfileTabId = "profile" | "wallet" | "extras";

/**
 * LABEL CHANGES (product wording):
 *   • "Wallet & VIP" -> "Wallet & Tokens". This tab is no longer just a paid
 *     tier: it is the whole financial hub, and it opens on the balance. The name
 *     matches what the first section under it actually shows.
 *   • "Extras" -> "More". "Extras" is vague about what it holds; "More" is the
 *     conventional label for a catch-all section and sets the expectation that
 *     it is secondary, which is how it is placed in the tab order.
 *
 * ICONS: Lucide line icons rather than emoji. Emoji render at a different
 * weight and baseline on every platform, so a tab bar built from them never
 * lines up cleanly; the line icons share one 24px grid and one stroke weight.
 */
const TABS: { id: ProfileTabId; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "wallet", label: "Wallet & Tokens", icon: Wallet },
  { id: "extras", label: "More", icon: Sparkles },
];

export function ProfileTabs({
  panels,
  defaultTab = "profile",
}: {
  panels: Record<ProfileTabId, ReactNode>;
  defaultTab?: ProfileTabId;
}) {
  const [active, setActive] = useState<ProfileTabId>(defaultTab);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tab bar. `role="tablist"` + roving aria so screen readers announce
          the active panel, and each tab is a real <button> so it is reachable
          by keyboard without any custom key handling. */}
      <div
        role="tablist"
        aria-label="Profile sections"
        className="glam-frame sticky top-0 z-10 shrink-0"
      >
        <div className="glam-frame__inner flex gap-1 p-1">
          {TABS.map((tab) => {
            const selected = active === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`profile-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`profile-panel-${tab.id}`}
                onClick={() => setActive(tab.id)}
                className={[
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition",
                  selected
                    ? "bg-gradient-to-r from-amber-400/25 via-rose-400/20 to-indigo-400/25 text-white shadow-sm ring-1 ring-white/20"
                    : "text-ink-300 hover:bg-white/[0.06] hover:text-white",
                ].join(" ")}
              >
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Exactly one panel is mounted at a time. `min-h-0` lets it take the
          remaining flex height and scroll inside PageLock's body rather than
          pushing the container taller. */}
      <div
        role="tabpanel"
        id={`profile-panel-${active}`}
        aria-labelledby={`profile-tab-${active}`}
        tabIndex={0}
        className="min-h-0 flex-1"
      >
        {panels[active]}
      </div>
    </div>
  );
}