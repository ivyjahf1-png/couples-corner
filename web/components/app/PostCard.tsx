"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { ReportDialog } from "@/components/app/ReportDialog";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import { GlassActionButton } from "@/components/app/GlassActions";
import { Icon } from "@/components/landing/Icon";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
import { togglePostLikeAction } from "@/lib/actions/profile";
import type { FeedPostView } from "@/lib/feature/types";

/**
 * The yellow "Hi" button: a one-tap way to open a conversation with a post's
 * author from inside the timeline.
 *
 * ── WHY IT SENDS RATHER THAN LINKS ─────────────────────────────────────────
 * A link needs a destination route to compose a first message, and none exists:
 * the only chat routes are `/messages` (the inbox) and `/messages/<id>` (an
 * existing thread), and a thread id cannot be known until a message is written.
 * So this calls `sendFirstImpressionAction`, which creates the direct
 * conversation on first send and REUSES it afterwards, then routes into the
 * thread it just wrote to. Linking to a guessed route would have produced a
 * dead control.
 *
 * ── WHY "Hi" AND NOT A COMPOSER ────────────────────────────────────────────
 * The copy is the whole message. A member tapping this has chosen to open a
 * conversation, and making them type before the thread exists would add a step
 * to the one action on this card whose value is its immediacy. The text is
 * short, human, and non-transactional — it carries no claim, no request, and
 * nothing a recipient could mistake for a scam.
 *
 * The server still validates: it rejects empty bodies, caps the length, and
 * refuses self-sends. This component only decides what to render and what to
 * show when that fails.
 */
