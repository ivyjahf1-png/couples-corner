/**
 * Home ("Your corner") - now a thin redirect.
 *
 * The immersive moment and media feed is the real home experience and lives at
 * the root route (`app/page.tsx`). This page previously rendered the
 * "Welcome back" / "Your corner" hero, the "Enter 5-character User ID" search,
 * the Discover + quick-action grid, "Suggested for you" and "Near you" - all of
 * which are now removed.
 *
 * A redirect (rather than a second implementation) keeps existing deep links,
 * the "Home" nav entry and the logo link working without duplicating feed
 * state, and preserves `?q=` search handling on the root route.
 */
import { redirect } from "next/navigation";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q?.trim() ? `/?q=${encodeURIComponent(q.trim())}` : "/");
}