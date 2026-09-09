"use client";

import { useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { ReportDialog } from "@/components/app/ReportDialog";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import { Icon } from "@/components/landing/Icon";
import type { FeedPostView } from "@/lib/feature/types";

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

  function toggleLike() {
    // TODO(Firebase): optimistic write to posts/{id}/likes/{uid}.
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
  }

  return (
    <article className="rounded-2xl border border-ink-200 bg-surface shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3 p-5 pb-3">
        <Avatar name={post.authorName} kind={post.authorKind} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink-900">{post.authorName}</p>
          <p className="text-xs text-ink-500">{post.at}</p>
        </div>

        {/* Post menu */}
        <div className="relative">
          <button
            type="button"
            aria-label="Post options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
              <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-xl border border-ink-200 bg-surface py-1 shadow-lifted"
            >
              {post.canDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-700 hover:bg-danger-50"
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
        <p className="whitespace-pre-line text-sm leading-6 text-ink-800">{post.body}</p>
        {post.mediaCount && post.mediaCount > 0 ? (
          <div
            aria-label={`${post.mediaCount} attached media item${post.mediaCount === 1 ? "" : "s"}`}
            className="mt-3 grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(post.mediaCount, 2)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: Math.min(post.mediaCount, 4) }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="flex aspect-[4/3] items-center justify-center rounded-xl bg-surface-muted text-xs text-ink-500"
              >
                Photo {i + 1}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-ink-200 px-3 py-2">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          className={[
            "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition",
            liked ? "text-brand-700" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
          ].join(" ").trim()}
        >
          <Icon name="sparkle" className="h-4 w-4" />
          {likeCount} {likeCount === 1 ? "like" : "likes"}
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          aria-expanded={commentsOpen}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
        >
          <Icon name="chat" className="h-4 w-4" />
          {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
        </button>
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
    <div className="border-t border-ink-200 bg-surface-muted px-5 py-4">
      {list.length === 0 ? (
        <p className="pb-2 text-sm text-ink-600">No comments yet — be the first to say something kind.</p>
      ) : (
        <ul className="flex flex-col gap-3 pb-3">
          {list.map((comment) => (
            <li key={comment.id} className="flex items-start gap-2.5">
              <Avatar name={comment.authorName} size="sm" />
              <div className="min-w-0 flex-1 rounded-2xl border border-ink-200 bg-surface px-3.5 py-2.5">
                <p className="text-xs font-semibold text-ink-900">
                  {comment.authorName} <span className="ml-1 font-normal text-ink-500">{comment.at}</span>
                </p>
                <p className="text-sm leading-6 text-ink-800">{comment.body}</p>
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
          className="h-10 flex-1 rounded-xl border border-ink-200 bg-surface px-3.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="h-8 rounded-xl bg-brand-700 px-3 text-sm font-medium text-white transition hover:bg-brand-800 disabled:pointer-events-none disabled:opacity-60"
        >
          Comment
        </button>
      </form>
    </div>
  );
}
