import { PostCard } from "@/components/app/PostCard";
import { EmptyState } from "@/components/app/EmptyState";
import { Icon } from "@/components/landing/Icon";
import type { FeedPostView } from "@/lib/feature/types";

/**
 * The Community Feed view: a chronological timeline of status posts and photos.
 *
 * ── WHY THIS IS SEPARATE FROM THE PLAYER ───────────────────────────────────
 * The player is a media-first, one-card-at-a-time experience. This is the
 * opposite: a scrolling list where the member is reading words and images, and
 * where the fraud-safety banner has room to actually be read. Forcing the
 * banner onto a full-bleed video player would mean overlaying it on the media
 * the member is trying to watch, so the two genuinely want different layouts.
 *
 * ── THE SCAM WARNING, AND WHY IT IS UNDISMISSABLE HERE ──────────────────────
 * This is the one place in the app that surfaces fraud advice, because this is
 * the only surface where a member reads unsolicited text from strangers — which
 * is exactly where a scam arrives. On a video player the same message would be
 * visual noise over the media.
 *
 * It is NOT dismissible, and that is deliberate. The guidance is two lines of
 * evergreen safety advice, it appears above content the member has not chosen
 * to read yet, and it costs no interaction. A dismissible warning on a
 * scrolling timeline is a warning that gets dismissed once and never seen
 * again, which is worse than no warning at all — it creates the impression the
 * member has been told, while having told them nothing.
 *
 * Wording is advisory, not accusatory: it says what to watch for and where to
 * report, and it does NOT claim we have verified every message. The safety page
 * already draws that line carefully ("flagged for review - never as an
 * automatic ban") and this banner must not overstate what the product does.
 */
export function CommunityFeedView({
  posts,
  canPost,
}: {
  posts: FeedPostView[];
  canPost: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── SCAM / SAFETY WARNING ───────────────────────────────────────────
          `role="note"` rather than `role="alert"`: it is not urgent, and
          `alert` would interrupt a screen reader mid-sentence on every visit
          to this view. The amber left border is the visual signal; the shield
          glyph is decorative, so the text alone carries the meaning. */}
      <aside
        role="note"
        className="flex gap-3 rounded-2xl border border-amber-400/30 border-l-4 border-l-amber-400 bg-amber-500/[0.07] p-4"
      >
        <span
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300"
        >
          <Icon name="shield" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-amber-100">
            Stay safe — a quick heads-up
          </h2>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">
            Never send money, gift cards or codes to someone you have not met in
            person, and be wary of urgent requests, too-good-to-be-true offers,
            or links to files and apps. If a message pressures you to act
            quickly, that pressure is the warning sign.
          </p>
          <p className="mt-2 text-xs leading-5 text-amber-100/70">
            Nothing on this app will ever ask you for a password, a code we sent
            you, or a payment to unlock your account. Report anything that does —
            we read every report.
          </p>
          <a
            href="/safety"
            className="mt-2 inline-block text-xs font-semibold text-amber-200 underline underline-offset-2 hover:text-amber-100"
          >
            Read the safety centre
          </a>
        </div>
      </aside>

      {canPost ? (
        <div className="rounded-2xl border border-ink-700 bg-surface p-4">
          <h2 className="text-sm font-semibold text-white">Share with the community</h2>
          <p className="mt-1 text-xs leading-5 text-ink-300">
            Post a status or a photo and it appears here for everyone. For short
            videos, use the Videos tab.
          </p>
        </div>
      ) : null}

      {posts.length === 0 ? (
        <EmptyState
          icon="moments"
          title="Nothing here yet"
          body="When members share a status or a photo it will show up here. Be the first."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}