function HiButton({ recipientId, authorName }: { recipientId: string; authorName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await sendFirstImpressionAction({ recipientId, body: "Hi!" });
      if (!result.ok) {
        setError(result.error ?? "Couldn't send that. Try again.");
        return;
      }
      // Land in the thread that was just created or reused.
      if (result.conversationId) router.push(`/messages/${result.conversationId}`);
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={send}
        disabled={pending}
        aria-label={`Say hi to ${authorName}`}
        className="rounded-full bg-amber-300 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-[0_4px_14px_rgba(252,211,77,0.35)] transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? "…" : "Hi"}
      </button>
      {/* The failure is announced rather than swallowed: a silent failure would
          leave the member believing a message had been sent to a stranger. */}
      {error ? (
        <p role="alert" className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-danger-500/40 bg-surface px-2 py-1 text-[11px] leading-4 text-danger-200 shadow-lifted">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Relative timestamp for a feed card: "now", "12m", "3h", "2d", then a date.
 *
 * WHY THIS IS NOT `toLocaleDateString`: the raw value is an ISO string straight
 * from Postgres, so the card was printing "2026-09-29T18:04:11.204Z" under every
 * post's name — machine output in the one place the card is meant to feel human.
 *
 * Dated feeds are read by recency, and "3h" is the information a reader actually
 * uses; the exact instant is still on the element's `title`.
 *
 * The thresholds are the ones people expect: minutes up to an hour, hours up to a
 * day, days up to a week, then an absolute date because "3mo" stops being useful
 * for judging whether a post is still relevant.
 *
 * Deliberately NOT locale-formatted and NOT `Intl.RelativeTimeFormat`: both
 * hydrate differently on the server and the client, which React reports as a
 * hydration mismatch on every card in the feed. `Date.now()` has the same problem,
 * so this is only ever called after mount — see the `mounted` gate below.
 *
 * An unparseable input returns it unchanged: a visibly odd row is better than a
 * blank timestamp that looks like a rendering bug.
 */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  // Seconds are not worth showing at this granularity, and a sub-second age would
  // render as "now" flickering to "1m" on its own.
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const then2 = new Date(then);
  const month = then2.toLocaleString("en", { month: "short", timeZone: "UTC" });
  return `${month} ${then2.getUTCDate()}`;
}

/* Hydration-safe "am I on the client yet", WITHOUT a mount effect.

   `useEffect(() => setMounted(true), [])` is the obvious way to stop the server
   and the client's first render disagreeing, and it is what this file did first —
   but React's own `set-state-in-effect` rule rejects it: it is a cascading render
   purely to work around a value that was never wrong.

   `useSyncExternalStore` is the sanctioned answer. `subscribe` returns an
   unsubscribe that does nothing, so React never re-reads the store after mount;
   it simply asks `getSnapshot` during render. The server gets `() => false` and
   the client gets `() => true` — which IS a mismatch, and React handles it by
   re-rendering the client, which is precisely the behaviour we want and does so
   without a wasted state update. */
const emptySubscribe = () => () => {};
const neverTrue = () => false;
const alwaysTrue = () => true;

/**
 * Feed post card: author header, body, optional media placeholder grid,
 * like/comment actions, and an authorization-aware post menu (delete only
 * when canDelete; report always available). Mutations arrive with Firebase —
 * like/delete are honest visual states until the Server Actions land.
 */
export function PostCard({ post }: { post: FeedPostView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Seeded from the server payload, which now reads real `post_likes` rows (see
  // `getPublicFeed`). This used to be local-only state with a `TODO(Firebase)`, so
  // a like vanished on refresh and the count could only ever read zero.
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [likePending, setLikePending] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [following, setFollowing] = useState(false);
  const [, startLikeTransition] = useTransition();

  /**
   * Gate for the relative timestamp.
   *
   * `formatRelativeTime` reads `Date.now()`, which differs between the server
   * render and the client's first render — a guaranteed hydration mismatch on
   * every card. The first client render therefore prints the raw timestamp
   * (identical to the server's output) and only afterwards swaps in the relative
   * form. See the `emptySubscribe` helpers above for why this is not a
   * `useEffect`.
   */
  const mounted = useSyncExternalStore(emptySubscribe, alwaysTrue, neverTrue);

  /**
   * Like / unlike, persisting to `post_likes`.
   *
   * Optimistic first, then reconciled against the server's authoritative count —
   * the same shape the moment reactions use, so a like cannot "snap back" to the
   * old value on a slow round trip.
   *
   * The `likePending` guard is what makes a double-tap harmless: the second tap
   * arrives while the first is still in flight, and without it both would flip
   * from the same stale `liked` and the last writer would win, which is how a
   * fast double-tap used to leave the heart on with the count at zero. Ignoring
   * the tap is the correct reading — the member's intent is already in flight.
   */
  function toggleLike() {
    if (likePending) return;
    const nextLiked = !liked;
    const previous = { liked, likeCount };
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    setLikeError(null);
    setLikePending(true);
    startLikeTransition(async () => {
      const result = await togglePostLikeAction(post.id);
      setLikePending(false);
      if (!result.ok) {
        // Roll back rather than leaving the UI claiming a like that did not save.
        setLiked(previous.liked);
        setLikeCount(previous.likeCount);
        setLikeError(result.error ?? "Couldn't save your like");
        return;
      }
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70 shadow-card backdrop-blur-sm transition-colors hover:border-white/[0.14]">
      {/* ── HEADER ───────────────────────────────────────────────────────────
          Avatar, name, verified tick and timestamp on one baseline, exactly as
          the reference card reads. `items-center` (was `items-start`) so the
          avatar, name, badge and time share a centre line — with `items-start`
          the timestamp sat under the name while the 44px avatar ran past both,
          which is what made the block look misaligned rather than designed.

          The whole header is a single flex row with the menu pinned right, so
          the name truncates rather than pushing the overflow control off the
          card on a long display name. */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        {/* `src` was never passed, so every member's photo was fetched by the
            feed query and then thrown away in favour of initials. The query
            selects `authorAvatar` specifically for this. */}
        <Avatar name={post.authorName} kind={post.authorKind} src={post.authorAvatar} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <a href={post.authorHref ?? "#"} className="truncate text-sm font-semibold text-white hover:text-brand-300">{post.authorName}</a>
            {post.verified ? <span title="Verified creator" className="shrink-0 text-xs text-sky-300">✓</span> : null}
            {post.vip ? <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">VIP</span> : null}
          </div>
          {/* `post.at` is a raw ISO string from the database, so it was printing
              as "2026-09-29T18:04:11.204Z" under the name — machine output in the
              one place the card is meant to feel human. `formatRelativeTime`
              turns it into "2h"; the full timestamp stays in `title` so the
              exact time is still available on hover/long-press.

              Falls back to the raw value if the string is unparseable, which
              keeps a bad row visible rather than rendering a blank. */}
          <time
            dateTime={post.at}
            title={post.at}
            className="mt-0.5 block text-xs text-slate-400"
          >
            {mounted ? formatRelativeTime(post.at) : post.at}
          </time>
        </div>

        {/* Post menu */}
        <div className="relative">
          <button
            type="button"
            aria-label="Post options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-white/10 hover:text-ink-100"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
              <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-xl border border-ink-700 bg-surface py-1 shadow-lifted"
            >
              {post.canDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-300 hover:bg-danger-500/10"
                >
                  <Icon name="flag" className="h-4 w-4" /> Delete post
                </button>
              ) : null}
              <div className="px-3 py-2">
                <ReportDialog
                  targetLabel="this post"
                  entityType="post"
                  entityId={post.id}
                  triggerLabel="Report post"
                  triggerVariant="ghost"
                  triggerSize="sm"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <p className="whitespace-pre-line text-sm leading-6 text-slate-100">{post.body}</p>
        {post.mediaUrls?.length ? (
          /* Rounded, clipped media box with a FIXED aspect ratio on every tile.

             The fixed ratio is the point: without it a tall portrait photo would
             push that card's actions far below the fold while its neighbours
             stayed put, and the timeline read as broken rather than varied.
             `object-cover` inside a fixed-ratio box is safe for exactly that
             reason — it crops, it never distorts. `overflow-hidden` on the
             parent clips the tiles to ONE outer radius, so the grid reads as a
             single clean rounded rectangle instead of several independently
             rounded squares with gaps showing through. */
          <div
            className={`mt-3 grid gap-1 overflow-hidden rounded-2xl ${
              post.mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {post.mediaUrls.slice(0, 4).map((url, i) => url.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
              <video key={`${url}-${i}`} src={url} controls playsInline className="aspect-[4/3] w-full bg-black object-cover" />
            ) : (
              <img
                key={`${url}-${i}`}
                src={url}
                alt={post.body ? `Photo by ${post.authorName}` : `Photo ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full bg-surface-muted object-cover"
              />
            ))}
          </div>
        ) : post.mediaCount ? (
          <div className="mt-3 flex aspect-video items-center justify-center rounded-xl bg-surface-muted text-xs text-ink-400">Creator media preview</div>
        ) : null}
      </div>

      {/* ── ACTION BAR ────────────────────────────────────────────────────────────
          Like, comment and Follow on the left, "Hi" in the corner — the
          arrangement the reference card uses, with a hairline above so the row
          reads as a distinct toolbar rather than trailing off the media.

          `min-h-11` on the row's children is what makes this usable on a phone:
          the previous controls were sized to their labels (~32px), which is under
          the 44px minimum and is why an "active bottom action bar" kept getting
          missed on the first tap.

          The like error is rendered here rather than silently dropped: a like
          that fails to save must not leave a filled heart claiming otherwise. */}
      <div className="flex items-center gap-1 border-t border-white/[0.08] px-2 py-1">
        <GlassActionButton
          icon="heart"
          label={likeCount === 1 ? "like" : "likes"}
          count={likeCount}
          variant="like"
          size="sm"
          active={liked}
          onClick={toggleLike}
          ariaLabel={liked ? "Remove your like" : "Like this post"}
        />
        <GlassActionButton
          icon="chat"
          label={post.commentCount === 1 ? "comment" : "comments"}
          count={post.commentCount}
          variant="comment"
          size="sm"
          active={commentsOpen}
          onClick={() => setCommentsOpen((v) => !v)}
          ariaLabel={commentsOpen ? "Hide comments" : "Show comments"}
        />
        <button
          type="button"
          onClick={() => setFollowing((v) => !v)}
          aria-pressed={following}
          className={`min-h-11 rounded-full px-3 text-xs font-semibold transition ${following ? "bg-emerald-500/15 text-emerald-300" : "bg-brand-500/15 text-brand-200 hover:bg-brand-500/25"}`}
        >
          {following ? "Following" : "Follow"}
        </button>

        {/* A failed like is announced in place, where the member is looking, and
            is not a modal — a transient warning about a reaction must not
            interrupt reading the timeline. */}
        {likeError ? (
          <span role="alert" className="ml-1 truncate text-[11px] text-rose-300">{likeError}</span>
        ) : null}

        {/* ── "Hi" — the direct-chat shortcut ─────────────────────────────────
            Bright yellow and pushed to the far right, immediately after
            Follow. It is the one control here that starts a CONVERSATION
            rather than reacting in place, so it earns the strongest colour on
            the card: a member scrolling the timeline should be able to
            recognise "this is how I talk to this person" without reading.

            `ml-auto` moved to Follow above, so this one is last in the row and
            sits in the corner — the position the eye finishes at.

            HIDDEN when there is no recipient (`authorId`) or when the post is
            the member's own. Both cases would render a button that either does
            nothing or offers to message yourself. A visible "Hi" that silently
            fails is worse than no button, because it reads as "message sent"
            when nothing was. The server rejects self-sends regardless, but
            hiding the control is clearer than letting it be tapped. */}
        {post.authorId && !post.isOwn ? (
          // `ml-auto` pins this to the far right now that Follow no longer carries
          // it — the reference layout puts the primary conversation action alone
          // in the corner, so it must push past the whole left group rather than
          // sitting immediately after Follow.
          <div className="ml-auto">
            <HiButton recipientId={post.authorId} authorName={post.authorName} />
          </div>
        ) : null}
      </div>

      {/* Comments */}
      {commentsOpen ? <CommentSection comments={post.comments ?? []} /> : null}

      <ConfirmationDialog
        open={confirmDelete}
        tone="danger"
        title="Delete this post?"
        body="This permanently removes the post, its comments, and its likes. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          // TODO(Firebase): deletePost Server Action (author or admin only, audit-logged).
          setConfirmDelete(false);
        }}
      />
    </article>
  );
}

/** Inline comment list + composer for a post. */
export function CommentSection({ comments }: { comments: FeedPostView["comments"] }) {
  const [draft, setDraft] = useState("");
  const list = comments ?? [];

  return (
    <div className="border-t border-ink-700 bg-surface-muted px-5 py-4">
      {list.length === 0 ? (
        <p className="pb-2 text-sm text-ink-300">No comments yet — be the first to say something kind.</p>
      ) : (
        <ul className="flex flex-col gap-3 pb-3">
          {list.map((comment) => (
            <li key={comment.id} className="flex items-start gap-2.5">
              <Avatar name={comment.authorName} size="sm" />
              <div className="min-w-0 flex-1 rounded-2xl border border-ink-700 bg-surface px-3.5 py-2.5">
                <p className="text-xs font-semibold text-white">
                  {comment.authorName} <span className="ml-1 font-normal text-ink-400">{comment.at}</span>
                </p>
                <p className="text-sm leading-6 text-ink-100">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          // TODO(Firebase): addComment Server Action (posts/{id}/comments).
          setDraft("");
        }}
      >
        <label htmlFor="comment-input" className="sr-only">Add a comment</label>
        <input
          id="comment-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a comment…"
          className="h-10 flex-1 rounded-xl border border-ink-700 bg-surface px-3.5 text-sm text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="glass-action glass-action--quiet h-9 px-4 text-xs disabled:pointer-events-none disabled:opacity-60"
        >
          Comment
        </button>
      </form>
    </div>
  );
}
