import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { demoFeedPosts } from "@/lib/demo/demo-data";

/**
 * The community feed. Create-post composer + a reverse-chronological list of
 * posts from connections. All content is clearly-labeled structural demo data
 * until Firestore reads land.
 */
export default function FeedPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Community"
        title="Feed"
        subtitle="Share moments and see what your connections are up to. Posts are visible to your connections by default."
      />

      {/* Create-post composer (visual until Firebase) */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Icon name="plus" className="h-5 w-5" />
          </span>
          <label htmlFor="new-post" className="sr-only">
            Write a post
          </label>
          <textarea
            id="new-post"
            rows={2}
            placeholder="Share a moment with your connections…"
            className="flex-1 resize-none rounded-xl border border-ink-200 bg-surface px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between border-t border-ink-200 pt-3">
          <div className="flex items-center gap-2 text-sm text-ink-600">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-ink-100"
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
        <p className="text-xs text-ink-500">
          Composer preview — posting and media uploads arrive with Firebase.
        </p>
      </Card>

      {/* Feed list */}
      {demoFeedPosts.length === 0 ? (
        <EmptyState
          icon="moments"
          title="Your feed is quiet"
          body="When your connections share moments, they'll appear here. Be the first to post something."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {demoFeedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
