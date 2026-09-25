import { redirect } from "next/navigation";
import { MediaFeed } from "@/components/app/MediaFeed";
import { MediaFeedSearch } from "@/components/app/MediaFeedSearch";
import { LocationBadge } from "@/components/app/LocationBadge";
import { getSessionUser } from "@/lib/auth/authorization";
import { AppShell } from "@/components/app/AppShell";
import { getRecentMoments } from "@/lib/server/tasks";
import { resolveUserCode } from "@/lib/server/profiles";
import type { MomentView } from "@/lib/moments";

export const dynamic = "force-dynamic";

/**
 * Home - the immersive moment & media feed.
 *
 * A full-bleed, single-card-at-a-time viewer over the public `moments` table.
 * The Task Center upload form (`/task/upload-moment`) writes to that same
 * table via publishMoment(), so any image or video a member uploads is
 * syndicated here immediately for community viewing - no separate feed to keep
 * in sync.
 *
 * All legacy marketing blocks and grid widgets have been removed; the only
 * chrome is the search field, the location badge and the media itself.
 *
 * NOTE: this route is intentionally PUBLIC and must never call requireUser().
 * requireUser() sends anonymous visitors to "/login"; if this route ever
 * guarded itself the two routes would bounce against each other forever
 * (NEXT_REDIRECT loop -> blank screen). Signed-out visitors get the feed
 * without app chrome.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSessionUser();
  const { q } = await searchParams;

  // A 6-character public code resolves straight to that member's profile.
  // Anything else (a username, say) falls through to /explore, which has the
  // broader member search.
  const query = q?.trim() ?? "";
  if (query) {
    const found = await resolveUserCode(query).catch(() => null);
    if (found) redirect(`/profile/${found.userId}`);
    redirect(`/explore?q=${encodeURIComponent(query)}`);
  }

  // Fail-soft: an unconfigured or unreachable database still renders the
  // player shell rather than erroring the whole route.
  const moments: MomentView[] = await getRecentMoments(12).catch(() => []);

  const view = (
    <MediaFeed
      moments={moments}
      viewerId={session?.uid ?? null}
      searchSlot={<MediaFeedSearch action="/" />}
      topRightSlot={<LocationBadge />}
      emptyTitle="No moments yet"
      emptyBody="Members who share a photo or short video in the Task Center see it here instantly. Be the first."
    />
  );

  // Signed-in members get the full app chrome (sidebar + fixed bottom nav).
  // Signed-out visitors get the same feed without app chrome.
  return session ? <AppShell>{view}</AppShell> : view;
}