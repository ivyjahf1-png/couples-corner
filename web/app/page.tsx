import { FeedCreateLauncher } from "@/components/app/FeedCreateLauncher";
import { getCurrentSessionUser } from "@/lib/server/session";
import { createFeedPostAction, getPublicFeed } from "@/lib/actions/profile";

import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import { ContentSlot } from "@/components/content/ContentSlot";
import { AdvertCardGrid } from "@/components/content/AdvertCardGrid";
import { demoFeedPosts } from "@/lib/demo/demo-data";
import type { FeedPostView } from "@/lib/feature/types";

/**
 * The community feed. Create-post composer + a reverse-chronological list of
 * public posts. Real posts come from getPublicFeed() when available; the
 * demo fixtures act as a graceful fallback so the UI is never empty.
 */
function mapFeedPosts(
  posts: Awaited<ReturnType<typeof getPublicFeed>>["posts"]
): FeedPostView[] {
  return posts.map((post) => ({
    id: post.id,
    authorName: post.authorName ?? "Member",
    authorKind: "person",
    at: post.createdAt,
    body: post.content,
    authorAvatar: post.authorAvatar,
    verified: false,
    vip: false,
    mediaUrls: post.mediaUrls,
    mediaCount: post.mediaUrls.length > 0 ? post.mediaUrls.length : undefined,
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    canDelete: false,
  }));
}

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await getCurrentSessionUser();
  let posts: FeedPostView[] = demoFeedPosts;
  try {
    const feed = await getPublicFeed();
    if (feed.posts.length > 0) {
      posts = mapFeedPosts(feed.posts);
    }
  } catch {
    posts = demoFeedPosts;
  }

  return (
    <div className="flex flex-col gap-8">
      <FeedCreateLauncher userId={session?.uid} />

      <PageHeader
        eyebrow="Community"
        title="Feed"
        subtitle="Share moments and see what your connections are up to. Posts are visible to your connections by default."
      />


            {/* Sponsored / featured content */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-white">Sponsored</h2>
        <ContentSlot placement="feed" limit={10} />
      </div>

      {/* Advert cards grid (admin-managed) */}
      <AdvertCardGrid placement="feed" limit={10} columns={3} />

      {/* Feed list */}
      {posts.length === 0 ? (
        <EmptyState
          icon="moments"
          title="Your feed is quiet"
          body="When your connections share moments, they'll appear here. Be the first to post something."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}



