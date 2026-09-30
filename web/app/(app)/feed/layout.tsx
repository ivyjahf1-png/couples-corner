import type { ReactNode } from "react";
import { MobileBackHeader } from "@/components/app/MobileBackHeader";

/**
 * Layout for the Moment screen — the owner of its top header.
 *
 * ── WHY THE HEADER IS MOUNTED HERE ───────────────────────────────────────────
 * `MobileBackHeader` — the component that renders the "Moment" title and the
 * "feed-view" toggle — was never rendered by ANY route. It was written, wired to
 * the view contract in `@/lib/momentView`, and referenced only in comments
 * (`MomentFeed` and `AppShell` both describe it as being rendered by the shell),
 * but nothing ever mounted it. So on `/feed` there was no header at all: no
 * "Moment" label and no toggle. The community panel was unreachable, because
 * `MomentFeed`'s own in-page pill switcher was removed in 2df8761 on the
 * understanding that the header had taken over the job. The header that was
 * supposed to take it over did not exist.
 *
 * That is the whole reason the toggle needed two taps to do anything: the first
 * tap hit nothing at all.
 *
 * Mounted here rather than in `AppShell` deliberately. `AppShell` already
 * renders `MobileHomeHeader`, and adding the sibling globally would put a second
 * bar on every route in the app zone — including ones that bring their own
 * header, such as the conversation view, whose `100dvh` column is explicitly
 * designed to have no shell header above it. A route-scoped layout fixes the
 * reported screen without changing any other screen.
 *
 * ── WHY THE FLEX COLUMN IS REPEATED HERE ────────────────────────────────────
 * The zone layout's `<section>` is a `flex h-full min-h-0 flex-1 flex-col`
 * column, and `MomentFeed` is a `flex h-full min-h-0 flex-col` that expects to
 * BE that column. Inserting a wrapper without the same classes would drop the
 * chain to `100%` height at this element and collapse the player to zero. So
 * this reproduces the column and gives the feed a `min-h-0 flex-1` region below
 * the header, which is what lets the active panel fill the remaining height and
 * scroll inside itself.
 */
export default function FeedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <MobileBackHeader />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}