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
 * With the header gone this is a pure pass-through that preserves the flex
 * chain — no chrome of its own, which is exactly the "one clean header at the top"
 * the screen needs, owned by the single owner at the root.
 */
export default function FeedLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>;
}