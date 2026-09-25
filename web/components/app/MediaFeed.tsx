"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Plus, Send, Volume2, VolumeX } from "lucide-react";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
import {
  toggleMomentReactionAction,
  setMomentReactionAction,
  addMomentCommentAction,
  getMomentCommentsAction,
} from "@/lib/actions/tasks";
import { EmptyState } from "@/components/app/EmptyState";
import { Avatar } from "@/components/app/Avatar";
import type { MomentCommentView, MomentView } from "@/lib/moments";

/**
 * Immersive media feed.
 *
 * A full-bleed, single-card-at-a-time viewer (story/reel style) over the
 * public `moments` table, which is written by the Task Center upload form.
 * Because it reads the same table that flow writes to, anything a member
 * uploads is syndicated here immediately.
 *
 * LAYOUT CONTRACT - exactly one vertical scroll region:
 *   - The root fills the AppShell content region (itself locked to 100dvh).
 *     The page never scrolls, which is what stops rubber-banding on iOS.
 *   - The top overlay (search + controls) and the bottom composer are
 *     absolutely positioned over the media, so neither can be pushed out of
 *     view by a tall caption.
 *   - Long captions are line-clamped rather than allowed to grow a second
 *     scroller.
 *
 * INTERACTION:
 *   - Arrow keys / wheel / edge buttons move between moments.
 *   - Videos autoplay muted, with a tap-to-mute control (browsers block
 *     unmuted autoplay, so muted is the only reliable default).
 *   - The heart and comment sheet are wired to real Server Actions backed by
 *     `moment_reactions` / `moment_comments` (migration 036). Reactions apply
 *     optimistically and reconcile against the server count.
 */

const MAX_CAPTION = 2200;

/** Reaction kinds persisted in `moment_reactions.kind` (migration 036). */
type ReactionKind = "like" | "love" | "fire" | "laugh";

/** Quick-reaction row shown in the bottom bar. */
const QUICK_REACTIONS: { kind: ReactionKind; emoji: string; label: string }[] = [
  { kind: "love", emoji: "❤️", label: "Love" },
  { kind: "like", emoji: "👍", label: "Like" },
  { kind: "fire", emoji: "🔥", label: "Fire" },
  { kind: "laugh", emoji: "😂", label: "Funny" },
];

interface MediaFeedProps {
  moments: MomentView[];
  /** Current viewer uid, or null when signed out. */
  viewerId: string | null;
  /** Search box rendered into the top overlay. */
  searchSlot?: ReactNode;
  /** Extra controls pinned to the top-right (location badge, games, ...). */
  topRightSlot?: ReactNode;
  /** Overlay message shown when there is nothing to play. */
  emptyTitle?: string;
  emptyBody?: string;
  /**
   * True when rendered INSIDE AppShell. The shell already owns the 100dvh
   * viewport lock and reserves the top bar and tab nav as in-flow segments, so
   * the feed must fill the region it is given. Leaving `min-h-dvh` on in that
   * context makes the component 100dvh tall inside a ~65dvh box, which pushes
   * the bottom composer below the fold and makes the whole page appear to
   * slide past the navigation.
   */
  fill?: boolean;
}

