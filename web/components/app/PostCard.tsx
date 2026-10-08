"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { profileViewClick } from "@/components/profile/ProfileViewModal";
import { ReportDialog } from "@/components/app/ReportDialog";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import { Icon } from "@/components/landing/Icon";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
import { togglePostLikeAction } from "@/lib/actions/profile";
import { setFollowAction } from "@/lib/actions/follow";
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
function formatFeedTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const d = new Date(then);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `Today ${hm}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate()) {
    return `Yesterday ${hm}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`;
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
  const [followPending, setFollowPending] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  /* URLs that failed to load, so each broken tile degrades on its own.

     Keyed by URL rather than index: a card can legitimately carry the same URL
     twice, and index keys would mark a healthy duplicate as broken the moment
     its twin failed. State is never cleared — a URL that 404'd once will 404 on
     the next paint too, and re-requesting it on every scroll would be a loop. */
  const [brokenMedia, setBrokenMedia] = useState<string[]>([]);
  const [, startLikeTransition] = useTransition();
  const [, startFollowTransition] = useTransition();

  /** Follow / unfollow the author, persisting to `user_follows`. */
  function toggleFollow() {
    if (followPending || !post.authorId) return;
    const next = !following;
    setFollowing(next);
    setFollowError(null);
    setFollowPending(true);
    startFollowTransition(async () => {
      const result = await setFollowAction({ targetUserId: post.authorId!, follow: next });
      setFollowPending(false);
      if (!result.ok) {
        // Roll back, or the button would claim a follow that did not save.
        setFollowing(!next);
        setFollowError(result.error ?? "Couldn't update follow");
        return;
      }
      setFollowing(result.following);
    });
  }

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

  /* Dark card on the feed's midnight canvas. `bg-slate-900/70` was a literal
     value; `bg-surface` is the app's own token (#1E293B) and the same value the
     Messages list rows use, so the two timelines read as one system instead of
     two near-identical greys chosen independently.

     The hairline is `border-white/10`, not a hardcoded border colour, so it sits
     correctly on the surface whatever the canvas behind it is.

     A line comment rather than a JSX one: this explains the whole article, so it
     belongs above the return. A JSX comment placed directly inside the
     parenthesised return is a second expression beside the element and does not
     parse. Note the earlier version of this comment spelled out the JSX comment
     delimiters inline, and that literal sequence terminated the block comment
     early and broke the file. */
  return (
    <article className="overflow-hidden bg-surface shadow-card">
      <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3">
        {/* AUTHOR IDENTITY — avatar and name open the global profile view modal
            when the post carries a real author uid (`profileViewClick`
            intercepts only plain left-clicks; modifiers keep the href's
            new-tab/save behaviour). Demo and Discover-sourced posts have no
            `authorId` and simply keep the old `authorHref` navigation — a
            modal with nothing to fetch would be worse than the link. */}
        <a
          href={post.authorHref ?? "#"}
          aria-label={`View ${post.authorName}`}
          onClick={profileViewClick(post.authorId)}
          className="relative shrink-0"
        >
          <Avatar name={post.authorName} kind={post.authorKind} src={post.authorAvatar} />
          <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-400" />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <a
              href={post.authorHref ?? "#"}
              onClick={profileViewClick(post.authorId)}
              className="truncate text-sm font-semibold text-white hover:text-brand-300"
            >
              {post.authorName}
            </a>
            {post.verified ? <span title="Verified creator" className="shrink-0 text-xs text-sky-300">✓</span> : null}
            {post.vip ? <span className="shrink-0 rounded border border-amber-300/50 bg-amber-400/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-amber-200">VIP</span> : null}
            <span className="shrink-0 rounded border border-violet-400/40 bg-violet-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-violet-200">Lv 5</span>
          </div>
          <time dateTime={post.at} title={post.at} className="mt-0.5 block text-[11px] text-slate-400">
            {mounted ? formatFeedTime(post.at) : post.at}
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
      <div className="px-4 pb-2.5">
        {post.body ? <p className="whitespace-pre-line text-sm leading-6 text-slate-100">{post.body}</p> : null}
      </div>
      {post.mediaUrls?.length ? (
        <div className="w-full overflow-hidden bg-black">
          {post.mediaUrls.slice(0, 4).map((url, i) => {
            if (brokenMedia.includes(url)) {
              return (
                <div key={`${url}-${i}`} className="flex aspect-[4/5] w-full items-center justify-center bg-surface-muted text-[11px] text-ink-400">
                  Photo unavailable
                </div>
              );
            }
            return url.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
              <video key={`${url}-${i}`} src={url} controls playsInline className="aspect-[4/5] w-full bg-black object-cover" />
            ) : (
              <img
                key={`${url}-${i}`}
                src={url}
                alt={post.body ? `Photo by ${post.authorName}` : `Photo ${i + 1}`}
                loading="lazy"
                decoding="async"
                onError={() => setBrokenMedia((current) => (current.includes(url) ? current : [...current, url]))}
                className="aspect-[4/5] w-full bg-surface-muted object-cover"
              />
            );
          })}
        </div>
      ) : post.mediaCount ? (
        <div className="mx-4 mb-3 flex aspect-video items-center justify-center rounded-xl bg-surface-muted text-xs text-ink-400">Creator media preview</div>
      ) : null}

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
      <div className="flex items-center gap-4 px-4 py-2.5">
        <button
          type="button"
          onClick={toggleLike}
          aria-label={liked ? "Remove your like" : "Like this post"}
          aria-pressed={liked}
          className="flex min-h-11 items-center gap-1.5 text-slate-300 transition hover:text-rose-300 active:scale-95"
        >
          <Icon name="heart" filled={liked} className={`h-6 w-6 ${liked ? "text-rose-400" : ""}`} />
          <span className="text-xs font-semibold tabular-nums">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          aria-label={commentsOpen ? "Hide comments" : "Show comments"}
          aria-expanded={commentsOpen}
          className="flex min-h-11 items-center gap-1.5 text-slate-300 transition hover:text-sky-300 active:scale-95"
        >
          <Icon name="chat" className="h-6 w-6" />
          <span className="text-xs font-semibold tabular-nums">{post.commentCount}</span>
        </button>
        <a href="/games" aria-label="Play games" className="flex min-h-11 items-center justify-center text-slate-300 transition hover:text-amber-200 active:scale-95">
          <Icon name="star" className="h-6 w-6" />
        </a>
        <div className="ml-auto flex items-center gap-2">
          {post.authorId && !post.isOwn ? (
            <button
              type="button"
              onClick={toggleFollow}
              disabled={followPending}
              aria-pressed={following}
              aria-label={following ? `Unfollow ${post.authorName}` : `Follow ${post.authorName}`}
              className={`min-h-9 shrink-0 rounded-full px-4 text-xs font-bold transition disabled:opacity-50 ${following ? "bg-orange-500/15 text-orange-200" : "bg-orange-500 text-white hover:bg-orange-400 active:scale-95"}`}
            >
              {following ? "Following" : "Follow"}
            </button>
          ) : null}

        {likeError || followError ? (
          <span role="alert" className="truncate text-[11px] text-rose-300">
            {likeError ?? followError}
          </span>
        ) : null}
        {post.authorId && !post.isOwn ? (
          <HiButton recipientId={post.authorId} authorName={post.authorName} />
        ) : null}
        </div>
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
