import { redirect } from "next/navigation";
import { CommunityFeedView } from "@/components/app/CommunityFeedView";
import { requireUser } from "@/lib/auth/authorization";
import { getPublicFeed } from "@/lib/actions/profile";
import { demoFeedPosts } from "@/lib/demo/demo-data";
import type { FeedPostView } from "@/lib/feature/types";

/**
 * The Moment section ? the dual-view feed behind the bottom nav's "Moment" tab.
 *
 * -- WHY TWO VIEWS ----------------------------------------------------------
 * The product has two genuinely different things here and the tab used to serve
 * only one of them, so the other was unreachable and a member tapping "Moment"
 * to watch videos got a blog with no explanation. Both now sit behind an
 * explicit sub-switcher:
 *   ? VIDEOS          ? the immersive full-screen vertical player
 *   ? COMMUNITY FEED  ? a chronological timeline of status posts and photos
 *
 * Both are SERVER-RENDERED here and passed into `MomentFeed` as already-built
 * children. That is deliberate: routing between the two would refetch on every
 * toggle and throw away the scroll position of whichever view you left. See
 * MomentFeed for the mount-both/hide-one approach.
 *
 * -- WHY BOTH FETCHES RUN UP FRONT ------------------------------------------
 * The alternative is fetching the community posts only when the tab is opened.
 * That is faster on first paint, but it makes the toggle asynchronous ? the tab
 * would visibly stall on a cold network, which is exactly the "confusing"
 * feeling this work is meant to remove. The community query is one indexed read
 * over posts, so paying for it up front is cheap.
 *
 * -- WHY `/` KEEPS SERVING THE PLAYER DIRECTLY ------------------------------
 * `/` is what every existing share link and invite deep link resolves to, and it
 * is the Capacitor launch target. It renders `ImmersiveFeed` on its own: that
 * route is a pure, unambiguous "videos" destination, and a member arriving from
 * a share link should never have to guess which tab they are on. `ImmersiveFeed`
 * is still the single implementation ? both paths call it.
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
 * else's ? without this, a member sees a "Hi" button on their own post, which
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
    // Engagement is now READ, not invented. `getPublicFeed` returns the real like
    // count and whether this viewer liked the post (see the post_likes read there).
    // The previous `likeCount: 0, likedByMe: false` was a deliberate stand-in while
    // likes were local-only UI state; that comment claimed the payload "did not
    // return engagement counts", which is no longer true, and keeping the stand-in
    // would overwrite a real count with zero on every render.
    likeCount: post.likeCount,
    likedByMe: post.likedByMe,
    // Comment counts ARE still 0, and unlike the like count this is not a stand-in
    // for missing data: there is no post-comment backend at all yet (see
    // `CommentSection`'s own TODO). Inventing a total the app cannot honour when
    // the button is tapped would be worse than showing none.
    commentCount: 0,
    canDelete: false,
  }));
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ moment?: string; view?: string }>;
}) {
  const user = await requireUser();
  const { moment, view } = await searchParams;

  // Defence in depth. `requireUser()` already guarantees a session, so this is
  // unreachable in practice ? but if the guard is ever dropped, this route must
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

  /* THE FEED IS NOW THIS ROUTE'S WHOLE JOB. It used to wrap the immersive player
     and the community timeline in a `MomentFeed` dual-view toggle, because "Moment"
     was one tab serving two very different things and the other was unreachable.

     The bottom bar now has a dedicated "Feed" tab AND a dedicated "Moment" tab, so
     `/moments` renders the player and `/feed` renders the timeline. Rendering both
     here and hiding one behind `?view=` would recreate the exact ambiguity this split
     exists to remove - a member tapping "Moment" must never get a blog. */
  // LOCKED COLUMN, NOT A PAGE SCROLL. `h-full` + `max-h-[100dvh]` chained off
  // each flex parent (see `AppMain`'s `h-full` inner wrapper), so the timeline
  // measures the padded box and shrinks to clear the fixed bottom nav rather
  // than hiding under it. `overflow-hidden` here + `overflow-y-auto` on the
  // inner region = ONE scroll surface: body-scroll conflicts gone, no
  // lockups, momentum scrolling on iOS via the touch flags. `pb-28`
  // reserves the 5rem fixed tab bar + 2rem breathing room (dropped at
  // `md:` where the sidebar rail takes over).
  return (
    <div className="flex h-full max-h-[100dvh] min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain pb-28 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] md:pb-8">
        <CommunityFeedView posts={posts} canPost={Boolean(user)} userId={user.uid} />
      </div>
    </div>
  );
}