export function MediaFeed({
  moments,
  viewerId,
  searchSlot,
  topRightSlot,
  emptyTitle = "No moments yet",
  emptyBody = "Share a photo or short video and it will appear here for everyone.",
  fill = false,
}: MediaFeedProps) {
  const router = useRouter();
  const feed = useMemo(() => moments.filter((moment) => moment?.id && moment?.mediaUrl), [moments]);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  // Engagement overrides keyed by moment id. Seeded from the server payload,
  // then superseded by the authoritative result of each action.
  const [social, setSocial] = useState<
    Record<string, { count: number; reacted: boolean; comments: number }>
  >({});
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Never index out of range when the feed shrinks underneath us.
  const total = feed.length;
  const safeIndex = total > 0 ? Math.min(Math.max(index, 0), total - 1) : 0;
  const current = total > 0 ? feed[safeIndex] : null;

  // Effective engagement for the visible card: local override if present,
  // otherwise the server-rendered values.
  const reactions = current
    ? (social[current.id]?.count ?? current.reactionCount ?? 0)
    : 0;
  const reacted = current
    ? (social[current.id]?.reacted ?? current.reactedByMe ?? false)
    : false;
  const commentCount = current
    ? (social[current.id]?.comments ?? current.commentCount ?? 0)
    : 0;

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIndex((prev) => {
        const from = Math.min(Math.max(prev, 0), total - 1);
        return Math.min(Math.max(from + delta, 0), total - 1);
      });
      setDraft("");
      setSendError(null);
      // Paging to the next moment must not carry over per-card UI state.
      setMenuOpen(false);
      setCommentsOpen(false);
      setReactionKind(null);
    },
    [total]
  );

  // Vertical wheel paging, throttled by the index guard in `go`.
  useEffect(() => {
    let lock = 0;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowDown") go(1);
      if (event.key === "ArrowUp") go(-1);
    }
    function onWheel(event: WheelEvent) {
      const now = Date.now();
      if (now - lock < 450) return;
      if (Math.abs(event.deltaY) < 24) return;
      lock = now;
      go(event.deltaY > 0 ? 1 : -1);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [go]);

  function toggleReact() {
    if (!current || !viewerId) return;
    const momentId = current.id;
    const base = social[momentId] ?? {
      count: current.reactionCount ?? 0,
      reacted: current.reactedByMe ?? false,
      comments: current.commentCount ?? 0,
    };
    // Optimistic flip, then reconcile with the server's authoritative count.
    setSocial((prev) => ({
      ...prev,
      [momentId]: { ...base, reacted: !base.reacted, count: Math.max(0, base.count + (base.reacted ? -1 : 1)) },
    }));
    startTransition(async () => {
      const result = await toggleMomentReactionAction({ momentId });
      if (!result.ok) {
        // Roll back to the pre-toggle state on failure.
        setSocial((prev) => ({ ...prev, [momentId]: base }));
        setSendError(result.error ?? "Could not save your reaction");
        return;
      }
      setSocial((prev) => ({ ...prev, [momentId]: { ...base, reacted: result.reacted, count: result.count } }));
      setSendError(null);
    });
  }

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentList, setCommentList] = useState<MomentCommentView[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  // Which emoji the viewer currently used, so the row can highlight it.
  const [reactionKind, setReactionKind] = useState<ReactionKind | null>(null);

  function reactWith(kind: ReactionKind) {
    if (!current || !viewerId) return;
    const momentId = current.id;
    const base = social[momentId] ?? {
      count: current.reactionCount ?? 0,
      reacted: current.reactedByMe ?? false,
      comments: current.commentCount ?? 0,
    };
    // Optimistic: the row swaps immediately, then the server confirms.
    const nextReacted = !(reactionKind === kind && base.reacted);
    setReactionKind(nextReacted ? kind : null);
    setSocial((prev) => ({
      ...prev,
      [momentId]: { ...base, reacted: nextReacted, count: Math.max(0, base.count + (nextReacted ? 1 : -1)) },
    }));
    startTransition(async () => {
      const result = await setMomentReactionAction({ momentId, kind });
      if (!result.ok) {
        setSocial((prev) => ({ ...prev, [momentId]: base }));
        setReactionKind(base.reacted ? kind : null);
        setSendError(result.error ?? "Could not save your reaction");
        return;
      }
      setSocial((prev) => ({ ...prev, [momentId]: { ...base, reacted: result.reacted, count: result.count } }));
      setSendError(null);
    });
  }

  function postComment() {
    if (!current || !commentDraft.trim()) return;
    const momentId = current.id;
    const base = social[momentId] ?? {
      count: current.reactionCount ?? 0,
      reacted: current.reactedByMe ?? false,
      comments: current.commentCount ?? 0,
    };
    startTransition(async () => {
      const result = await addMomentCommentAction({ momentId, body: commentDraft });
      if (!result.ok) {
        setSendError(result.error ?? "Could not post your comment");
        return;
      }
      setCommentList((prev) => [...prev, result.comment]);
      setSocial((prev) => ({ ...prev, [momentId]: { ...base, comments: base.comments + 1 } }));
      setCommentDraft("");
      setSendError(null);
    });
  }

  function sendQuickMessage() {
    if (!current || !draft.trim()) return;
    const body = draft.trim().slice(0, MAX_CAPTION);
    startTransition(async () => {
      const result = await sendFirstImpressionAction({ recipientId: current.userId, body });
      if (!result.ok) {
        setSendError(result.error ?? "Could not send your message");
        return;
      }
      setDraft("");
      setSendError(null);
      if (result.conversationId) router.push(`/messages/${result.conversationId}`);
    });
  }

  return (
    <section
      data-zone="app"
      // Inside AppShell: fill exactly the region the shell hands us, so the
      // bottom-anchored composer sits on the real bottom edge. Standalone
      // (signed out, no shell): min-h-dvh gives the feed a bounded viewport.
      className={[
        "relative flex w-full flex-col overflow-hidden bg-slate-950",
        fill ? "h-full min-h-0" : "h-full max-h-full min-h-dvh",
      ].join(" ")}
    >
      {/* ---------------------------------------------------- top overlay */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 shrink-0">
        <div className="pointer-events-auto flex items-start gap-3 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5 sm:pt-4">
          {searchSlot ? <div className="min-w-0 flex-1">{searchSlot}</div> : null}
          {topRightSlot ? <div className="flex shrink-0 items-center gap-2">{topRightSlot}</div> : null}
          {/* Per-card options menu (copy link / report). */}
          {current ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Moment options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-slate-950/60 text-white backdrop-blur-md transition hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  aria-label="Moment options"
                  className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] py-1.5 shadow-2xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setMenuOpen(false);
                      const url = `${window.location.origin}/?moment=${current.id}`;
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: "Couple's Corner", url });
                        } else {
                          await navigator.clipboard.writeText(url);
                          setSendError("Link copied to clipboard");
                        }
                      } catch {
                        /* user dismissed the share sheet */
                      }
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/10"
                  >
                    Share / copy link
                  </button>
                  <Link
                    href={`/profile/${current.userId}`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
                  >
                    View {current.authorName ?? "creator"}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Progress bars - one segment per moment, filled up to the current. */}
        {total > 1 ? (
          <div className="pointer-events-none mt-3 flex gap-1 px-3 sm:px-5" aria-hidden>
            {feed.map((moment, i) => (
              <span
                key={moment.id}
                className={[
                  "h-0.5 flex-1 rounded-full transition-colors",
                  i <= safeIndex ? "bg-white" : "bg-white/30",
                ].join(" ")}
              />
            ))}
          </div>
        ) : null}
      </header>
      {/* -------------------------------------------------------- the media */}
      {!current ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <EmptyState
            icon="moments"
            title={emptyTitle}
            body={emptyBody}
            action={
              viewerId ? (
                <Link
                  href="/task/upload-moment"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-[#FF5722] px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  Upload your first moment
                </Link>
              ) : null
            }
          />
        </div>
      ) : (
        <article className="relative flex min-h-0 flex-1 items-center justify-center">
          <MediaSurface moment={current} muted={muted} />

          {/* Author + caption, bottom-left, above the composer. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 px-4 sm:bottom-28 sm:px-6">
            <div className="pointer-events-auto flex items-center gap-2.5">
              {current.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.authorAvatarUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/70"
                />
              ) : (
                <Avatar name={current.authorName ?? "Member"} size="sm" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white drop-shadow">
                  {current.authorName ?? "Member"}
                </p>
                <p className="text-[11px] text-white/70">{formatWhen(current.createdAt)}</p>
              </div>
            </div>
            {current.content ? (
              <p className="mt-2 line-clamp-3 max-w-xl text-sm leading-6 text-white/95 drop-shadow">
                {current.content}
              </p>
            ) : null}
          </div>

          {/* Vertical pager - right edge tappable zones. */}
          {total > 1 ? (
            <div className="absolute inset-y-0 right-0 z-20 flex w-12 flex-col justify-center gap-3">
              <PagerButton direction="up" onClick={() => go(-1)} disabled={safeIndex === 0} />
              <PagerButton direction="down" onClick={() => go(1)} disabled={safeIndex >= total - 1} />
            </div>
          ) : null}

          {/* Action rail - reactions, comments and mute. */}
          <div className="absolute bottom-36 right-3 z-20 flex flex-col items-center gap-4 sm:bottom-40 sm:right-5">
            <ActionButton
              label={reacted ? "Remove like" : "Like this moment"}
              active={reacted}
              disabled={!viewerId}
              onClick={toggleReact}
            >
              <Heart className="h-6 w-6" fill={reacted ? "currentColor" : "none"} />
            </ActionButton>
            {reactions > 0 ? (
              <span className="-mt-2 text-[11px] font-semibold text-white/90 drop-shadow">
                {reactions}
              </span>
            ) : null}

            <ActionButton
              label="Open comments"
              onClick={() => {
                setCommentsOpen(true);
                if (!current) return;
                const momentId = current.id;
                startTransition(async () => {
                  const existing = await getMomentCommentsAction(momentId);
                  setCommentList(existing);
                });
              }}
            >
              <MessageCircle className="h-6 w-6" />
            </ActionButton>
            {commentCount > 0 ? (
              <span className="-mt-2 text-[11px] font-semibold text-white/90 drop-shadow">
                {commentCount}
              </span>
            ) : null}

            {current.mediaType === "video" ? (
              <ActionButton label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
                {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </ActionButton>
            ) : null}

            {/* Moments upload launcher - bottom right, clear of the tab nav. */}
            {viewerId ? (
              <Link
                href="/task/upload-moment"
                aria-label="Upload a moment"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-400/40 bg-gradient-to-br from-orange-500 to-[#FF5722] text-white shadow-lg shadow-orange-950/40 backdrop-blur-sm transition hover:scale-105"
              >
                <Plus className="h-6 w-6" />
              </Link>
            ) : null}
          </div>
        </article>
      )}

      {/* --------------------------------- bottom bar: reactions + messaging */}
      {current ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 shrink-0 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5">
          {sendError ? (
            <p role="alert" className="mb-2 text-center text-xs text-rose-300">
              {sendError}
            </p>
          ) : null}

          {/* Quick reactions - one tap to react to THIS moment. */}
          <div className="pointer-events-auto mb-2 flex items-center justify-center gap-1.5">
            {QUICK_REACTIONS.map((option) => {
              const active = reacted && reactionKind === option.kind;
              return (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => reactWith(option.kind)}
                  disabled={!viewerId}
                  aria-label={`React with ${option.label}`}
                  aria-pressed={active}
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border text-base backdrop-blur-md transition active:scale-90 disabled:opacity-40",
                    active
                      ? "border-orange-400/70 bg-orange-500/25 scale-110"
                      : "border-white/15 bg-slate-950/60 hover:bg-white/10",
                  ].join(" ")}
                >
                  <span aria-hidden>{option.emoji}</span>
                </button>
              );
            })}
          </div>

          <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-3 py-2 backdrop-blur-md">
            {viewerId ? (
              <>
                <label htmlFor="moment-reply" className="sr-only">
                  Send {current.authorName ?? "this member"} a message
                </label>
                <input
                  id="moment-reply"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendQuickMessage();
                  }}
                  maxLength={MAX_CAPTION}
                  placeholder={`Message ${current.authorName ?? "them"}…`}
                  className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={sendQuickMessage}
                  disabled={!draft.trim() || isPending}
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-400 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </>
            ) : (
              <p className="flex flex-1 items-center justify-center gap-2 px-2 py-1.5 text-sm text-white/80">
                <MessageCircle className="h-4 w-4" />
                Sign in to start a conversation
              </p>
            )}
          </div>
        </div>
      ) : null}
      {/* ------------------------------------- comment sheet (bottom overlay) */}
      {commentsOpen && current ? (
        <div
          className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Comments"
        >
          <button
            type="button"
            aria-label="Close comments"
            onClick={() => setCommentsOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <div className="relative z-10 flex max-h-[70%] flex-col rounded-t-3xl border-t border-white/10 bg-[#0F172A]">
            <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? "" : "s"}` : "Comments"}
              </h2>
              <button
                type="button"
                onClick={() => setCommentsOpen(false)}
                aria-label="Close comments"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4 rotate-45" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {commentList.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">
                  No comments yet. Be the first to say something.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {commentList.map((comment) => (
                    <li key={comment.id} className="flex items-start gap-2.5">
                      <Avatar name={comment.authorName ?? "Member"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white">
                          {comment.authorName ?? "Member"}
                        </p>
                        <p className="text-sm leading-6 text-ink-200">{comment.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {viewerId ? (
              <div className="shrink-0 border-t border-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="moment-comment" className="sr-only">
                    Add a comment
                  </label>
                  <input
                    id="moment-comment"
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") postComment();
                    }}
                    maxLength={500}
                    placeholder="Add a comment…"
                    className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-[#1E293B] px-4 text-sm text-white placeholder:text-ink-400 focus:border-orange-400/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={postComment}
                    disabled={!commentDraft.trim() || isPending}
                    aria-label="Post comment"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-400 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The media surface. Images and videos share a full-bleed object-cover box, so
 * the viewer never letterboxes or shifts layout between media types.
 */
function MediaSurface({ moment, muted }: { moment: MomentView; muted: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Autoplay can be rejected (Low Power Mode, data saver). Swallow the rejection
  // rather than surfacing an error - the first frame is still visible.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    void video.play().catch(() => undefined);
  }, [muted, moment.id]);

  if (moment.mediaType === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        ref={videoRef}
        key={moment.id}
        src={moment.mediaUrl}
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="auto"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={moment.mediaUrl}
      alt={moment.content || "Shared moment"}
      className="h-full w-full object-cover"
    />
  );
}

function PagerButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "up" | "down";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "up" ? "Previous moment" : "Next moment"}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 disabled:opacity-20"
    >
      {direction === "up" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 15 6-6 6 6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
    </button>
  );
}

function ActionButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={[
        "flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/60 backdrop-blur-sm transition hover:scale-105 disabled:opacity-40",
        active ? "text-rose-400" : "text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Compact relative timestamp for the overlay. */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
