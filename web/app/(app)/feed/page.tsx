import { FeedCreateLauncher } from "@/components/app/FeedCreateLauncher";
import { getCurrentSessionUser } from "@/lib/server/session";
import { createFeedPostAction, getPublicFeed } from "@/lib/actions/profile";

import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
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

      {/* Create-post launcher opens the authenticated photo/video composer. */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
            <Icon name="plus" className="h-5 w-5" />
          </span>
          <label htmlFor="new-post" className="sr-only">
            Write a post
          </label>
          <textarea
            id="new-post"
            rows={2}
            placeholder="Share a moment with your connections…"
            className="flex-1 resize-none rounded-xl border border-ink-700 bg-surface px-4 py-2.5 text-sm text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between border-t border-ink-700 pt-3">
          <div className="flex items-center gap-2 text-sm text-ink-300">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-white/10"
              aria-label="Add photo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="M21 17 L16 12 L11 17 L5 11 L3 13" />
              </svg>
              Photo
            </button>
          </div>
          <Button size="sm" disabled>
            Post
          </Button>
        </div>
        <p className="text-xs text-ink-400">
          Composer preview — posting and media uploads arrive with Firebase.
        </p>
      </Card>

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
