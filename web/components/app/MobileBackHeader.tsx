"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const titles: Record<string, string> = {
  discover: "Discover", explore: "Explore", matches: "Matches", messages: "Messages",
  notifications: "Alerts", feed: "Feed", moments: "Moment", profile: "Profile",
  settings: "Settings",
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

  /* ── ROUTES THAT OWN THEIR OWN HEADER, AND SO SUPPRESS THIS ONE ──────────────

     Every route listed here builds a header of its own — `/messages` through
     `PageLock`'s `head` slot, `/profile` through `ProfileHeader`, an active
     conversation through the chat's own top bar. Rendering this global bar as
     well stacks two chrome rows on top of each other.

     WHY THIS IS NOW A SINGLE LIST RATHER THAN A CHAIN OF EXACT-MATCH `if`s.
     The suppression used to be scattered through the function as a series of
     `if (pathname === "/x") return null;` statements, and the `/messages` one
     never executed: the duplicate bar was still in the served DOM. The cause
     was not the comparison but the COMMENT above it — an unterminated block
     comment (the stale `useSyncExternalStore` note, describing code that no
     longer lives in this file) ran on into the guards below, so they compiled
     as comment text instead of statements. The guards after that comment's
     accidental closing sequence (`/profile`, `/likes`, `/discover`) kept
     working, which is why only `/messages` showed the double header.

     Listing the routes in one place means there is a single decision to audit,
     and adding a self-headered route no longer means finding the right `if`
     among a dozen of them. The paths are matched on the SEGMENT, so `/messages`
     and `/messages/<id>` are both covered by one entry and cannot drift apart. */
  const SELF_HEADERED = new Set([
    "messages", // inbox + active conversation
    "profile", // own profile + /profile/<uid>
    "likes",
    "discover",
    /* `/explore` is NOT in this list even though it suppresses the back arrow and
       the "Home" link: it renders THIS bar in its bare form — centred title only —
       so it must keep reaching the markup below. */
  ]);

  if (!segment || pathname === "/dashboard") return null;

  /* One decision, before anything else: if this route draws its own header,
     this bar must not render at all. Placed immediately after the null-path
     guard so no later code path can reach the markup on these routes. */
  if (SELF_HEADERED.has(segment)) return null;

  // ── BARE HEADER ON /explore ───────────────────────────────────────────────
  // `/explore` renders ONLY the centred title: no back arrow on the left, no
  // "Home" link on the right. It is a top-level destination in the bottom nav, so
  // a back arrow implied somewhere more important exists, and the "Home" link
  // pointed at a route the member could already reach from the nav beneath it.
  //
  // The title is centred with a matching empty slot on each side rather than
  // `text-center` alone, so it sits optically centred instead of drifting left
  // once the two 44px controls are gone.
  const isBareHeader = segment === "explore";

  const isAppPage = ["discover", "explore", "matches", "messages", "notifications", "feed", "profile", "settings", "subscription", "onboarding", "couple", "u", "chat", "level", "badge", "support", "feedback"].includes(segment);
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
      {/* ── THE ONE HEADER, LOCKED TO THE TOP ─────────────────────────────────────
          `sticky top-0` + `z-50`, which is what "locks to the screen and never
          scrolls away" actually requires. Two things make it hold:

          1. `relative` establishes this element as a stacking context, so `z-50`
             is resolved against the header rather than against whatever ancestor
             happens to create a context. Without it the bar competes in the
             root context, where a sibling with a large z-index elsewhere in the
             tree can paint over it — which is exactly the "header slides under
             the video" failure.

          2. `shrink-0` + the in-flow column in `feed/layout.tsx` mean the header
             occupies real flow space above the panels. `sticky` positions within
             the nearest scrolling ancestor, and the community panel scrolls
             INSIDE itself (`overflow-y-auto`) rather than scrolling the page, so
             the header is never even a candidate for movement — it is a fixed
             sibling of the scroll region, and `sticky` is the belt-and-braces
             that keeps it pinned if that ever changes.

          `relative` costs nothing here: the bar has no absolutely-positioned
          children that need to escape it.

          `pt-[env(safe-area-inset-top)]` is retained and is the ONE place the
          status-bar inset is applied on this route. The feed overlay beneath it
          previously repeated the inset, which is what produced the stacked
          double-bar look; see the note on MediaFeed's top overlay. */}
      <header className="mobile-feature-header app-top-bar sticky top-0 z-50 relative shrink-0 border-b border-white/5 pt-[env(safe-area-inset-top)] md:hidden">
        {/* `touch-manipulation` on the bar: without it a mobile browser may wait
            to see whether the tap becomes a double-tap zoom before firing, which
            is exactly the "I had to tap it again" feel. `manipulation` removes
            the 300ms double-tap-zoom delay while leaving pinch-zoom intact. */}
        <nav
          aria-label="Page navigation"
          className="flex min-h-16 touch-manipulation items-center gap-3 px-4 py-2"
        >
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
          {isBareHeader ? (
              <span aria-hidden className="h-11 w-11 shrink-0" />
            ) : segment === "feed" ? (
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
          {/* Title, and on the Moment screen an ACTIVE CONTROL.

              ── WHY THE TITLE IS A LINK HERE ─────────────────────────────────────
              This was a bare `<p>`, so "Moment" was a label with no behaviour at
              all: tapping it did nothing, ever. That is half of what made the
              switcher feel broken — a member aiming at the screen's name got no
              response, so the only word on the bar that looked like it might
              respond was the terse "feed-view" fragment.

              Making it a link gives the pair a symmetric meaning that matches how
              they read: "Moment" returns to the reel/player view, "feed-view"
              goes to the community timeline. Either word is now a destination,
              so the round trip works in both directions and is discoverable from
              either state.

              It renders as a link ONLY on the Moment screen. Elsewhere the title
              is the label of the page you are already on, so linking it would
              point at the current route — a control that navigates nowhere is
              worse than no control. `feed` is a real destination from every other
              screen, but that is what the bottom nav's Moment tab is for.

              `min-h-11` on the hit area rather than on the text: the glyphs are
              15px, and a target sized to the text is a ~20px-tall tap target,
              which is below the 44px minimum and the reason a control this
              obvious still gets missed on a phone. The padding is negative-margin
              free — the flex `gap-3` absorbs it, so nothing shifts.

              The remaining typography is unchanged: `text-[15px] font-normal
              text-slate-300` on this route, `text-base font-semibold text-white`
              elsewhere. */}
          {/* `/feed` and `/moments` now own a tab each, so there is NO view switcher
             here any more. The link that used to move between them via a query param
             would now offer a way to leave the tab a member tapped and land on a
             screen the bottom bar does not highlight - the exact ambiguity the split
             exists to remove. */}
          {isBareHeader ? (
            /* Nothing at all, not an empty 44px button. A transparent tap target is
               worse than no target: it eats the row's right gutter and swallows taps
               with no visible affordance. */
            <span aria-hidden className="h-11 w-11 shrink-0" />
          ) : (
            <Link
              href={fallback}
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Home
            </Link>
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
