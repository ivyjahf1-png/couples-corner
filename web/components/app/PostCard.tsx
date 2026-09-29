"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { ReportDialog } from "@/components/app/ReportDialog";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import { GlassActionButton } from "@/components/app/GlassActions";
import { Icon } from "@/components/landing/Icon";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
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
 * Feed post card: author header, body, optional media placeholder grid,
 * like/comment actions, and an authorization-aware post menu (delete only
 * when canDelete; report always available). Mutations arrive with Firebase —
 * like/delete are honest visual states until the Server Actions land.
 */
export function PostCard({ post }: { post: FeedPostView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [following, setFollowing] = useState(false);

  function toggleLike() {
    // TODO(Firebase): optimistic write to posts/{id}/likes/{uid}.
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
  }

  return (
    <article className="rounded-2xl border border-ink-700 bg-surface shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3 p-5 pb-3">
        {/* `src` was never passed, so every member's photo was fetched by the
            feed query and then thrown away in favour of initials. The query
            selects `authorAvatar` specifically for this. */}
        <Avatar name={post.authorName} kind={post.authorKind} src={post.authorAvatar} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <a href={post.authorHref ?? "#"} className="truncate font-semibold text-white hover:text-brand-300">{post.authorName}</a>
            {post.verified ? <span title="Verified creator" className="text-xs text-sky-300">✓</span> : null}
            {post.vip ? <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">VIP</span> : null}
          </div>
          <p className="text-xs text-ink-400">{post.at}</p>
          <a href={post.authorHref ?? "#"} className="mt-1 text-[11px] font-medium text-brand-300 hover:text-brand-200">View creator profile →</a>
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
      <div className="px-5 pb-3">
        <p className="whitespace-pre-line text-sm leading-6 text-ink-100">{post.body}</p>
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

      {/* Actions — professional glass controls with clear active states. */}
      <div className="flex items-center gap-2 border-t border-ink-700 px-3 py-2.5">
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
        <button type="button" onClick={() => setFollowing((v) => !v)} className={`ml-auto rounded-full px-3 py-1.5 text-xs font-semibold transition ${following ? "bg-emerald-500/15 text-emerald-300" : "bg-brand-500/15 text-brand-200 hover:bg-brand-500/25"}`}>
          {following ? "Following" : "Follow"}
        </button>

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
          <HiButton recipientId={post.authorId} authorName={post.authorName} />
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
