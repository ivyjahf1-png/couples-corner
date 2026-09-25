import { redirect } from "next/navigation";
import { MediaFeed } from "@/components/app/MediaFeed";
import { MediaFeedSearch } from "@/components/app/MediaFeedSearch";
import { LocationBadge } from "@/components/app/LocationBadge";
import { getSessionUser } from "@/lib/auth/authorization";
import { AppShell } from "@/components/app/AppShell";
import { getRecentMoments } from "@/lib/server/tasks";
import { searchMembers } from "@/lib/server/profiles";
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

  // Search: an exact 6-character code or a single unambiguous name goes
  // straight to the profile; anything with several candidates lands on the
  // dedicated results page so the user can pick.
  const query = q?.trim() ?? "";
  if (query) {
    const result = await searchMembers(query).catch(() => null);
    if (result?.kind === "exact") redirect(`/profile/${result.userId}`);
    if (result?.kind === "results" && result.users.length === 1) {
      redirect(`/profile/${result.users[0].userId}`);
    }
    redirect(`/search?q=${encodeURIComponent(query)}`);
  }

  // Fail-soft: an unconfigured or unreachable database still renders the
  // player shell rather than erroring the whole route. The viewer id lets the
  // feed mark which moments this member has already reacted to.
  const moments: MomentView[] = await getRecentMoments(12, session?.uid ?? null).catch(() => []);

  const view = (
    <MediaFeed
      moments={moments}
      viewerId={session?.uid ?? null}
      /* Inside AppShell the shell owns the viewport lock, so the feed must fill
         the region rather than claim a full 100dvh of its own. */
      fill={Boolean(session)}
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