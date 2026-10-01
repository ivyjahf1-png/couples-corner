import { MediaFeed } from "@/components/app/MediaFeed";
// MediaFeedSearch is NOT imported here. It moved to /discover; see the
// searchSlot note below.
import { LocationBadge } from "@/components/app/LocationBadge";
import { SponsoredMomentCard } from "@/components/app/SponsoredMomentCard";
import { getNextAdRewardAtAction } from "@/lib/actions/ad-rewards";
import { getRecentMoments } from "@/lib/server/tasks";
import type { MomentView } from "@/lib/moments";

/**
 * The immersive media feed, as a Server Component.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * `/` and `/feed` must show the SAME player: a vertical scroll-snap video feed
 * with overlay creator handles, an audio toggle, an engagement rail (hearts,
 * comments, share) and a floating upload widget. It previously lived inline in
 * `app/page.tsx` only, so when the bottom nav's "Moment" tab was pointed at
 * `/feed` — which served a static `PostCard` blog list — tapping the tab showed
 * a blog instead of videos.
 *
 * Extracting it means the two routes cannot drift. The alternative, copying the
 * markup into `feed/page.tsx`, would have put two copies of the snap
 * scroller, the overlay chrome and the sponsored card in the tree, and the next
 * change to one would leave the other stale. That is the bug being fixed.
 *
 * The data fetching lives here too, so both routes load the feed the same way:
 *   • `getRecentMoments` reads the SAME `moments` table the Task Center upload
 *     form writes to, so anything a member uploads is syndicated immediately —
 *     there is no second feed to keep in sync.
 *   • Both calls are `.catch(() => …)` fail-soft. An unconfigured or
 *     unreachable database renders the empty-state player rather than 500-ing
 *     the route, which is what keeps the app usable on a bad deploy.
 */
export async function ImmersiveFeed({
  viewerId,
  deepLinkMomentId = null,
  moments: providedMoments,
}: {
  viewerId: string;
  /** Moment id to scroll to on mount, from `?moment=`. */
  deepLinkMomentId?: string | null;
  /**
   * Pre-fetched moments. Optional so a host that already has the rows (the
   * home page does not, but a future host might) can pass them in rather than
   * paying for a second query.
   */
  moments?: MomentView[];
}) {
  const moments =
    providedMoments ??
    (await getRecentMoments(12, viewerId).catch(() => [] as MomentView[]));

  // Cooldown state for the sponsored card's reward, so a member who already
  // claimed sees a live countdown instead of a button that quietly stops
  // working. Fail-soft to null (claimable).
  const nextAdRewardAt = await getNextAdRewardAtAction().catch(() => null);

  return (
    <MediaFeed
      moments={moments}
      viewerId={viewerId}
      // Inside AppShell the shell owns the viewport lock, so the feed fills the
      // region rather than claiming a full 100dvh of its own.
      fill
      /* NO searchSlot HERE ANYMORE.

         The search field moved to Explore (/discover), which is where searching
         for a person actually belongs: this is a video/photo feed, and a member
         who wants to find someone was scrolling strangers to type a code. It
         also cost vertical room on the one screen that must fill the viewport.

         It is not lost — it is on the Explore header, and it submits `?q=` to
         /discover, which now actually filters by name or code. See the note in
         lib/server/discovery.ts. */
      topRightSlot={<LocationBadge />}
      /* A PLAIN ELEMENT, not a render function: this is a Server Component and
         MediaFeed is a Client Component, and a function prop cannot cross that
         boundary (it throws "Functions cannot be passed directly to Client
         Components" at runtime). The card reads its own active state from
         FeedActiveContext inside the feed. */
      sponsoredSlot={<SponsoredMomentCard viewerId={viewerId} nextAvailableAt={nextAdRewardAt} />}
      /* Second position: the first card stays a real moment, so a member opens
         on community content rather than on an ad. */
      sponsoredPosition={1}
      /* Deep link from a share link: scroll straight to that moment instead of
         opening on whatever card happens to be first. Trimmed and
         length-capped by the caller because it arrives from the URL. */
      deepLinkMomentId={deepLinkMomentId}
      rewardSlot={null}
      emptyTitle="No moments yet"
      emptyBody="Members who share a photo or short video in the Task Center see it here instantly. Be the first."
    />
  );
}