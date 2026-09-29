"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isActiveConversationPath } from "@/components/app/AppNav";
import {
  getMomentViewServerSnapshot,
  getMomentViewSnapshot,
  momentViewFromSearch,
  momentViewToggleHref,
  subscribeToMomentView,
} from "@/lib/momentView";

const titles: Record<string, string> = {
  discover: "Discover", explore: "Explore", matches: "Matches", messages: "Messages",
  notifications: "Alerts", feed: "Moment", profile: "Profile", settings: "Settings",
  subscription: "VIP Membership", onboarding: "Get started", couple: "Your couple",
  u: "Member profile", chat: "Chat", community: "Community", events: "Events",
  insights: "Insights", about: "About us", login: "Sign in", register: "Create account",
  "forgot-password": "Reset password", "verify-email": "Verify email", legal: "Legal",
  admin: "Administration", auth: "Account",
};

/** Keep the existing dashboard chrome without duplicating feature-page headers. */
export function MobileHomeHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname !== "/dashboard") return null;
  return <header className="app-top-bar sticky top-0 z-30 border-b border-white/5 border-white/5 pt-[env(safe-area-inset-top)] md:hidden">{children}</header>;
}

/** Shared mobile-only recovery navigation; never depends on session or database data. */
export function MobileBackHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const segment = pathname?.split("/").filter(Boolean)[0] ?? "";

  /* Which view of the Moment screen is showing, read from the URL.

     ── WHY `useSyncExternalStore` ────────────────────────────────────────────
     `MomentFeed` — a CHILD of this header — is what renders the panels, and it
     writes the active view into the address bar with `history.replaceState`.
     That call re-renders nothing by design, because routing instead would
     remount both panels and discard the scroll positions that keeping them
     mounted exists to preserve. So this header has no render of its own to hang
     a label update on, and it reads the same external truth the panels do: the
     URL.

     A `useState` + `useEffect` pair is wrong here twice over. Seeding state in
     an effect is a cascading render React warns against, and — decisively —
     child effects run BEFORE parent effects, so the child's very first
     announcement lands before this listener could possibly be attached. The
     label would be wrong on arrival and stay wrong until the member navigated
     twice. `useSyncExternalStore` reads its snapshot DURING render, so it is
     right on the first paint no matter the effect ordering, and re-renders only
     when the query genuinely changes.

     Before this, the label was frozen for the whole session: the old effect ran
     on mount and on pathname changes, and a `?view=` change alters neither. The
     toggle kept saying "feed-view" and kept pointing at the community view even
     once the member was already there, so the second tap navigated to the
     place they were standing.

     `useSearchParams` is deliberately NOT used: this component is mounted on
     essentially every route via `AppShell`, so opting into it would force a
     Suspense boundary app-wide purely to relabel one button.

     Placed ABOVE the early returns below, because a hook must run on every
     render of the component, and those returns would otherwise skip it. */
  const viewSearch = useSyncExternalStore(
    subscribeToMomentView,
    getMomentViewSnapshot,
    getMomentViewServerSnapshot,
  );
  const communityActive =
    segment === "feed" && momentViewFromSearch(viewSearch) === "community";

  if (!segment || pathname === "/dashboard") return null;

  // Inside an ACTIVE conversation the chat's own ChatHeader is the visible
  // header: it already carries the back arrow, avatar, name/status and call
  // buttons, and it is laid out inside the page's 100dvh column. Rendering the
  // global header here as well would stack two bars, and its fixed positioning
  // plus 4rem spacer would push that 100dvh column past the viewport.
  if (isActiveConversationPath(pathname)) return null;

  const isAppPage = ["discover", "explore", "matches", "messages", "notifications", "feed", "profile", "settings", "subscription", "onboarding", "couple", "u", "chat"].includes(segment);
  const fallback = (isAppPage ? "/dashboard" : "/") as never;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.replace(fallback);
  }

  return (
    <>
      {/* `sticky`, in normal flow — matching AppShell's `MobileHomeHeader`.

          THE INCONSISTENCY THIS FIXES: the dashboard header was `sticky` with
          `px-4 py-3`, while this feature header was `fixed` plus a hand-maintained
          `4rem` spacer. The same number in two files that must agree by hand is
          exactly how a page ends up with a phantom gap under its header, and
          the `fixed` variant also broke the 100dvh contract: a sticky header
          occupies flow space, so a full-height AppShell below it would overflow
          the document by the header's height.

          Being in flow fixes that, and dropping the spacer removes the second
          copy of the number entirely. Both headers now measure `min-h-16` with
          `px-4` and a single `border-b`, so every screen's chrome lines up. */}
      <header className="mobile-feature-header app-top-bar sticky top-0 z-40 shrink-0 border-b border-white/5 pt-[env(safe-area-inset-top)] md:hidden">
        <nav aria-label="Page navigation" className="flex min-h-16 items-center gap-3 px-4 py-2">
          {/* ── BACK ARROW, HIDDEN ON THE MOMENT SCREEN ──────────────────────
              Moment is a PRIMARY tab, not a page drilled into. A back arrow on a
              top-level destination implies there is somewhere more important to
              be, and the browser back gesture from here lands the member on
              whatever page preceded the app — often a logged-out landing screen
              or a share link from someone else.

              It is REMOVED, not merely dimmed. A 44px invisible-but-tappable
              square is the worst of both worlds: it eats the row's left gutter
              and swallows taps with no visible affordance.

              The empty `h-11 w-11` span is a deliberate spacer, not a leftover.
              It reserves the arrow's width so the title sits at the same x on
              every screen — removing the button without it would shift the title
              56px right on this route only, which is exactly the kind of
              one-off misalignment the shared header exists to prevent.

              `aria-hidden` because the control is genuinely gone: a screen reader
              announcing a "Go back" action that no sighted member can see or use
              would be worse than omitting it. The bottom nav's Moment tab is the
              real, visible way back. */}
          {segment === "feed" ? (
            <span aria-hidden className="h-11 w-11 shrink-0" />
          ) : (
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
            </button>
          )}
          {/* Title: `font-normal` and muted, not the `font-semibold text-white` it
              was. "Community feed" was two words competing with the content
              below it; the screen is already named "Moment" in the bottom nav,
              so a large restatement of it here was redundant weight. Elite
              social apps set a bare screen label quietly and let the content
              carry the emphasis.

              `text-[15px]` on the route that has its own in-page tabs
              (`segment === "feed"`) and the previous `text-base` elsewhere, so
              this change does not shrink titles on unrelated screens. `truncate`
              plus `min-w-0` is kept: a long localised title must ellipsize
              rather than push the action off the bar. */}
          <p
            className={`min-w-0 flex-1 truncate ${
              segment === "feed" ? "text-[15px] font-normal text-slate-300" : "text-base font-semibold text-white"
            }`}
          >
            {titles[segment] ?? "Couple’s Corner"}
          </p>
          {/* ── THE "feed-view" TOGGLE ───────────────────────────────────────────
              Navigates to the community timeline by CHANGING THE URL to
              `/feed?view=community`, which the feed page reads into
              `defaultTab` and `MomentFeed` renders.

              THE DESTINATION: `/feed?view=community`, NOT `/community`. Both
              exist and they are different products. `/community` is a
              separate, mostly static Q&A forum page with its own desktop-width
              layout and three hard-coded questions — it is not this timeline
              and it sits outside the mobile app shell. The community FEED that
              this control means is the chronological post timeline, which is a
              PANEL of the Moment screen, so it is reached by switching this
              screen's view rather than by leaving the screen.

              A plain <Link> is used instead of router.push: both panels stay
              mounted, and a full navigation would discard the scroll position
              of the view being left.

              The href and label are both derived from `communityActive`, so they
              can never disagree — and the label says what tapping will DO, which
              is what makes the round trip discoverable now that the in-page pill
              switcher has been removed and this is the only control between the
              two views.

              Typography is unchanged: `text-[13px] font-normal text-slate-300` —
              quiet, unbolded and compact, so it reads as a control rather than
              competing with the title. */}
          {segment === "feed" ? (
            <Link
              href={momentViewToggleHref(communityActive ? "community" : "videos")}
              aria-label={
                communityActive
                  ? "Switch to the video player view"
                  : "Switch to the community feed view"
              }
              className="flex min-h-9 shrink-0 items-center rounded-lg px-2.5 text-[13px] font-normal text-slate-300 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {communityActive ? "player-view" : "feed-view"}
            </Link>
          ) : (
            <Link href={fallback} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white">Home</Link>
          )}
        </nav>
      </header>
      {/* No spacer, deliberately. The header above is `sticky` in normal flow,
          so it already occupies its own space and the page starts directly
          beneath it.

          The previous arrangement was `fixed` + a hand-maintained `4rem` spacer
          — the same number duplicated in two files that had to agree by hand,
          which is how a page ends up with a phantom gap under its header. Both
          headers are now `sticky` at the same `min-h-16` height, so there is no
          spacer to keep in step.

          `app-shell-header-spacer` is retained on a zero-height element ONLY
          because the landscape block in globals.css targets that class and
          hides it alongside the header. If the header is ever changed back to
          `fixed`, the spacer must come back with it. */}
      <div aria-hidden className="app-shell-header-spacer hidden" />
    </>
  );
}
