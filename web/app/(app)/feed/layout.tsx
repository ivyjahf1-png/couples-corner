import type { ReactNode } from "react";

/**
 * Layout for the Moment screen.
 *
 * ── WHY THERE IS NO HEADER HERE ──────────────────────────────────────────────
 * `MobileBackHeader` — the component rendering the "Moment" title and the
 * "feed-view" toggle — is mounted by the ROOT layout, `app/layout.tsx`, which
 * places it in `<body>` above `<Suspense>{children}</Suspense>`. That is its one
 * and only mount point, and it is what gives every route that wants a header one
 * (discover, profile, settings, feed, ...) without each having to remember.
 *
 * This file previously rendered `<MobileBackHeader />` as well, on the belief
 * that nothing mounted it anywhere. That belief was WRONG: the root layout does,
 * and the `grep` that supposedly proved otherwise missed the top-level
 * `app/layout.tsx` because it was not searching that directory.
 *
 * The consequence on mobile was the header bar rendered TWICE, stacked: two
 * "Moment / player-view" rows, ~64px of duplicated chrome, and two independent
 * `sticky top-0` bars competing for the same space. Every control in the bar was
 * duplicated too, so a tap was ambiguous about which copy it had hit — which is
 * the dead-zone/missed-tap behaviour reported.
 *
 * So the header is removed here. `AppShell`'s sibling `MobileHomeHeader` (the
 * dashboard logo/bell bar) is unaffected: it renders only when
 * `pathname === "/dashboard"`, and this route is `/feed`.
 *
 * ── WHY THE FLEX COLUMN IS REPEATED HERE ────────────────────────────────────
 * The zone layout's `<section>` is a `flex h-full min-h-0 flex-1 flex-col`
 * column, and `MomentFeed` is a `flex h-full min-h-0 flex-col` that expects to BE
 * that column. Inserting a wrapper without the same classes would drop the chain to
 * `100%` height at this element and collapse the player to zero height, so the
 * column is reproduced and `children` fills the remaining space.
 *
 * ── VIEWPORT LOCK: WHY NOT `h-[100dvh]` ──────────────────────────────────────
 * The Moment screen is already viewport-locked, one level up:
 *
 *   AppShell   flex-1 min-h-0 overflow-hidden        <- viewport sized here, once
 *   └ AppMain  flex-1 min-h-0 overflow-hidden       <- locked surfaces never scroll
 *     └ this div  flex h-full min-h-0 flex-col      <- fills what is left
 *
 * Adding `h-[100dvh]` here would measure the viewport a SECOND time. This column
 * is already shorter than the viewport by the mobile back header above it and the
 * fixed tab bar below it, so a fresh 100dvh overflows the box by the height of
 * both and pushes the player's bottom controls under the nav. `h-full` is the
 * correct value because it fills the space actually available.
 *
 * The three regions, and which one scrolls:
 *   - top    - the "Moment / feed-view" header, owned by the root layout, in flow
 *   - middle - `MomentFeed`, which owns exactly ONE scroll region per panel: the
 *              reels use the media feed's own snap scroller, the community panel is
 *              `min-h-0 flex-1 overflow-y-auto`. Both carry `min-h-0`, without
 *              which a panel refuses to shrink and pushes content past the nav.
 *   - bottom - the fixed tab bar, overlaying rather than in flow, so the column
 *              reserves its height rather than being pushed by it.
 *
 * With the header gone this is a pure pass-through that preserves the flex
 * chain — no chrome of its own, which is exactly the "one clean header at the top"
 * the screen needs, owned by the single owner at the root.
 */
export default function FeedLayout({ children }: { children: ReactNode }) {
  /* ── THE STRICT, NON-SCROLLING VIEWPORT LOCK ──────────────────────────────────
     `overflow-hidden` + `min-h-0` + `flex-1` is what makes this screen a LOCKED
     surface rather than a document that happens to be short:
       • `overflow-hidden` — this element can never become a scroll region, so a
         flick at the first or last video cannot chain up to the body.
       • `min-h-0` — a flex item defaults to `min-height:auto`, i.e. its content's
         height. Without this the column refuses to shrink below the player's
         intrinsic height, overflows this box, and the overflow leaks out to the
         body as page scrolling — the header then slides away and the composer's
         bottom row sits under the fixed tab bar.
       • `flex-1 w-full` — fill exactly the region AppMain hands over. NOT
         `h-[100dvh]`: `AppShell` already owns the single viewport measurement
         (it is `flex-1 min-h-0` under the root layout's `h-full` html), so a
         fresh `100dvh` here would measure the viewport a SECOND time and overflow
         this box by the height of the sticky header plus the fixed nav bar.

     The result is the three-region lock the screen needs:
       - top    — the "Moment / feed-view" header, owned by the root layout, in flow
                  and `sticky top-0`, so it is a fixed sibling of the scroll region
       - middle — `MomentFeed`, the only thing here that scrolls (below)
       - bottom — the fixed tab bar, overlaying rather than in flow */
  return (
    /* PLAIN ROOT ELEMENT. No iframe, no WebView, no inner "device" wrapper, and
       no component that renders a preview of the app inside itself — verified by
       inspection: the only `<iframe>`s in the codebase are `MediaEmbed` (a
       click-to-load third-party VIDEO player, scoped to no allow-same-origin and
       no allow-top-navigation) and `GameModal` (the fullscreen HTML5 game
       launcher). `GameModal` mounts only on demand — its provider renders null
       until a member opens a game — so neither frame exists on this route by
       default, and neither points at this app.

       `bg-slate-950` matches `AppShell`'s canvas so the screen paints its own
       surface even if a panel is briefly shorter than the viewport, instead of
       flashing the page behind it.

       DELIBERATELY NOT `min-h-dvh`, despite it being a natural thing to reach for
       here. The viewport is measured ONCE, at `<html class="h-full">` +
       `<body class="min-h-full">` + `AppShell`'s `flex-1 min-h-0`. A fresh
       `min-h-dvh` here would measure the viewport a SECOND time and force this
       column to be a full viewport tall *in addition to* the 4rem mobile header
       above it and the fixed tab bar below — which reintroduces document-level
       scrolling, the exact "messy scrolling" failure the header comment at the
       top of this file documents as already fixed. `h-full` is the correct value
       because it fills the space actually available. */
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-950">
      {children}
    </div>
  );
}