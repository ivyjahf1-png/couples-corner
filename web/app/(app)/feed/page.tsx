import { redirect } from "next/navigation";
import { MomentFeed } from "@/components/app/MomentFeed";
import { CommunityFeedView } from "@/components/app/CommunityFeedView";
import { ImmersiveFeed } from "@/components/app/ImmersiveFeed";
import { requireUser } from "@/lib/auth/authorization";
import { getPublicFeed } from "@/lib/actions/profile";
import { demoFeedPosts } from "@/lib/demo/demo-data";
import type { FeedPostView } from "@/lib/feature/types";

/**
 * The Moment section — the dual-view feed behind the bottom nav's "Moment" tab.
 *
 * ── WHY TWO VIEWS ──────────────────────────────────────────────────────────
 * The product has two genuinely different things here and the tab used to serve
 * only one of them, so the other was unreachable and a member tapping "Moment"
 * to watch videos got a blog with no explanation. Both now sit behind an
 * explicit sub-switcher:
 *   • VIDEOS          — the immersive full-screen vertical player
 *   • COMMUNITY FEED  — a chronological timeline of status posts and photos
 *
 * Both are SERVER-RENDERED here and passed into `MomentFeed` as already-built
 * children. That is deliberate: routing between the two would refetch on every
 * toggle and throw away the scroll position of whichever view you left. See
 * MomentFeed for the mount-both/hide-one approach.
 *
 * ── WHY BOTH FETCHES RUN UP FRONT ──────────────────────────────────────────
 * The alternative is fetching the community posts only when the tab is opened.
 * That is faster on first paint, but it makes the toggle asynchronous — the tab
 * would visibly stall on a cold network, which is exactly the "confusing"
 * feeling this work is meant to remove. The community query is one indexed read
 * over posts, so paying for it up front is cheap.
 *
 * ── WHY `/` KEEPS SERVING THE PLAYER DIRECTLY ──────────────────────────────
 * `/` is what every existing share link and invite deep link resolves to, and it
 * is the Capacitor launch target. It renders `ImmersiveFeed` on its own: that
 * route is a pure, unambiguous "videos" destination, and a member arriving from
 * a share link should never have to guess which tab they are on. `ImmersiveFeed`
 * is still the single implementation — both paths call it.
 *
 * AUTHENTICATED: the player shows personalised "you reacted" state and spends
 * the member's tokens on the sponsored card, so this is a member surface and is
 * guarded like the rest of the app zone. Guests get the landing page at `/`.
 */

/**
 * Map the raw feed rows onto the card view model PostCard renders.
 *
 * `viewerId` is threaded in only to compute `isOwn`. The public feed query is
 * not scoped to the viewer, so its own posts come back mixed in with everyone
 * else's — without this, a member sees a "Hi" button on their own post, which
 * would offer to start a conversation with themselves.
 */
function mapFeedPosts(
  posts: Awaited<ReturnType<typeof getPublicFeed>>["posts"],
  viewerId: string
): FeedPostView[] {
  return posts.map((post) => ({
    id: post.id,
    // The recipient for the per-post "Hi" deep-link. Falls back to undefined
    // rather than "" so PostCard can treat "no id" and "empty id" the same.
    authorId: post.authorId || undefined,
    isOwn: Boolean(post.authorId) && post.authorId === viewerId,
    authorName: post.authorName ?? "Member",
    authorKind: "person",
    at: post.createdAt,
    body: post.content,
    authorAvatar: post.authorAvatar,
    // Not fabricated: the public feed query does not return verification or
    // membership state, so claiming either would be inventing a badge.
    verified: false,
    vip: false,
    mediaUrls: post.mediaUrls,
    mediaCount: post.mediaUrls.length > 0 ? post.mediaUrls.length : undefined,
    // Engagement counts are not in the public feed payload. Rendered as 0
    // rather than omitted, so a card never claims a count it did not read.
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    canDelete: false,
  }));
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ moment?: string }>;
}) {
  const user = await requireUser();
  const { moment } = await searchParams;

  // Defence in depth. `requireUser()` already guarantees a session, so this is
  // unreachable in practice — but if the guard is ever dropped, this route must
  // not render with a null viewer id, which would make every reaction and
  // comment look unowned.
  if (!user) redirect("/login");

  // Fail-soft: a database problem degrades to the demo timeline rather than
  // erroring the whole route, so the tab still opens.
  let posts: FeedPostView[] = demoFeedPosts;
  try {
    const feed = await getPublicFeed();
    if (feed.posts.length > 0) posts = mapFeedPosts(feed.posts, user.uid);
  } catch {
    posts = demoFeedPosts;
  }

  // A malformed id would travel to a client component as an attribute, so it is
  // trimmed and length-capped before it crosses the boundary.
  const deepLink = moment?.trim().slice(0, 64) || null;

  return (
    <MomentFeed
      videos={<ImmersiveFeed viewerId={user.uid} deepLinkMomentId={deepLink} />}
      community={
        <CommunityFeedView posts={posts} canPost={Boolean(user)} userId={user.uid} />
      }
    />
  );
}