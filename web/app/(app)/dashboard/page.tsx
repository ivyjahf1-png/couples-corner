/**
 * Legacy "/dashboard" — now a thin redirect to EXPLORE.
 *
 * The immersive moment and media feed lives at the root route (`app/page.tsx`)
 * and is reached from the "Moment" tab on /feed. Explore is the product's core
 * loop and is now the default landing screen after sign-in/sign-up, so this
 * alias points there rather than at the feed.
 *
 * The `?q=` passthrough is preserved: the root route still owns search
 * resolution (exact code -> profile, ambiguous -> /search), so a deep link like
 * /dashboard?q=21ATZE must keep working rather than dropping the query.
 *
 * Kept rather than deleted because it is a bookmarked legacy URL and
 * `requireGuest` redirects here for an already-signed-in member.
 */
import { redirect } from "next/navigation";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q?.trim() ? `/?q=${encodeURIComponent(q.trim())}` : "/discover");
}