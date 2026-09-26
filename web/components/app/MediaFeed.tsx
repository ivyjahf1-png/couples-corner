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
import { Avatar, PresenceDot } from "@/components/app/Avatar";
import { usePresence } from "@/lib/hooks/usePresence";
import { shareOrCopy } from "@/lib/utils/share";
import { notifySuccess } from "@/components/ui/FailureToasts";
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
 *   - The inner scroller (`.h-full.overflow-y-auto.snap-y.snap-mandatory`) is
 *     the single scroll region. The wrapping section is `overflow-hidden`, so a
 *     flick at the first or last card cannot chain to the page behind it.
 *   - Every moment is mounted; CSS scroll-snap owns the vertical gesture and
 *     decides the resting position. `index` is read back from `scrollTop` and
 *     only used to drive overlays (caption, rail, progress) and to decide which
 *     video plays.
 *   - The top overlay (search + creator identity) and the bottom bar (reactions
 *     + messaging) are absolutely positioned against the SECTION, not the
 *     scroller, so they stay pinned to the viewport instead of scrolling away
 *     with the cards.
 *   - On a phone this component is 100dvh; inside AppShell it fills the region
 *     the shell gives it (`fill`), because the shell already reserves the top
 *     bar and tab nav as in-flow segments.
 *
 * INTERACTION:
 *   - Paging is the browser's: touch flick, trackpad and the CSS snap points.
 *     Arrow keys and the on-screen pager call `goTo`, which only nudges
 *     scrollTop to the next card boundary.
 *   - Videos play only while their card is the snapped-to one.
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
  // The scroll container. Cards are all mounted and the browser owns the
  // vertical gesture, so this element - not a JS index - is the source of truth
  // for "which moment is on screen".
  const scrollRef = useRef<HTMLDivElement>(null);
  const feed = useMemo(() => moments.filter((moment) => moment?.id && moment?.mediaUrl), [moments]);
  // Active card, derived from scrollTop (see the listener below).
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  // Engagement overrides keyed by moment id. Seeded from the server payload,
  // then superseded by the authoritative result of each action.
  const [social, setSocial] = useState<
    Record<string, { count: number; reacted: boolean; comments: number }>
  >({});
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  // Declared here rather than beside the comment-sheet logic further down: the
  // scroll/keyboard effects above read `commentsOpen` in their dependency
  // arrays, and a `const` referenced before its initialiser throws at render.
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentList, setCommentList] = useState<MomentCommentView[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  // Which emoji the viewer currently used, so the row can highlight it.
  const [reactionKind, setReactionKind] = useState<ReactionKind | null>(null);
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

  // Watch every author in the feed, not just the visible card, so paging
  // forward shows an already-correct dot instead of an offline flash that
  // resolves a poll later. Signed-out visitors still get accurate dots (they
  // only read presence, they never heartbeat).
  const authorIds = useMemo(
    () => feed.map((m) => m.userId).filter((id) => id && id !== viewerId),
    [feed, viewerId]
  );
  const { presence } = usePresence(authorIds, authorIds.length > 0);
  const authorOnline = current ? Boolean(presence[current.userId]?.online) : false;

  /**
   * Scroll to a card by index.
   *
   * Paging is now the browser's job: this only nudges `scrollTop` to the exact
   * card offset and lets CSS scroll-snap settle it. `behavior: "smooth"` is
   * paired with `snap-mandatory`, so a fast double-tap still lands cleanly on a
   * card boundary instead of between two.
   */
  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      const target = Math.min(Math.max(next, 0), total - 1);
      const el = scrollRef.current;
      if (!el) {
        setIndex(target);
        return;
      }
      el.scrollTo({ top: target * el.clientHeight, behavior: "smooth" });
      setIndex(target);
    },
    [total]
  );

  /**
   * Track which card is snapped to, and reset per-card UI on change.
   *
   * The index is rounded from scrollTop rather than read from an IntersectionObserver
   * threshold: with snap-mandatory the resting position is always an exact card
   * offset, so a division is exact, whereas an IO fires mid-transition and makes
   * the overlays flicker to the next card's data while the old card is still
   * leaving. rAF-coalesced because a flick fires scroll events far faster than
   * React can usefully re-render.
   */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Captured to a non-null local: TypeScript does not carry the `if (!el)`
    // narrowing into a nested closure, so the rAF callback below would see
    // `el` as possibly null.
    const node: HTMLDivElement = el;

    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const height = node.clientHeight || 1;
        setIndex((prev) => {
          const next = Math.round(node.scrollTop / height);
          return next === prev ? prev : Math.min(Math.max(next, 0), total - 1);
        });
      });
    }

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [total]);

  // Paging to the next moment must not carry over per-card UI state: a caption
  // draft belonging to the previous card, an open comment sheet, a half-typed
  // message. Scrolling is the only way the active card changes now, so this is
  // where that reset lives (it used to sit inside `go`).
  const lastIndex = useRef(safeIndex);
  useEffect(() => {
    if (lastIndex.current === safeIndex) return;
    lastIndex.current = safeIndex;
    setDraft("");
    setSendError(null);
    setMenuOpen(false);
    setCommentsOpen(false);
    setReactionKind(null);
  }, [safeIndex]);

  // Keyboard paging. Arrow keys step cards because unlike wheel and touch -
  // which the browser now owns for scrolling - there is no native equivalent.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (commentsOpen) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        goTo(safeIndex + 1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        goTo(safeIndex - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, safeIndex, commentsOpen]);

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
      // This is the POSITIONING context, not the scroller. Everything overlaid
      // (header, caption, action rail, composer, upload FAB) is absolutely
      // positioned against this box and must NOT move with the cards - if the
      // section itself scrolled, `bottom-0` would resolve to the bottom of the
      // scrollable content rather than the visible viewport, and the composer
      // would ride off the last card.
      //
      // `overscroll-contain` on the inner scroller stops a flick at the first or
      // last card from chaining to the page behind the app shell.
      className={[
        "relative flex w-full select-none flex-col overflow-hidden bg-slate-950",
        fill ? "h-full min-h-0" : "h-dvh",
      ].join(" ")}
    >
      {/* ---------------------------------------------------- top overlay */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 shrink-0">
        {/* Two rows on phones: the search unit owns a full-width line of its own,
            with the secondary controls tucked to its right. From `sm` up they
            share one row, because there is finally room for both. The search is
            ordered first in the DOM so it takes the leftover width, not the
            location badge. */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:flex-nowrap sm:gap-3 sm:px-5 sm:pt-4">
          {searchSlot ? <div className="order-1 min-w-0 flex-1 basis-full sm:basis-auto">{searchSlot}</div> : null}
          <div className="order-2 ml-auto flex shrink-0 items-center gap-2">
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
                      const outcome = await shareOrCopy({
                        title: "Couple's Corner",
                        message: `${current.authorName ?? "Someone"} shared a moment on Couple's Corner. ${url}`,
                      });
                      if (outcome === "copied") notifySuccess("Link copied to clipboard");
                      if (outcome === "failed") {
                        setSendError("Couldn't share or copy this link. Please try again.");
                      }
                      // "shared" is already confirmed by the OS sheet, and a
                      // dismissed sheet is not an error worth reporting.
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
        </div>

        {/* ------------------------------------------- creator identity (top bar)
            The reel/stories standard puts WHO posted and WHEN directly above
            the media, so it reads before the caption. It is rendered here rather
            than over the bottom caption block because the bottom of the card is
            already occupied by the caption and the message composer. */}
        {current ? (
          <div className="pointer-events-auto mt-2.5 flex items-center gap-2.5 sm:mt-3">
            <Link
              href={current.isMine ? "/profile" : `/profile/${current.userId}`}
              aria-label={`Open ${current.authorName ?? "profile"}`}
              className="relative flex shrink-0 items-center"
            >
              <span className="block h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/25">
                <Avatar
                  src={current.authorAvatarUrl}
                  name={current.authorName ?? "Member"}
                  className="h-full w-full text-xs"
                />
              </span>
              {/* Live presence on the moment author. The own moment has nobody
                  to indicate, so it renders no dot at all. */}
              {current.isMine ? null : (
                <PresenceDot online={authorOnline} size="sm" />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={current.isMine ? "/profile" : `/profile/${current.userId}`}
                className="block truncate text-sm font-semibold text-white drop-shadow"
              >
                {current.authorName ?? "Member"}
              </Link>
              <p className="truncate text-xs text-white/70 drop-shadow">
              {formatWhen(current.createdAt)}
            </p>
            </div>
          </div>
        ) : null}

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
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-400 focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  <Plus className="h-4 w-4 text-white" aria-hidden />
                  Upload your first moment
                </Link>
              ) : null
            }
          />
        </div>
      ) : (
        <>
        {/* ------------------------------------------------- the snap scroller
            Every moment is mounted; the browser owns the vertical gesture and
            CSS scroll-snap decides where it rests.

            LAYOUT CONTRACT - exactly one scroll region:
              • This div is the ONLY scroller. The section above is
                `overflow-hidden`, so a flick here can never chain to the page.
              • Each card is exactly the scroller's height, so `snap-start` has
                an exact boundary to land on. A card shorter than the viewport
                would leave a gap the snap point could rest inside.
              • `snap-mandatory` (not `proximity`) is what makes a partial flick
                complete to the next card instead of resting between two, which
                is the behaviour a reel-style feed is expected to have.
              • `scrollbar-none` hides the track; the progress bars in the
                header already show position. */}
        <div
          ref={scrollRef}
          data-moments-scroller
          className="h-full min-h-0 w-full snap-y snap-mandatory overflow-y-auto overscroll-contain scrollbar-none"
        >
          {feed.map((moment, i) => (
            <article
              key={moment.id}
              // `h-full` matches the scroller so each snap point is exact;
              // `shrink-0` keeps a card from compressing when several are laid
              // out, and `snap-always` forces a programmatic scroll to land on a
              // boundary even if a previous scroll was mid-flight.
              className="relative h-full w-full shrink-0 snap-start snap-always"
              aria-roledescription="moment"
              aria-label={`${moment.authorName ?? "Member"}'s moment, ${i + 1} of ${total}`}
            >
              <MediaSurface
                moment={moment}
                muted={muted}
                active={i === safeIndex}
              />
            </article>
          ))}
        </div>

          {/* Caption only. The author identity (avatar, handle, timestamp) now
              lives in the top bar above, per the reel/stories standard, so
              repeating it here would print the same name twice on one card. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 px-4 pr-24 sm:bottom-28 sm:px-6 sm:pr-28">
            {current.content ? (
              <p className="mt-2 line-clamp-3 max-w-xl text-sm leading-6 text-white/95 drop-shadow">
                {current.content}
              </p>
            ) : null}
          </div>

          {/* Vertical pager, in its OWN column clear of the action rail.

              This used to sit at `right-0 w-12` (occupying 0-48px from the
              right edge) while the action rail sat at `sm:right-5` (20-68px).
              Those bands overlapped by 48px, and because the pager is vertically
              centred while the rail grows upward from the bottom, they collided
              vertically too on any normal phone height - the "up" arrow landing
              on top of the like button.

              Offsetting the pager left (right-20 / sm:right-28) gives each control
              its own non-overlapping column, so the collision cannot reappear at
              any screen height. gap-2 tightens the pair. */}
          {total > 1 ? (
            <div className="absolute inset-y-0 right-20 z-20 flex w-12 flex-col justify-center gap-2 sm:right-28">
              <PagerButton direction="up" onClick={() => goTo(safeIndex - 1)} disabled={safeIndex === 0} />
              <PagerButton direction="down" onClick={() => goTo(safeIndex + 1)} disabled={safeIndex >= total - 1} />
            </div>
          ) : null}

          {/* Horizontal chevrons were removed.

              They duplicated the vertical ^/v pager (all three drove the same
              `go`), and with the pager relocated to its own column the "next"
              chevron at `right-16` would have landed INSIDE that column —
              reintroducing exactly the overlap this fix removes. Paging remains
              fully available via swipe (touch), the vertical arrows (pointer),
              wheel and arrow keys. */}

          {/* Action rail - reactions, comments and mute.

              `bottom-44 sm:bottom-52` (176 / 208px) is set by the upload FAB
              directly below it, not picked for looks. The FAB is 56px tall at
              `bottom-24 sm:bottom-28`, so its top edge sits at 152 / 168px; the
              old `bottom-36 sm:bottom-40` put the rail's bottom edge at 144 /
              160px and the two overlapped by 8px on sm+. The rail now clears it
              by 24px on phones and 40px on larger screens.

              `right-3 sm:right-4` keeps the rail in the outermost column, which
              the pager (right-20 / sm:right-28) is offset clear of. */}
          <div className="absolute bottom-44 right-3 z-20 flex flex-col items-center gap-4 sm:bottom-52 sm:right-4">
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
          </div>
        </>
      )}

      {/* ------------------------------------------- pinned Moments upload FAB
          Deliberately OUTSIDE the `current ?` card block above. It used to live
          inside the action rail, which meant the primary "share something" entry
          point vanished on an empty feed - exactly when a new member most needs
          it. Now it is a sibling of the media stage and renders whenever there is
          a viewer, empty feed or not. Pinned bottom-right and lifted clear of
          both the composer and the app's bottom tab bar. */}
      {viewerId ? (
        <Link
          href="/task/upload-moment"
          aria-label="Upload a moment"
          className="absolute bottom-24 right-3 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-orange-300/50 bg-gradient-to-br from-orange-500 to-[#FF5722] text-white shadow-xl shadow-orange-950/50 ring-4 ring-slate-950/40 transition hover:scale-105 active:scale-95 sm:bottom-28 sm:right-4"
        >
          <Plus className="h-7 w-7" />
        </Link>
      ) : null}

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
function MediaSurface({
  moment,
  muted,
  active,
}: {
  moment: MomentView;
  muted: boolean;
  /** True for the card currently snapped into view. */
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Drives a fade-in once the bytes are decodable, so paging between moments
  // cross-dissolves rather than flashing an empty black box.
  const [ready, setReady] = useState(false);

  // A new moment means a new frame to wait for; drop back to the hidden state
  // before the next decode lands.
  useEffect(() => {
    setReady(false);
  }, [moment.id, moment.mediaUrl]);

  /**
   * Playback is driven by `active`, not by the `autoPlay` attribute.
   *
   * Now that every card is mounted, `autoPlay` would start EVERY video in the
   * feed at once — a dozen decoders competing, on mobile data, and audio from
   * cards nobody is looking at. Only the snapped-to card plays; the rest are
   * explicitly paused, so scrolling away from a video also stops it.
   *
   * `preload` is likewise conditional: eagerly buffering every video up front
   * would pull hundreds of megabytes for a feed the viewer may never scroll.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (active) {
      // Autoplay can be rejected (Low Power Mode, data saver). Swallow the
      // rejection rather than surfacing an error - the first frame still shows.
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [active, muted, moment.id]);

  const surfaceClass = [
    "h-full w-full object-cover transition-opacity duration-300",
    ready ? "opacity-100" : "opacity-0",
  ].join(" ");

  if (moment.mediaType === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        ref={videoRef}
        src={moment.mediaUrl}
        muted={muted}
        loop
        playsInline
        // No `autoPlay` attribute: it would play every mounted card at once.
        // The effect above is the single source of truth for playback.
        preload={active ? "auto" : "metadata"}
        onLoadedData={() => setReady(true)}
        className={surfaceClass}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={moment.mediaUrl}
      alt={moment.content || "Shared moment"}
      // The active card is the LCP element, so it loads eagerly; the rest are
      // lazy so a long feed does not fetch every image up front.
      loading={active ? "eager" : "lazy"}
      decoding="async"
      onLoad={() => setReady(true)}
      className={surfaceClass}
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
