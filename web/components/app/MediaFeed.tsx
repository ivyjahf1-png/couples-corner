"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, ThumbsUp, Flame, Laugh, MessageCircle, Plus, Send, Share2, Volume2, VolumeX, Loader2, Trash2, type LucideIcon } from "lucide-react";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
import {
  setMomentReactionAction,
  addMomentCommentAction,
  getMomentCommentsAction,
  deleteMomentAction,
} from "@/lib/actions/tasks";
import { EmptyState } from "@/components/app/EmptyState";
import { FeedActiveProvider } from "@/components/app/FeedActiveContext";
import { Avatar, PresenceDot } from "@/components/app/Avatar";
import { usePresence } from "@/lib/hooks/usePresence";
import { PREFETCH_AHEAD, useReconnectPrefetch, useVideoPrefetch } from "@/lib/hooks/useVideoPrefetch";
import { setFollowAction } from "@/lib/actions/follow";
import { shareOrCopy } from "@/lib/utils/share";
import { notifySuccess } from "@/components/ui/FailureToasts";
import type { MomentCommentView, MomentView, ReactionKind, ReactionTally } from "@/lib/moments";
import { parseVideoEmbedUrl } from "@/lib/utils/video-embed";

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
 *     Arrow keys call `goTo`, which only nudges scrollTop to the next card
 *     boundary. (There is no on-screen pager — the vertical ^/v control was
 *     removed as a redundant pointer affordance; see the note in the JSX.)
 *   - Videos play only while their card is the snapped-to one.
 *   - The heart and comment sheet are wired to real Server Actions backed by
 *     `moment_reactions` / `moment_comments` (migration 036). Reactions apply
 *     optimistically and reconcile against the server count.
 */

/**
 * One entry in the scroller: either a member's moment or the sponsored card.
 *
 * A union rather than a parallel sponsored array because the scroller's index
 * maths (`scrollTop / clientHeight`) counts every snapped child, so the card
 * types must share ONE index space. See the `cards` memo in MediaFeed.
 */
type FeedCard =
  | { kind: "moment"; moment: MomentView }
  | { kind: "sponsored"; key: string };

/**
 * React key for the sponsored card. A constant, not a generated id, so the
 * server and client render identical markup and the card is never remounted
 * mid-scroll (which would reset its watch timer and strand the member).
 */
const SPONSORED_CARD_KEY = "sponsored-moment";

const MAX_CAPTION = 2200;

// The 24-hour segment window (`SEGMENT_WINDOW_MS`, `segmentCutoffNow`) was
// removed with the progress bars. It existed only to decide how many segments
// to DRAW; it never filtered which moments appear in the feed, so deleting it
// changes nothing about persistence. Moments have no expiry at all — they
// remain in the feed until their owner deletes them. The 24-hour expiry that
// does exist in this product belongs to a separate `stories` table
// (migration 038), which this feed does not read.

// `ReactionKind` is imported from @/lib/moments rather than redeclared here.
// The feed, the server actions and the view model must agree on the set of
// persisted kinds; a second local union is how they drift.

/**
 * Quick-reaction row shown in the bottom bar.
 *
 * Lucide ICONS, not emoji. These were literal emoji characters until now, but
 * every one of them was reaching the browser as mojibake - the feed chips
 * rendered as scrambled sequences rather than a heart, a thumb, a flame and
 * a laughing face. Whatever mangled them (a UTF-8 -> Latin-1 round-trip at some
 * point in this file history) is not worth chasing, because SVG cannot be
 * mangled: there is no encoding layer for a glyph to get lost in, and no
 * dependence on whether a given Android or iOS build ships the emoji font.
 *
 * The persisted ReactionKind values are untouched, so this is presentational
 * only and no stored reaction row moves.
 */
const QUICK_REACTIONS: { kind: ReactionKind; Icon: LucideIcon; label: string }[] = [
  { kind: "love", Icon: Heart, label: "Love" },
  { kind: "like", Icon: ThumbsUp, label: "Like" },
  { kind: "fire", Icon: Flame, label: "Fire" },
  { kind: "laugh", Icon: Laugh, label: "Funny" },
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
   * Optional control rendered beneath the empty-state copy (e.g. the rewarded-ad
   * "earn tokens" button). Passed in as a slot rather than imported, so MediaFeed
   * stays free of reward/business logic and the host page decides what to offer.
   */
  rewardSlot?: ReactNode;
  /**
   * The sponsored card, inserted into the snap scroller as a real card at
   * `sponsoredPosition` so it pages and snaps exactly like a moment. Passed in as
   * a slot for the same reason as `rewardSlot`: MediaFeed owns layout, the host
   * page owns what the card means and what it credits.
   *
   * MUST be a plain ReactNode, never a function. This is a Client Component and
   * the host page is a Server Component, and a function prop cannot cross that
   * boundary - it throws at runtime with
   * "Functions cannot be passed directly to Client Components". The card learns
   * whether it is the visible card from FeedActiveContext instead. See
   * components/app/FeedActiveContext.tsx.
   */
  sponsoredSlot?: ReactNode;
  /**
   * Index at which the sponsored card is inserted. Defaults to 0 so it is the
   * first thing a member sees. Values beyond the feed length are clamped.
   */
  sponsoredPosition?: number;
  /**
   * Moment id to scroll to on mount, from `?moment=<id>`.
   *
   * The share link at MediaSurface already builds `/?moment=<id>` URLs, but
   * nothing ever READ that param, so every shared link silently opened the feed
   * on whatever card happened to be first. This is the reader.
   *
   * Uses `scrollTo` with instant behaviour rather than `goTo` (which is smooth):
   * on a deep link the user has not swiped yet, so animating the journey just
   * plays a long scroll through unrelated people's posts.
   */
  deepLinkMomentId?: string | null;
  /** ISO cooldown deadline for the sponsored card, or null when claimable. */
  sponsoredNextAvailableAt?: string | null;
  /**
   * True when rendered INSIDE AppShell. The shell already owns the 100dvh
   * viewport lock and reserves the top bar and tab nav as in-flow segments, so
   * the feed must fill the region it is given. Leaving `min-h-dvh` on in that
   * context makes the component 100dvh tall inside a ~65dvh box, which pushes
   * the bottom composer below the fold and makes the whole page appear to
   * slide past the navigation.
   */
  fill?: boolean;
  /**
   * Called after the member deletes one of their own moments, with its id.
   *
   * Optional because MediaFeed does not own the moment list — the host page
   * fetched it. This is a notification, not control: without a handler the card
   * still disappears once the revalidated server payload arrives, just less
   * immediately. Hosts that keep the feed in state should drop the id from it
   * here so the card is gone on the next render rather than after a round-trip.
   *
   * NOTE: the home page (app/page.tsx) is a Server Component and therefore
   * cannot pass this at all — a function prop cannot cross that boundary. That
   * is safe, and the reason this is optional: deleteMomentAction revalidates "/",
   * so the deleted moment leaves the server payload regardless. Only a
   * client-side host that owns the feed in state needs to supply it.
   */
  onDeleted?: (momentId: string) => void;
}

export function MediaFeed({
  moments,
  viewerId,
  searchSlot,
  topRightSlot,
  emptyTitle = "No moments yet",
  emptyBody = "Share a photo or short video and it will appear here for everyone.",
  rewardSlot,
  sponsoredSlot,
  sponsoredPosition = 0,
  deepLinkMomentId = null,
  sponsoredNextAvailableAt = null,
  fill = false,
  onDeleted,
}: MediaFeedProps) {
  const router = useRouter();
  // The scroll container. Cards are all mounted and the browser owns the
  // vertical gesture, so this element - not a JS index - is the source of truth
  // for "which moment is on screen".
  const scrollRef = useRef<HTMLDivElement>(null);
  const feed = useMemo(() => moments.filter((moment) => moment?.id && moment?.mediaUrl), [moments]);

  /**
   * THE SCROLL ORDER: moments and the sponsored card, as one list.
   *
   * The sponsored card is inserted INTO the scroller rather than rendered beside
   * it, because the scroller's contract is "every child is exactly the
   * scroller's height and owns one snap point". A sibling would have no snap
   * boundary, so the card could never be snapped to and the scroll maths would
   * disagree with what is on screen.
   *
   * A discriminated union, not a parallel array, so `total`, the index the
   * scroll listener derives, the progress bars and the card index all count the same
   * number of cards. Keeping the sponsored card in a separate index space was
   * the obvious alternative and is wrong: two index spaces would silently
   * desync the overlays from the visible card.
   */
  const cards = useMemo(() => {
    const out: FeedCard[] = feed.map((moment) => ({ kind: "moment" as const, moment }));
    if (!sponsoredSlot) return out;
    // Clamp so a position past the end appends rather than creating a gap, and
    // so a negative position cannot produce an unreachable card.
    const at = Math.min(Math.max(sponsoredPosition, 0), out.length);
    out.splice(at, 0, { kind: "sponsored" as const, key: SPONSORED_CARD_KEY });
    return out;
  }, [feed, sponsoredSlot, sponsoredPosition]);

  // Active card, derived from scrollTop (see the listener below).
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  // Engagement overrides keyed by moment id. Seeded from the server payload,
  // then superseded by the authoritative result of each action.
  //
  // `kinds` is the per-kind split, so each reaction button reconciles its OWN
  // number from the server rather than every button snapping to the combined
  // total.
  const [social, setSocial] = useState<
    Record<
      string,
      {
        count: number;
        reacted: boolean;
        comments: number;
        kinds: ReactionTally;
        /**
         * WHICH kind the viewer used, per moment.
         *
         * ── WHY THIS IS PER MOMENT, NOT ONE PIECE OF COMPONENT STATE ────────────
         * This used to be a single `reactionKind` useState that was reset to null
         * on every card change. That was the source of the "it increments, then
         * snaps back down" report, and it produced two distinct bugs:
         *
         * 1. SCROLL AWAY AND BACK LOSES THE HIGHLIGHT. `reacted` lives in `social`
         *    and so survived paging, but the highlight is `reacted && reactionKind
         *    === kind`. With `reactionKind` nulled on the card change, a member who
         *    had tapped FIRE came back to a chip that still showed the incremented
         *    count but no longer looked selected — the count said yes and the
         *    highlight said no.
         *
         * 2. TAPPING THE SAME CHIP TWICE DOUBLE-COUNTS. The toggle test was
         *    `reactionKind === kind && base.reacted`. After a page round trip
         *    `reactionKind` was null while `social[id].reacted` was still true, so
         *    tapping the same chip again computed `nextReacted = true` and
         *    incremented. The server, seeing the same kind again, correctly DELETED
         *    the row — so the count went up on tap and then snapped back down when
         *    the authoritative result landed. That is precisely the reported
         *    symptom, and it is why the fix has to key the kind to the moment
         *    rather than merely reseed it.
         *
         * Storing it beside the rest of the per-moment engagement state makes the
         *    two impossible to disagree: they are written in the same update.
         */
        kind: ReactionKind | null;
      }
    >
  >({});
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  // Declared here rather than beside the comment-sheet logic further down: the
  // scroll/keyboard effects above read `commentsOpen` in their dependency
  // arrays, and a `const` referenced before its initialiser throws at render.
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentList, setCommentList] = useState<MomentCommentView[]>([]);
  // Scroll container for the comment sheet, so a new comment can be scrolled
  // into view.
  const commentListRef = useRef<HTMLDivElement>(null);
  const [commentDraft, setCommentDraft] = useState("");
  /**
   * Tap-to-hide. When false, every non-essential overlay (top bar, action rail,
   * bottom bar, caption) fades out so the media plays completely unobstructed —
   * the same gesture-driven "cinema view" every reels/stories product has.
   *
   * Separate from the per-card reset below: that one restores chrome when the
   * CARD changes, this one is the member's own intent on the current card.
   */
  const [chromeVisible, setChromeVisible] = useState(true);
  // Follow overrides keyed by author id, superseded by each action's result.
  // Held separately from `social` because a follow is a property of the AUTHOR,
  // not of one moment: following someone once must hold for every card they
  // have posted, so it cannot be keyed by moment id.
  const [followOverrides, setFollowOverrides] = useState<
    Record<string, { following: boolean; followerCount: number }>
  >({});
  const [followBusy, setFollowBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Never index out of range when the feed shrinks underneath us.
  //
  // `total` counts SPONSORED CARDS AS WELL AS MOMENTS, because `index` is derived
  // from `scrollTop / clientHeight` and that counts every snapped child in the
  // scroller. Counting only moments here would make `safeIndex` cap below the
  // real card count, so the last moment would be unreachable and paging
  // would stop early.
  const total = cards.length;
  const safeIndex = total > 0 ? Math.min(Math.max(index, 0), total - 1) : 0;

  // Where the sponsored card landed, published to client children (the card
  // itself) through context. Computed from the SAME clamped value the `cards`
  // memo uses, so the two can never disagree about the index.
  const sponsoredIndex = useMemo(
    () =>
      sponsoredSlot
        ? Math.min(Math.max(sponsoredPosition, 0), feed.length)
        : null,
    [sponsoredSlot, sponsoredPosition, feed.length]
  );

  const activeCard = cards[safeIndex] ?? null;

  // The 24-hour segment window, its interval, `segmentIndices` and
  // `segmentsFilled` were removed along with the progress bars. They existed
  // only to draw the strip; nothing else read them. Note that the window was
  // presentational and never filtered the feed — an older moment was always a
  // real, scrollable, fully rendered card — so removing it changes nothing
  // about which moments exist. See SEGMENT_WINDOW_MS's removal above.
  //
  // `current` is null for the sponsored card, which is exactly what the
  // moment-only overlays already handle by testing `current` - so the card
  // suppresses them for free, without a branch at each of the ~20
  // `current.` dereferences below.
  const current = activeCard?.kind === "moment" ? activeCard.moment : null;

  /* ------------------------------------------------------------ offline video
     Pre-cache the next few clips so the feed keeps playing on a dead connection.

     THE QUEUE IS DERIVED FROM `cards`, NOT `feed`. `cards` is the scroller's real
     index space — the sponsored card is spliced into it — so slicing it keeps the
     prefetcher in lockstep with what the scroll listener will actually snap to
     next. Slicing `feed` instead would drift by one the moment a sponsored card
     is present, and would cache the wrong video.

     THREE FILTERS, each for a different reason:
       1. `kind === "moment"`  — a sponsored card has no moment and no media.
       2. `mediaType === "video"` — IMAGES ARE DELIBERATELY NOT CACHED. A phone
          photo is already on the device or arrives as a few hundred KB; spending
          a scarce video budget on it would evict an actual video. A "link" card
          is a third-party embed (YouTube/TikTok) — caching another origin's
          player is neither possible nor appropriate.

     The worker re-checks the extension on the path, so a video URL that is
     missing an extension is silently skipped rather than cached as junk.

     The slice EXCLUDES the active card (`safeIndex + 1`). Caching the video
     already playing is pure waste: it is mid-download, and the worker's fetch
     handler deliberately does not store on sight, so a duplicate would still be
     fetched in full. */
  const prefetchUrls = useMemo(
    () =>
      cards
        .slice(safeIndex + 1, safeIndex + 1 + PREFETCH_AHEAD)
        .filter(
          (card): card is Extract<FeedCard, { kind: "moment" }> =>
            card.kind === "moment" && card.moment.mediaType === "video" && Boolean(card.moment.mediaUrl)
        )
        .map((card) => card.moment.mediaUrl),
    [cards, safeIndex]
  );

  useVideoPrefetch(prefetchUrls);
  useReconnectPrefetch();

  // Effective engagement for the visible card: local override if present,
  // otherwise the server-rendered values.
  const reactions = current
    ? (social[current.id]?.count ?? current.reactionCount ?? 0)
    : 0;
  // Per-kind split, so each reaction button shows its OWN number. Falls back to
  // the server-rendered tally, then to the combined total attributed to the
  // viewer's own kind (so a legacy row with no split still reads sensibly).
  const reactionKinds = current
    ? (social[current.id]?.kinds ??
       current.reactionKinds ??
       (current.reactedByMe && current.myReactionKind
         ? { [current.myReactionKind]: current.reactionCount ?? 0 }
         : {}))
    : {};
  const reacted = current
    ? (social[current.id]?.reacted ?? current.reactedByMe ?? false)
    : false;
  // Which kind the VIEWER used on this moment, for the chip highlight. Falls back
  // to the server's `myReactionKind` so a card that was already liked before this
  // component mounted highlights correctly on first paint.
  const myReactionKind = current
    ? (social[current.id]?.kind ?? current.myReactionKind ?? null)
    : null;
  // Follow state for the ACTIVE card's author, with any local override applied.
  const amFollowingAuthor = current
    ? (followOverrides[current.userId]?.following ?? current.amFollowingAuthor ?? false)
    : false;

  /**
   * Follow / unfollow the active card's author.
   *
   * Optimistic, then reconciled with the server's follower count. The override
   * is keyed by AUTHOR rather than moment id, so tapping Follow on one card
   * immediately updates every other card that same member has posted - the
   * button must never disagree with itself as the viewer scrolls.
   */
  function toggleFollow() {
    if (!current || current.isMine || !viewerId || followBusy) return;
    const targetId = current.userId;
    const base = followOverrides[targetId] ?? {
      following: current.amFollowingAuthor ?? false,
      followerCount: current.authorFollowerCount ?? 0,
    };
    const next = !base.following;
    setFollowBusy(true);
    setFollowOverrides((prev) => ({
      ...prev,
      [targetId]: {
        following: next,
        followerCount: Math.max(0, base.followerCount + (next ? 1 : -1)),
      },
    }));
    startTransition(async () => {
      const result = await setFollowAction({ targetUserId: targetId, follow: next });
      setFollowBusy(false);
      if (!result.ok) {
        // Roll back to the server-known state.
        setFollowOverrides((prev) => ({ ...prev, [targetId]: base }));
        setSendError(result.error ?? "Couldn't update follow");
        return;
      }
      setFollowOverrides((prev) => ({
        ...prev,
        [targetId]: { following: result.following, followerCount: result.followerCount },
      }));
      setSendError(null);
    });
  }
  const commentCount = current
    ? (social[current.id]?.comments ?? current.commentCount ?? 0)
    : 0;

  /**
   * Shared fade for every non-essential overlay.
   *
   * `pointer-events-none` alongside `opacity-0` is essential, not cosmetic: a
   * fully transparent button still swallows taps, so the hidden action rail
   * would silently eat taps meant for the media underneath. Hiding the chrome
   * has to make the area genuinely inert.
   */
  const chromeClass = [
    "transition-opacity duration-300 ease-out",
    chromeVisible ? "opacity-100" : "pointer-events-none opacity-0",
  ].join(" ");

  /**
   * Tap anywhere neutral to toggle the chrome.
   *
   * The target is a transparent full-surface button rather than an onClick on
   * the <article>, because a click handler on an ancestor would ALSO fire when
   * the member taps a real control inside it (like, comment) — the
   * event bubbles up. React's synthetic events make this easy to get wrong:
   * the like button would register, and the chrome would then hide out from
   * under the reaction the member just made. A dedicated button that the
   * overlays are SIBLINGS of (not descendants of) cannot catch their clicks.
   *
   * It is a <button>, not a touch handler, so it never interferes with the
   * vertical snap gesture: a scroll is a drag and does not fire a click.
   */
  function toggleChrome() {
    setChromeVisible((visible) => !visible);
  }

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
   * Per-user media navigation (story-style).
   *
   * For each card, the index of the previous/next card by the SAME author, plus
   * that author's position and total. Precomputed once per feed so a tap is a pure
   * lookup rather than a scan, and so a member whose uploads are interleaved with
   * other people's gets the right neighbours rather than merely the adjacent card.
   *
   * `null` means "this author has no further media in the feed", which is the
   * common case and is why those tap zones are not rendered at all.
   */
  const authorNav = useMemo(() => {
    const byAuthor = new Map<string, number[]>();
    // Indexed by CARD index, not moment index: the sponsored card occupies a
    // slot in the scroller, and this table is looked up with `authorNav[safeIndex]`.
    // The sponsored entry has no author, so it contributes no neighbours and
    // therefore renders no invisible tap zones.
    cards.forEach((card, i) => {
      if (card.kind !== "moment") return;
      const list = byAuthor.get(card.moment.userId);
      if (list) list.push(i);
      else byAuthor.set(card.moment.userId, [i]);
    });

    return cards.map((card, i) => {
      if (card.kind !== "moment") {
        return { prev: null, next: null, position: 1, total: 1 };
      }
      const indices = byAuthor.get(card.moment.userId) ?? [i];
      const at = indices.indexOf(i);
      return {
        prev: at > 0 ? indices[at - 1] : null,
        next: at < indices.length - 1 ? indices[at + 1] : null,
        position: at + 1,
        total: indices.length,
      };
    });
  }, [cards]);

  const nav = authorNav[safeIndex] ?? { prev: null, next: null, position: 1, total: 1 };

  /**
   * Jump to the deep-linked moment once, after the feed's first paint.
   *
   * Two things this deliberately gets right:
   *
   * - Gated on a ref, so it cannot fight the user. Without it, any re-render
   *   triggered while they are reading the target (a comment lands, a reaction
   *   reconciles) would yank them back to the same card.
   * - The target index is resolved against `cards`, which is the SPONSORED-AWARE
   *   list. Resolving against `feed` instead would be off by one for every moment
   *   after the sponsored slot, landing on a neighbouring card.
   */
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (deepLinkDone.current) return;
    if (!deepLinkMomentId || total === 0) return;
    const at = cards.findIndex(
      (c) => c.kind === "moment" && c.moment.id === deepLinkMomentId
    );
    // Unknown id (deleted post, or one filtered out of the feed): leave the user
    // at the top rather than scrolling to a wrong-but-valid index.
    if (at < 0) {
      deepLinkDone.current = true;
      return;
    }
    deepLinkDone.current = true;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: at * el.clientHeight, behavior: "instant" as ScrollBehavior });
    setIndex(at);
  }, [deepLinkMomentId, cards, total]);

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
    // The viewer's chosen reaction kind is NOT reset here. It lives in `social`,
    // keyed by moment id, precisely so it survives paging — nulling it was what
    // made a liked card lose its highlight and made a re-tap double-count. The
    // rest of this reset is genuine per-card UI (drafts, sheets, menus); a
    // reaction is durable per-moment state that already belongs to the server.
    // A new moment always starts with its chrome showing. Carrying the previous
    // card's hidden state forward would drop the viewer into a bare frame with
    // no obvious way back, because the tap target that reveals the chrome is
    // itself part of the chrome.
    setChromeVisible(true);
    // Re-mute on every card change. Without this the unmuted state CARRIES to
    // the next video, so two elements can believe they own the audio channel and
    // the browser silently drops one of them - a very real cause of the reported
    // "sound drops". Re-muting here also means a newly focused card always
    // starts under the autoplay-safe default and sound is an explicit opt-in.
    setMuted(true);
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

  /**
   * React to the ACTIVE moment with `kind`.
   *
   * ── ONE CODE PATH FOR EVERY REACTION CONTROL ─────────────────────────────────
   * This deliberately replaces separate `toggleReact` (the rail heart) and
   * `reactWith` (the chip row) handlers. They disagreed in a way that produced the
   * reported bug:
   *
   *   • The rail heart wrote kind `"like"` and set the highlight to `"like"`,
   *     while the heart CHIP in the reaction row is kind `"love"`. So tapping the
   *     heart in one place produced a chip that lit up somewhere else, and the
   *     rail heart could not clear a `"love"` reaction the chips had set — it
   *     would write a second `"like"` row against the (moment_id, user_id) unique
   *     constraint, fail, and leave the count apparently stuck.
   *
   *   • Only `reactWith` tracked `reactionKind`, and it tracked it in a single
   *     component-scoped slot that was nulled on every page change — which is what
   *     made a re-tap of the same chip increment and then snap back (see the
   *     `social.kind` note above).
   *
   * Now every control routes through here, so one tap means one row in
   * `moment_reactions` and one consistent optimistic update.
   *
   * TOGGLE SEMANTICS, which is the "only decrement if they explicitly un-react"
   * rule:
   *   • same kind  -> remove the reaction (an explicit un-tap)
   *   • other kind -> swap to the new kind (one row, count unchanged)
   *   • no row     -> insert
   * This mirrors `setMomentReaction` on the server exactly. Note the swap case:
   * the COMBINED count must not move, but both per-kind tallies must, or the two
   * chips would disagree with each other and with the total.
   */
  function reactWith(kind: ReactionKind) {
    if (!current || !viewerId) return;
    const momentId = current.id;
    const base = social[momentId] ?? {
      count: current.reactionCount ?? 0,
      reacted: current.reactedByMe ?? false,
      comments: current.commentCount ?? 0,
      kinds: current.reactionKinds ?? {},
      // Seed from the server payload, NOT from a component-scoped slot. The
      // server already tells us which kind this viewer used (`myReactionKind`),
      // so the highlight is correct on the very first render of a card that was
      // already liked — with no effect and no window where it is wrong.
      kind: current.myReactionKind ?? null,
    };

    const isSameKind = base.reacted && base.kind === kind;
    const nextReacted = !isSameKind;
    const nextCount = base.count + (isSameKind ? -1 : base.reacted ? 0 : 1);

    // Move the per-kind tallies optimistically so the chip the member just tapped
    // visibly increments immediately. On a SWAP the old kind loses one and the new
    // gains one, which is what keeps the two chips summing to the total.
    const optimisticKinds = { ...base.kinds };
    if (isSameKind) {
      optimisticKinds[kind] = Math.max(0, (optimisticKinds[kind] ?? 0) - 1);
    } else {
      if (base.reacted && base.kind) {
        optimisticKinds[base.kind] = Math.max(0, (optimisticKinds[base.kind] ?? 0) - 1);
      }
      optimisticKinds[kind] = (optimisticKinds[kind] ?? 0) + 1;
    }

    setSocial((prev) => ({
      ...prev,
      [momentId]: {
        ...base,
        reacted: nextReacted,
        kind: nextReacted ? kind : null,
        count: Math.max(0, nextCount),
        kinds: optimisticKinds,
      },
    }));

    startTransition(async () => {
      const result = await setMomentReactionAction({ momentId, kind });
      if (!result.ok) {
        // Roll all the way back to the last known-good state, including the kind,
        // so a failed tap cannot leave a chip highlighted that the server rejected.
        setSocial((prev) => ({ ...prev, [momentId]: base }));
        setSendError(result.error ?? "Could not save your reaction");
        return;
      }
      // The server is authoritative for the total and the split. `result.reacted`
      // is false only when the server took this as an un-tap; `result.kinds` then
      // no longer contains `kind`, so the highlight is cleared to match rather
      // than being inferred from the request we happened to send.
      setSocial((prev) => ({
        ...prev,
        [momentId]: {
          ...base,
          reacted: result.reacted,
          kind: result.reacted ? kind : null,
          count: result.count,
          kinds: result.kinds,
        },
      }));
      setSendError(null);
    });
  }

  // Keep the newest comment in view.
  //
  // The sheet is chronologically ordered (oldest first, so it reads as a
  // conversation) which means the newest entry is at the BOTTOM. Without this
  // the list opens scrolled to the top and a member who just posted has to hunt
  // for their own comment — the single most confusing state a live thread can be
  // in. rAF because the sheet may not be laid out yet when the list changes.
  useEffect(() => {
    if (!commentsOpen) return;
    const frame = requestAnimationFrame(() => {
      const el = commentListRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [commentList, commentsOpen]);

  /* The second `reactWith` that used to live here has been deleted. It ran AFTER
     the card change effect below nulled `reactionKind`, it re-derived `base`
     without the per-moment `kind`, and it incremented unconditionally on a re-tap
     — the exact snap-back path. All reaction writes now go through the single
     `reactWith` defined above. */

  /**
   * Delete the active moment, after an explicit confirmation.
   *
   * The button only renders for `current.isMine`, but that is a UI affordance
   * only — the real check is server-side, in `deleteMoment`, which scopes every
   query to the session uid. Hiding the control for other members' posts is a
   courtesy, never the enforcement.
   *
   * `window.confirm` rather than a custom dialog: deletion is destructive and
   * irreversible here (the file is removed from the bucket), and the browser
   * dialog is the one confirmation that cannot be styled away or dismissed by a
   * stray Enter keypress on the feed.
   */
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteActiveMoment() {
    if (!current || deleteBusy) return;
    if (!window.confirm("Delete this moment? This cannot be undone.")) return;

    const momentId = current.id;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const result = await deleteMomentAction(momentId);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      // Drop the card locally so the feed responds immediately rather than
      // waiting for the revalidated server payload to come back down.
      onDeleted?.(momentId);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete your moment"
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  function postComment() {
    if (!current || !commentDraft.trim()) return;
    const momentId = current.id;
    /* The fallback object must carry the FULL per-moment shape. It previously
       omitted `kinds` and `kind`, so a member who had never reacted and then
       posted their first comment got a `social[momentId]` entry with no tally —
       and because `social[id].kinds` takes precedence over the server payload
       everywhere it is read, every reaction chip on that card dropped to zero and
       lost its highlight. The comment count incremented correctly, which is why
       it looked like the reactions had been "reset by" commenting on the post.

       Seeding `kind` from `myReactionKind` for the same reason: a card that was
       already liked but had no local override yet must not lose that highlight
       the moment an unrelated field is written. */
    const base = social[momentId] ?? {
      count: current.reactionCount ?? 0,
      reacted: current.reactedByMe ?? false,
      comments: current.commentCount ?? 0,
      kinds: current.reactionKinds ?? {},
      kind: current.myReactionKind ?? null,
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
    // Provider, not a wrapper element: the card is nested several levels down
    // inside the scroller, and context is the only way to reach it without
    // threading `active` through every intermediate component. Values are
    // primitives, so this adds no render cost of its own.
    <FeedActiveProvider value={{ activeIndex: safeIndex, sponsoredIndex }}>
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
        // `landscape-bleed` is the hook the landscape block in globals.css
        // targets to take the feed to the full viewport on a rotated phone —
        // no side columns, no card border, no shell gutters. See globals.css
        // LANDSCAPE.
        "landscape-bleed relative flex w-full select-none flex-col overflow-hidden bg-slate-950",
        fill ? "h-full min-h-0" : "h-dvh",
      ].join(" ")}
    >
      {/* -------------------------------------------------- gradient scrims
          Legibility without a blocking card.

          White text over arbitrary video is unreadable — a bright frame (snow,
          sky, a white shirt) erases the caption and the creator's name entirely.
          The previous fix was `drop-shadow` on the text, which produces a hard
          dark outline that reads as a sticker stuck to the image.

          A soft gradient is the professional answer: it darkens the image only
          where text actually sits, falls off smoothly, and leaves the middle of
          the frame — the part the member is actually looking at — completely
          untouched. Both scrims are siblings that render BEFORE the overlays and
          ignore pointer events, so they never intercept a tap.

          GATED ON `feed.length` for the same reason the media is: with an empty
          feed there is no image to darken, and scrims would just wash out the
          empty-state copy. */}
      {feed.length > 0 ? (
        <>
          <div
            aria-hidden
            className={[
              "landscape-hide-chrome pointer-events-none absolute inset-x-0 top-0 z-20 h-40",
              "bg-gradient-to-b from-slate-950/85 via-slate-950/45 to-transparent",
              "sm:h-48",
              chromeClass,
            ].join(" ")}
          />
          <div
            aria-hidden
            className={[
              "landscape-hide-chrome pointer-events-none absolute inset-x-0 bottom-0 z-20 h-64",
              "bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent",
              "sm:h-72",
              chromeClass,
            ].join(" ")}
          />

          {/* Tap target for cinema view. Sits UNDER every overlay (z-10) and
              spans the stage, so a tap in any empty area toggles the chrome
              while taps on real controls are handled by the controls themselves. */}
          <button
            type="button"
            onClick={toggleChrome}
            aria-label={chromeVisible ? "Hide interface" : "Show interface"}
            className="absolute inset-0 z-10 cursor-default"
            tabIndex={-1}
          />
        </>
      ) : null}

      {/* ---------------------------------------------------- top overlay */}
      <header
        className={[
          /* `landscape-hide-chrome` drops the top overlay (search, creator
             identity, options menu) on a rotated phone — see globals.css
             LANDSCAPE. In a ~360px-tall landscape viewport this stack of
             absolutely-positioned chrome sits directly on top of the video the
             member rotated specifically to watch. */
          "landscape-hide-chrome pointer-events-none absolute inset-x-0 top-0 z-30 shrink-0",
          chromeClass,
        ].join(" ")}
      >
        {/* Two rows on phones: the search unit owns a full-width line of its own,
            with the secondary controls tucked to its right. From `sm` up they
            share one row, because there is finally room for both. The search is
            ordered first in the DOM so it takes the leftover width, not the
            location badge.

            ── THE SAFE-AREA INSET IS DELIBERATELY ABSENT HERE ────────────────────
            This used to be `pt-[calc(0.75rem+env(safe-area-inset-top))]`. Now that
            the screen header above (`MobileBackHeader`) is the element at the top
            of this route, and it already applies `pt-[env(safe-area-inset-top)]`,
            repeating it here inset this overlay a SECOND time by the height of the
            status bar.

            That is what produced the "two bars" appearance on the reels view: the
            header bar, then a band of dead space, then the search row — reading as
            a separate stacked header that the video was sliding under. The inset
            belongs to the ONE element that touches the physical top edge of the
            screen, and that is the header.

            So the top padding here is a plain, even `0.75rem`: this overlay sits
            below the header and just needs breathing room. */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 px-3 pt-3 sm:flex-nowrap sm:gap-3 sm:px-5 sm:pt-4">
          {searchSlot ? <div className="order-1 min-w-0 flex-1 basis-full sm:basis-auto">{searchSlot}</div> : null}
          <div className="order-2 ml-auto flex shrink-0 items-center gap-2">
            {topRightSlot ? <div className="flex shrink-0 items-center gap-2">{topRightSlot}</div> : null}
          {/* Per-card options menu (copy link / report). */}
          {current ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((open) => !open);
                  // Clear a previous failure as the member re-opens the menu:
                  // that is where they came to retry, so a stale error would
                  // still be on screen when the action they want sits under it.
                  setDeleteError(null);
                }}
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

                  {/* Owner-only delete, inside the menu rather than on the card.
                      Destructive actions belong in a menu: a free-standing
                      button one stray tap from the reaction row is how a member
                      loses a post they meant to scroll past. Hiding it here is a
                      courtesy — the enforcement is server-side in deleteMoment,
                      which scopes every query to the session uid, so a member
                      who reaches this by any other route still cannot delete
                      somebody else's moment. */}
                  {current.isMine ? (
                    <>
                      {/* Hairline above the destructive row, so it reads as a
                          separate group rather than a fourth peer option. */}
                      <span aria-hidden className="my-1 block h-px bg-white/10" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          // Close first: the confirmation dialog is modal, and a
                          // menu left open behind it would be a stray click
                          // target on the way back.
                          setMenuOpen(false);
                          void deleteActiveMoment();
                        }}
                        disabled={deleteBusy}
                        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
                      >
                        <span>Delete Moment</span>
                        {deleteBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          </div>
        </div>

        {/* Delete failure notice.
            Lives in the overlay rather than in the options menu because the menu
            is closed the moment a delete is attempted — an error rendered inside
            it would never be seen. Dismissed explicitly, since a delete that
            half-failed (row gone, file left behind) is exactly the case a member
            needs to read and then act on. */}
        {deleteError ? (
          <div className="pointer-events-auto mx-3 mt-2 flex items-center justify-between gap-2 sm:mx-5">
            <p role="alert" className="text-xs text-rose-300">
              {deleteError}
            </p>
            <button
              type="button"
              onClick={() => setDeleteError(null)}
              className="shrink-0 text-[11px] font-semibold text-white/70 underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}


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
                className="block truncate text-sm font-semibold text-white"
              >
                {current.authorName ?? "Member"}
              </Link>
              <p className="truncate text-xs text-white/70">
              {formatWhen(current.createdAt)}
                {/* Story-style position within this author's own media. Shown
                    only when they have more than one item in the feed. */}
                {nav.total > 1 ? (
                  <span className="ml-1.5 rounded-full bg-black/40 px-1.5 py-px text-[10px] font-semibold text-white/80">
                    {nav.position}/{nav.total}
                  </span>
                ) : null}
            </p>
            </div>

            {/* Follow control.
                Deliberately in the creator bar rather than the action rail:
                the rail is a fixed-width column whose geometry was just fixed
                (0deef74), and a variable-width pill would re-introduce the
                overlap that commit removed. */}
            {current && !current.isMine ? (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={!viewerId || followBusy}
                aria-pressed={amFollowingAuthor}
                aria-label={
                  amFollowingAuthor
                    ? `Unfollow ${current.authorName ?? "this member"}`
                    : `Follow ${current.authorName ?? "this member"}`
                }
                className={[
                  "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition active:scale-95 disabled:opacity-50",
                  amFollowingAuthor
                    ? "border border-white/25 bg-white/10 text-white/80"
                    : "border border-transparent bg-white text-slate-950",
                ].join(" ")}
              >
                {amFollowingAuthor ? "Following" : "Follow"}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>
      {/* -------------------------------------------------------- the media
          Gated on `feed.length`, NOT on `current`. The sponsored card makes
          `current` null while it is the card on screen, and testing `current`
          here would replace the whole scroller with the "no moments yet"
          empty state the moment a member scrolled onto it. `feed.length` is the
          real question - is there anything to play? */}
      {feed.length === 0 ? (
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
          {/* Reward / earn control, supplied by the host page. Sits below the
              empty-state copy so it never competes with the primary upload
              action above it. */}
          {rewardSlot ? <div className="mt-4 w-full max-w-xs">{rewardSlot}</div> : null}
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
          {cards.map((card, i) => {
            const item = authorNav[i];
            if (!item) return null;
            // The sponsored card occupies a real snap point but has no moment,
            // no media and no author, so it renders its own body and skips
            // every moment-only affordance (tap zones, surface, rail).
            if (card.kind === "sponsored") {
              return (
                <article
                  key={card.key}
                  className="relative h-full w-full shrink-0 snap-start snap-always"
                  aria-roledescription="sponsored moment"
                  aria-label={`Sponsored moment, ${i + 1} of ${total}`}
                >
                  {/* `z-20` IS LOAD-BEARING HERE TOO - see the note on the
                      moment card below.

                      THE FEED FREEZE THIS FIXES: the cinema-view tap target is an
                      `absolute inset-0 z-10` <button> painted BEFORE the scroller.
                      On a moment card the media stack is lifted to `z-20`, so it
                      sits above that button and every touch-drag lands on the
                      scroller - which is what makes the swipe gesture work. The
                      sponsored article had NO such lift, so the z-10 button
                      covered the whole card. Dragging anywhere on the ad therefore
                      fed the gesture to a <button> instead of the snap scroller:
                      the viewport locked solid and would not scroll up or down
                      until the member tapped elsewhere. Wrapping the slot in the
                      same z-20 layer the moments get restores the scroller as the
                      hit target for the ad card as well. */}
                  <div className="relative z-20 h-full w-full">
                    {sponsoredSlot}
                  </div>
                </article>
              );
            }
            const moment = card.moment;
            return (
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
              {/* `z-20` IS LOAD-BEARING, and this is the fix for the YouTube play
                  button doing nothing.

                  The cinema-view overlay elsewhere in this component is a
                  full-surface button at `z-10`, and it is painted BEFORE the
                  scroller. The media used to be unpositioned (`z-auto`) inside
                  the article, so a `z-10` overlay earlier in source order beat
                  it and swallowed every tap aimed at the media — the YouTube
                  poster's own "tap to play" button, and the native <video>
                  element's controls.

                  Lifting the whole media stack to `z-20` puts the media, its
                  tap-to-play button and the embed poster above that overlay, so
                  taps reach the media as intended. The chrome (header at z-30,
                  action rail and caption at z-20+) is unaffected: those are
                  pointer-events-none containers whose actual controls re-enable
                  pointer events on themselves only, so they still win on the
                  few pixels they genuinely occupy. */}
              <div className="relative z-20 h-full w-full">
                <MediaSurface
                  moment={moment}
                  muted={muted}
                  active={i === safeIndex}
                  // Keeps the rail's mute icon honest when recovery grants sound
                  // imperatively, outside React's state.
                  onRequestUnmuteProp={() => setMuted(false)}
                />
              </div>

              {/* Story-style tap navigation within one author's media was removed.

                  These were invisible one-third-wide <button>s over the left and
                  right edges. They are gone for two reasons:

                    1. They are pointer navigation, and paging is now purely the
                       vertical snap scroller (swipe / wheel / arrow keys).
                    2. More importantly they were INVISIBLE HIT TARGETS over the
                       media. Together with the full-surface cinema-view target
                       they covered essentially the whole card, which is why taps
                       never reached the video's own controls. With tap-to-play
                       now living on the media itself, any full-width overlay
                       sitting above the video silently breaks playback.

                  `item.prev` / `item.next` are still used for the creator bar's
                  position readout, so the per-author media map is unchanged. */}
            </article>
            );
          })}
        </div>

          {/* Caption only. The author identity (avatar, handle, timestamp) now
              lives in the top bar above, per the reel/stories standard, so
              repeating it here would print the same name twice on one card.

              ── LIFTED ABOVE THE ENGAGEMENT BAR ────────────────────────────────
              This block was left at `bottom-24 sm:bottom-28` when the reaction
              bar was lifted 80px in d71bc44, and that left it INSIDE the bar's
              new range. The bar's bottom edge is the 5rem nav offset (80px) and
              its content runs ~90px tall above that — reactions row, its `mb-2`,
              and the message input — so the bar now occupies roughly 80–172px.
              A caption anchored at 96px therefore printed straight through the
              quick reactions: the one screen the bar was lifted to save.

              `bottom-[calc(11.5rem+...)]` (184px) clears that range with ~12px of
              breathing room. The safe-area term is ADDED to the offset, matching
              every other control here, so the clearance survives a home indicator.

              No `sm:` variant on purpose: the bar is `md:hidden` with no wider
              breakpoint of its own, and the caption's height is capped at three
              lines, so it does not need a different offset at larger sizes. */}
          <div
            className={[
              "landscape-hide-chrome pointer-events-none absolute inset-x-0 bottom-[calc(11.5rem+env(safe-area-inset-bottom))] z-20 px-4 pr-24 sm:px-6 sm:pr-28",
              chromeClass,
            ].join(" ")}
          >
            {/* Caption only, and only for a moment. `current` is null while the
                sponsored card is on screen, so the test doubles as the
                moment/sponsored discriminator - the card renders its own body
                and needs no caption here. */}
            {current?.content ? (
              <p className="mt-2 line-clamp-3 max-w-xl text-sm leading-6 text-white/95">
                {current.content}
              </p>
            ) : null}
            {/* Reward control, pinned above the bottom bar so it is reachable
                while the feed is populated (the empty-state copy of the same
                slot only renders when there is nothing to play). This container
                is pointer-events-none so taps fall through to the media beneath,
                hence the explicit pointer-events-auto on the slot itself. */}
            {rewardSlot ? (
              <div className="pointer-events-auto mt-3 max-w-xs">{rewardSlot}</div>
            ) : null}
          </div>

          {/* The vertical ^/v pager was removed. Combined with the progress bars
              and the horizontal chevrons, it left the feed with three separate
              paging affordances for one gesture, and the arrows were the worst of
              them: a fixed control sitting over the video on a phone, in a column
              that had already collided with the action rail once and needed its
              own `right-20` column to avoid a second collision.

              Navigation is now purely the vertical snap scroller — swipe, wheel,
              or arrow keys — which is the whole point of a short-video feed. The
              keyboard handler is untouched, so this removes a redundant pointer
              control without removing any way of getting around the feed. */}

          {/* Action rail - reactions, comments, share and mute.

              STRUCTURE: each control is a `RailItem` - a button with its counter
              directly beneath it, inside one wrapper. The old markup emitted the
              button, then a SEPARATE `-mt-2` span, then the next button, so the
              gap between two controls was whatever `gap-4` happened to be
              minus a negative margin, and the counters sat closer to the next
              control than to their own button. Grouping them makes each
              control+count an inseparable unit that floats cleanly.

              LIGHTER SURFACE: `bg-slate-950/60` with a `border-white/10` edge
              read as a solid tile sitting ON the video. The buttons are now
              smaller and more transparent, so they float over the frame rather
              than cutting a chunk out of it.

              `bottom-44 sm:bottom-52` (176 / 208px) is set by the upload FAB
              directly below it, not picked for looks. The FAB is 56px tall at
              `bottom-24 sm:bottom-28`, so its top edge sits at 152 / 168px; the
              old `bottom-36 sm:bottom-40` put the rail's bottom edge at 144 /
              160px and the two overlapped by 8px on sm+. The rail now clears it
              by 24px on phones and 40px on larger screens.

              `right-3 sm:right-4` keeps the rail in the outermost column, clear
              of the caption block's `pr-24` reservation. */}
          <div
            className={[
              /* `landscape-hide-chrome` — the rail is a column of `bottom-44`
                 offsets that has no room to exist in a short landscape
                 viewport, and it would sit over the video. */
              /* The rail moved up 80px with the reaction bar, so it now clears
                 the bottom tab bar instead of sitting under it. The FAB below is
                 in the same right-hand column and moved by the same amount —
                 they are stacked, so moving one without the other would simply
                 have re-collided them.

                 Offsets are 13rem / 14rem (was `bottom-44 sm:bottom-52`, i.e.
                 11rem / 13rem). The rail keeps the same gap to the FAB it always
                 had, so that spacing is unchanged. */
              "landscape-hide-chrome absolute bottom-[calc(13rem+env(safe-area-inset-bottom))] right-3 z-20 flex flex-col items-center gap-3.5 sm:bottom-[calc(14rem+env(safe-area-inset-bottom))] sm:right-4",
              chromeClass,
            ].join(" ")}
          >
            <RailItem count={reactions}>
              {/* The rail heart is the SAME control as the "love" chip in the
                  reaction row — same kind, same handler, same state. It used to be
                  wired to a separate `toggleReact` that wrote kind `"like"`, which
                  made the two disagree: tapping the rail heart lit up the THUMBS-UP
                  chip, and it could not clear a "love" the chips had set (it tried
                  to insert a second row and lost the unique constraint). One
                  reaction, one path, so the two can never contradict.

                  The count shown is the COMBINED total, matching the rail's other
                  items; the chips break it down per kind beneath. */}
              <ActionButton
                label={reacted ? "Remove like" : "Like this moment"}
                active={reacted}
                disabled={!viewerId}
                onClick={() => reactWith("love")}
              >
                <Heart className="h-6 w-6" fill={reacted ? "currentColor" : "none"} />
              </ActionButton>
            </RailItem>

            <RailItem count={commentCount}>
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
            </RailItem>

            {/* Share sits in the rail rather than only behind the overflow
                menu: it is a primary, frequent action, and burying it one
                menu deep is the main reason members did not share moments.

                The URL is built inline to match the overflow menu's handler
                exactly, so both entry points produce byte-identical links —
                `shareOrCopy` returns a plain status string, not an object. */}
            <RailItem>
              <ActionButton
                label="Share this moment"
                onClick={async () => {
                  const url = `${window.location.origin}/?moment=${current?.id ?? ""}`;
                  const outcome = await shareOrCopy({
                    title: "Couple's Corner",
                    message: `${current?.authorName ?? "Someone"} shared a moment on Couple's Corner. ${url}`,
                  });
                  if (outcome === "copied") notifySuccess("Link copied to clipboard");
                  if (outcome === "failed") {
                    setSendError("Couldn't share or copy this link. Please try again.");
                  }
                }}
              >
                <Share2 className="h-6 w-6" />
              </ActionButton>
            </RailItem>

            {/* Optional chained because the rail is a moment-only affordance and
                `current` is null while the sponsored card holds the screen. The
                enclosing `current ?` block already keeps the rail off that card;
                the `?.` is here so the narrowing survives into this nested
                closure, where TypeScript cannot see the guard. */}
            {current?.mediaType === "video" ? (
              <RailItem>
                <ActionButton
                  label={muted ? "Unmute" : "Mute"}
                  onClick={() => setMuted((m) => !m)}
                >
                  {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </ActionButton>
              </RailItem>
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
          // Solid `bg-orange-500` rather than the orange -> #FF5722 gradient this
          // wore before. The bottom tab bar marks its active item in the same
          // orange, so the primary "share something" action and the navigation
          // highlight now read as one colour system. The gradient's second stop
          // is a different, redder orange, which made the FAB look like it
          // belonged to a different theme than the nav beneath it.
          //
          // Lifted 80px with the reaction bar and the action rail above it. All
          // three are stacked in this right-hand column, and the previous
          // `bottom-24` sat this 56px button under the 5rem tab bar, so the
          // primary "share something" control was partly covered on every phone.
          // The `env()` term is ADDED to the nav height rather than swapped in, so
          // the clearance holds on a device with a home indicator.
          className="landscape-hide-chrome absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] right-3 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-orange-300/50 bg-orange-500 text-white shadow-xl shadow-orange-950/50 ring-4 ring-slate-950/40 transition hover:bg-orange-400 hover:scale-105 active:scale-95 sm:bottom-[calc(8rem+env(safe-area-inset-bottom))] sm:right-4"
        >
          <Plus className="h-7 w-7" />
        </Link>
      ) : null}

      {/* --------------------------------- bottom bar: reactions + messaging */}
      {current ? (
        <div
          className={[
            /* `landscape-hide-chrome` — the reaction + messaging bar is a third
               full-width row over the video; in landscape there is no room for
               it and the video is the point. */
            "landscape-hide-chrome pointer-events-none absolute inset-x-0 z-30 shrink-0",
            /* LIFTED OFF THE BOTTOM EDGE.

               The bar was `bottom-0`, which pinned it flush to the viewport and
               put it directly UNDER the app's bottom tab bar — the reactions and
               the message input were half-covered on every phone, and the input
               is the one control that must always be reachable.

               `bottom-[calc(5rem+env(safe-area-inset-bottom))]` clears the 5rem
               (80px) tab bar and ADDS the home-indicator inset rather than
               swapping it in, so the clearance holds on an iPhone where the bar
               is taller than 5rem. The trailing `pb` shrinks to a small pad: the
               space that used to separate the bar from the screen edge is now
               consumed by the nav it sits above.

               There is deliberately NO `sm:` variant. The bar is `md:hidden` and
               the sidebar rail takes over at md, so a second offset would only be
               another number to keep in step with the nav's height. */
            "bottom-[calc(5rem+env(safe-area-inset-bottom))] px-3 pb-2 sm:px-5",
            chromeClass,
          ].join(" ")}
        >
          {sendError ? (
            <p role="alert" className="mb-2 text-center text-xs text-rose-300">
              {sendError}
            </p>
          ) : null}

          {/* Quick reactions - one tap to react to THIS moment.

              Left-aligned rather than centred: the row now sits directly above
              the message trigger, and centring both left the reactions
              visibly detached from the input they visually belong with. The
              trigger below is `max-w-xl`, so the two share a left edge. */}
          <div className="pointer-events-auto mb-2 flex max-w-xl items-center gap-1.5">
            {QUICK_REACTIONS.map((option) => {
              const active = reacted && myReactionKind === option.kind;
              // Each chip carries its OWN number rather than every chip
              // repeating the combined total, so tapping one visibly moves one
              // counter instead of all of them at once.
              const n = reactionKinds[option.kind] ?? 0;
              return (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => reactWith(option.kind)}
                  disabled={!viewerId}
                  aria-label={`${option.label}${n > 0 ? `, ${n} so far` : ""}`}
                  aria-pressed={active}
                  className={[
                    "flex items-center gap-1 rounded-full border text-base transition active:scale-90 disabled:opacity-40",
                    // A zero counter collapses to the bare icon so the row stays
                    // tidy until there is something to report.
                    n > 0 ? "px-2.5 py-1" : "h-9 w-9 justify-center",
                    active
                      ? "scale-110 border-orange-400/70 bg-orange-500/30"
                      : "border-white/10 bg-white/10 hover:bg-white/20",
                  ].join(" ")}
                >
                  <option.Icon
                    aria-hidden
                    className={[
                      "h-4 w-4 shrink-0 transition",
                      // Love is the app's signature reaction, so it reads filled
                      // once chosen. Every other kind stays a plain outline.
                      active && option.kind === "love" ? "fill-current" : "",
                    ].join(" ")}
                  />
                  {n > 0 ? (
                    <span className="text-xs font-semibold tabular-nums text-white/90">{n}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Message trigger.

              LIGHTER SURFACE: was `border-white/15 bg-slate-950/70` with
              `backdrop-blur-md` — a near-opaque slab across the bottom of the
              frame. It is now a translucent `bg-white/10` that lets the video
              read through, matching the action rail so the two edges of the
              screen speak the same visual language.

              The send button only appears once there is something to send.
              A permanently orange button advertised an action that was almost
              always disabled, pulling the eye to the brightest object on an
              otherwise calm surface. */}
          <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-md transition focus-within:border-white/25 focus-within:bg-white/15">
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
                  className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-white placeholder:text-white/55 focus:outline-none"
                />
                {draft.trim() ? (
                  <button
                    type="button"
                    onClick={sendQuickMessage}
                    disabled={isPending}
                    aria-label="Send message"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-400 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                ) : null}
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
          {/* `w-full` is load-bearing. As a flex item in a column container this
              sheet sized to its CONTENT, so a short comment thread (or one whose
              text wrapped narrow) shrank the sheet and squeezed every row with
              it. Explicitly filling the width makes the text column's available
              space independent of the content. */}
          <div className="relative z-10 flex w-full max-w-lg max-h-[85%] flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#0F172A] shadow-2xl">
            {/* Drag handle. Purely decorative - the sheet is dismissed by the
                backdrop or the close button, not by dragging - but it is the
                strongest signal that this is a dismissible sheet rather than a
                separate page, and every sheet in this pattern has one. */}
            <div aria-hidden className="shrink-0 pt-2.5">
              <div className="mx-auto h-1 w-10 rounded-full bg-white/25" />
            </div>
            <header className="flex shrink-0 items-center justify-between px-4 pb-3 pt-2">
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

            {/*
              The list, and nothing else.

              NO MEDIA IS RENDERED IN HERE. The moment stays on screen behind the
              scrim, so repeating its photo or video inside the drawer would show
              the same thing twice and push the conversation below the fold. The
              sheet is opaque and tall for the same reason: the point of opening
              it is to read and reply, not to re-watch the moment.

              `overscroll-contain` stops a flick at the end of the thread from
              chaining through to the feed's own snap scroller behind it, which
              would silently page away from the moment the member is reading.
            */}
            <div
              ref={commentListRef}
              className="min-h-0 flex-1 overscroll-contain overflow-y-auto overscroll-y-contain px-4 pb-2"
            >
              {commentList.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-400">
                  No comments yet. Be the first to say something.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {commentList.map((comment) => (
                    <li
                      key={comment.id}
                      className="flex items-start gap-3 border-b border-white/5 py-3.5 last:border-b-0"
                    >
                      {/* Circular avatar; falls back to initials when the member
                          has no photo, and to initials again if the image 404s. */}
                      <Avatar
                        name={comment.authorName ?? "Member"}
                        src={comment.authorAvatarUrl}
                        size="sm"
                        className="shrink-0"
                      />
                      {/* Vertical stack - author, then body, then time.
                          `min-w-0` is what allows the text to shrink BELOW its
                          intrinsic width so long words wrap instead of forcing the
                          row wider; `flex-1` gives it the leftover space after the
                          avatar. Both are required: drop `min-w-0` and a single
                          long unbroken string (a URL) pushes the avatar out and
                          the text breaks one character per line. */}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-semibold text-white">
                          {comment.authorName ?? "Member"}
                        </p>
                        {/*
                          `break-words` (not `break-all`): wraps a long URL at a
                          sensible point instead of mid-word. `whitespace-pre-wrap`
                          preserves the author's newlines, which is what makes a
                          threaded reply readable.
                        */}
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-6 text-ink-200">
                          {comment.body}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-400">
                          {formatWhen(comment.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {viewerId ? (
              /*
                Sticky composer.

                It is a `shrink-0` sibling of the scrolling list inside a flex
                column, which is what actually keeps it docked: the list takes
                the remaining space and scrolls, the composer keeps its natural
                height. `env(safe-area-inset-bottom)` matters on notched phones
                and in the iOS browser, where the home indicator otherwise sits
                directly on top of the send button.
              */
              <div className="shrink-0 border-t border-white/10 bg-[#0F172A] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5">
                <div className="flex items-center gap-2">
                  <label htmlFor="moment-comment" className="sr-only">
                    Add a comment
                  </label>
                  <input
                    id="moment-comment"
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        // This is an <input>, not a textarea, so Enter is
                        // unambiguously "send" rather than a newline.
                        event.preventDefault();
                        postComment();
                      }
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
    </FeedActiveProvider>
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
  onRequestUnmuteProp,
}: {
  moment: MomentView;
  muted: boolean;
  /** True for the card currently snapped into view. */
  active: boolean;
  /**
   * Called when the member taps "tap for sound" and the element is unmuted
   * imperatively (outside React's state), so the parent's mute icon stays in
   * sync with what is actually audible.
   */
  onRequestUnmuteProp?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Mirrors the `muted` prop for the playback effect, which must NOT depend on
  // it. Read at the moment playback is (re)started so a card that is already
  // unmuted resumes with sound, without the unmute tap re-triggering a restart.
  const mutedRef = useRef(muted);
  // Drives a fade-in once the bytes are decodable, so paging between moments
  // cross-dissolves rather than flashing an empty black box.
  const [ready, setReady] = useState(false);
  // Set when the element reports a media error. Without this the card would sit
  // at opacity-0 forever: `ready` only ever flips true on a successful decode, so
  // a broken video renders as a permanent BLACK BOX with no explanation - which
  // is exactly the "blank video" symptom.
  const [failed, setFailed] = useState(false);
  // Reloads a failed video in place, so a transient network failure is
  // recoverable by tapping rather than forcing a page reload.
  const [retryKey, setRetryKey] = useState(0);
  // True while the element has run out of buffered media and is waiting on the
  // network. Drives a spinner so a mid-playback rebuffer is visibly "loading"
  // rather than looking like a random pause.
  const [buffering, setBuffering] = useState(false);
  // True when the browser refused audible autoplay. Offers the member the one
  // thing that can recover it: a tap, which is the gesture the policy demands.
  const [blocked, setBlocked] = useState(false);
  // Lets the parent sync its own mute icon when recovery grants sound, so the
  // control never claims "muted" while the video is actually audible.
  const onRequestUnmute = useRef<(() => void) | null>(null);

  /**
   * FULLSCREEN ON ROTATION.
   *
   * A landscape phone is wide and short, and `object-cover` on a portrait-shot
   * video crops almost all of it away — the member rotates to see more and gets
   * the same cropped frame, just sideways. So on rotating into landscape we ask
   * the element for real fullscreen, which drops the feed chrome and lets the
   * browser letterbox the video across the whole screen.
   *
   * WHY THIS IS A REQUEST, NOT A LAYOUT SWITCH: `requestFullscreen()` requires a
   * user gesture on most engines. A rotation IS a user gesture for this purpose
   * in the browsers that matter, but not all, so the promise is caught and
   * ignored — the feed simply stays as it is, which is the correct degradation
   * and never a broken state.
   *
   * Rotating back to portrait exits fullscreen, restoring the feed. Exiting is
   * not gated on a gesture, so it always works.
   *
   * `screen.orientation` is the modern API and is what fires on rotation;
   * `orientationchange` is kept for older iOS Safari, which lacks the former.
   * Both listeners are registered, and both are cheap no-ops when nothing
   * changes.
   *
   * Only the ACTIVE card participates. Every card in the feed is mounted, so
   * without the `active` guard a rotation would pull eleven off-screen videos
   * into fullscreen and leave whichever won the race on screen.
   */
  useEffect(() => {
    if (!active) return;

    const video = videoRef.current;
    if (!video) return;

    type WebkitVideo = HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
      webkitSupportsFullscreen?: boolean;
    };
    const el = video as WebkitVideo;

    const isLandscape = () => {
      const angle = screen.orientation?.type;
      if (angle) return angle === "landscape-primary" || angle === "landscape-secondary";
      // Fallback for engines without the Screen Orientation API.
      return window.innerWidth > window.innerHeight;
    };

    const enter = () => {
      // Standard path: fullscreen the element itself so the video fills the
      // screen and the page chrome (top bar, composer, action rail) is dropped.
      if (el.requestFullscreen) {
        void el.requestFullscreen().catch(() => {});
        return;
      }
      // iPhone Safari on iOS: the element fullscreen API is absent and only
      // `webkitEnterFullscreen` works, which gives the native video player.
      if (typeof el.webkitEnterFullscreen === "function") {
        try {
          el.webkitEnterFullscreen();
        } catch {
          /* nothing to do — the inline player is still usable */
        }
      }
    };

    const exit = () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
        return;
      }
      if (typeof el.webkitExitFullscreen === "function") {
        try {
          el.webkitExitFullscreen();
        } catch {
          /* already out of fullscreen */
        }
      }
    };

    const sync = () => {
      if (isLandscape()) enter();
      else exit();
    };

    /* ── DEBOUNCE, AND WHY IT IS NOT OPTIONAL ────────────────────────────────
       `sync` is now throttled to one run per ~250ms.

       A phone rotation fires a BURST of events: `orientationchange`, several
       `resize` firings as the browser animates the viewport between the two
       sizes, and `screen.orientation`'s `change`. Unthrottled, `sync` ran 3-5
       times per rotation, and `enter()` calls `requestFullscreen()` EVERY time.
       That is not merely wasteful: calling it repeatedly while a fullscreen
       transition is still in flight makes the browser reject the later calls
       (their promises reject, which the `.catch` swallows), so the member
       rotated the phone, saw the feed sit there unfullscreened, and rotated
       again. That "I rotated and nothing happened" is this listener firing too
       often to win.

       Trailing-edge, not leading-edge: the LAST event in the burst carries the
       settled dimensions, and fullscreen should be requested against those, not
       against the half-rotated viewport. A leading-edge run would fire
       `enter()` mid-animation at the old orientation and then have to correct.

       `fullscreenchange` is ALSO listened for, for the reverse direction. The
       member can leave fullscreen with the platform back-swipe or the F11/
       Escape key without the device rotating at all, and without this the
       effect's idea of the state would drift from reality. */
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(sync, 250);
    };

    screen.orientation?.addEventListener?.("change", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener("resize", schedule);
    document.addEventListener("fullscreenchange", schedule);

    /* On ARRIVAL in landscape, enter immediately rather than waiting for the
       burst to settle. Waiting 250ms before the first fullscreen request is
       visible as a delay between rotating and the video filling the screen.
       `enter` is idempotent enough for this single call because nothing else can
       have entered fullscreen within one tick of mount. */
    if (isLandscape()) enter();

    return () => {
      if (timer) clearTimeout(timer);
      screen.orientation?.removeEventListener?.("change", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("fullscreenchange", schedule);
    };
  }, [active, retryKey]);

  useEffect(() => {
    onRequestUnmute.current = onRequestUnmuteProp ?? null;
  }, [onRequestUnmuteProp]);

  // A new moment means a new frame to wait for; drop back to the hidden state
  // before the next decode lands. The same reset clears a previous failure,
  // since both are per-source.
  useEffect(() => {
    setReady(false);
    setFailed(false);
  }, [moment.id, moment.mediaUrl, retryKey]);

  /**
   * Playback is driven by `active`, not by the `autoPlay` attribute.
   *
   * There is deliberately no `autoPlay` attribute on the element. Every card in
   * the feed is mounted at once, so `autoPlay` would start EVERY video at once -
   * a dozen decoders competing on mobile data, with audio leaking from cards
   * nobody is looking at. Only the snapped-to card plays.
   *
   * MUTE ORDER - why playback is (re)started muted:
   * browsers only permit AUDIBLE autoplay after a user gesture, and scrolling a
   * card into view is not one. Calling play() on an unmuted video was therefore
   * rejected outright on iOS Safari and some Android browsers - the video stayed
   * frozen on its first frame with no error reported, which is precisely the
   * "missing audio" symptom. The separate mute effect below applies the member's
   * real choice, and an unmute TAP is a genuine gesture, so sound can be granted
   * there without tripping the policy.
   */
  /**
   * TAP TO PLAY / TAP TO PAUSE — the standard short-video gesture.
   *
   * `userPaused` records that the member explicitly paused THIS card. It exists
   * because the source-lifecycle effect above is the single source of truth for
   * playback and re-runs whenever `active` flips: without this flag, scrolling
   * away to the next card and back would silently restart a video the member had
   * deliberately stopped, which is the most annoying possible behaviour in a
   * feed like this.
   *
   * The flag is reset when the moment changes (below) so it can never leak from
   * one card to the next.
   */
  const [userPaused, setUserPaused] = useState(false);
  /** Which glyph the centre indicator should show, and for how long. */
  const [indicator, setIndicator] = useState<"play" | "pause" | null>(null);

  /**
   * Flip playback on a tap, and flash the matching glyph.
   *
   * The indicator is a short, purely visual acknowledgement — it is cleared on a
   * timer and is never a control, so it is `pointer-events-none` and
   * `aria-hidden`. Playback state itself is announced by the button's accessible
   * label, not by this glyph.
   */
  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    const nextPaused = !video.paused;
    if (nextPaused) {
      video.pause();
    } else {
      // Resuming from a tap is a genuine user gesture, so this is also the one
      // path on which sound can be granted if the member had muted.
      void video.play().catch(() => undefined);
    }
    setUserPaused(nextPaused);
    setIndicator(nextPaused ? "pause" : "play");
    window.setTimeout(() => setIndicator(null), 700);
  }

  useEffect(() => {
    // A new moment means a new video: the previous card's pause decision must
    // not carry over.
    setUserPaused(false);
    setIndicator(null);
  }, [moment.id, retryKey]);

  /**
   * Source lifecycle: arm, play, pause and UNLOAD. Deliberately does NOT depend
   * on `muted`.
   *
   * Keeping mute out of this effect matters: it forces playback to start muted
   * (see the note above), so re-running it on an unmute tap would briefly mute
   * a video the member just unmuted - a visible audio flicker. Mute is applied by
   * its own effect below.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active) {
      // Off-screen: stop decoding, and stop the audio channel dead.
      video.pause();
      // Deliberately NOT `removeAttribute("src") + load()`. That tears down the
      // whole media pipeline - it destroys the audio channel and throws away
      // the buffer - so every scroll back onto a card had to re-establish the
      // connection and rebuffer from byte zero. That was the source of the
      // reported "sound drops" and "random pausing": the media element was
      // being reset on every single swipe, not just the ones that needed it.
      //
      // `preload="none"` (applied on the element below) achieves the memory
      // goal that unload was for - the browser keeps no buffer for a paused,
      // never-fetched card - WITHOUT destroying the element, so scrolling back
      // is instant and the audio channel is still intact.
      setBuffering(false);
      return;
    }

    // Re-arm only if the element genuinely has no source. Deliberately no
    // `load()` here: load() resets currentTime and the media pipeline, which
    // is exactly the rebuffer we are avoiding.
    if (!video.getAttribute("src")) {
      video.src = moment.mediaUrl;
    }

    video.muted = mutedRef.current;
    // Respect an explicit pause. Without this the effect would restart a video
    // the member stopped by tapping, the moment they scrolled back onto it.
    if (userPaused) {
      video.pause();
      return;
    }
    const started = video.play();
    if (started) {
      void started
        .then(() => {
          setBlocked(false);
          setBuffering(false);
        })
        .catch((err: unknown) => {
          // NotAllowedError means the browser refused to autoplay. The video
          // keeps its first frame and the member is offered an explicit unmute
          // affordance, which IS a user gesture and therefore always permitted.
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setBlocked(true);
          }
          // Anything else (Low Power Mode, data saver) is not an error state:
          // the card still shows its first frame and the member can retry.
        });
    }
  }, [active, moment.id, moment.mediaUrl, retryKey, userPaused]);

  /**
   * Mute state, applied on its own.
   *
   * Browsers only permit AUDIBLE autoplay after a user gesture. An unmute tap IS
   * a gesture, so this is the one place audibility is granted; playback itself is
   * started muted by the effect above, which is why scrolling back to an unmuted
   * card no longer gets rejected by the autoplay policy.
   */
  useEffect(() => {
    mutedRef.current = muted;
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted, active, moment.id]);

  /**
   * Recover a card that autoplay refused, or that stalled.
   *
   * Exposed as a callback so the parent can offer a real button instead of
   * leaving the member staring at a frozen frame. Calling play() from a click
   * handler is a user gesture, which is precisely what the autoplay policy
   * requires, so this always succeeds where the automatic attempt could not.
   */
  const resumePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.getAttribute("src")) {
      video.src = moment.mediaUrl;
    }
    // Unmute as part of the recovery: the member tapped a control that says
    // "tap for sound", so granting sound is what they asked for, and the tap
    // is the gesture the policy needs.
    video.muted = false;
    // Ref, not the prop itself: the prop is captured in the ref so this callback
    // never goes stale. Calling the ref object directly is the bug this line
    // previously had.
    onRequestUnmute.current?.();
    setBlocked(false);
    const resumed = video.play();
    if (resumed) {
      void resumed
        .then(() => setBuffering(false))
        .catch(() => setBlocked(true));
    }
  }, [moment.mediaUrl, onRequestUnmute]);

  /**
   * The class the media surface carries.
   *
   * `h-full`/`w-full` resolve against the card, which is sized from the viewport,
   * so the box itself already re-lays out on rotation. What needed help was the
   * FILL: `object-cover` on a portrait-shot video in a short landscape viewport
   * crops the top and bottom off entirely, so rotating to landscape produced the
   * same heavily-cropped frame, just sideways.
   *
   * Hence `[@media(orientation:landscape)]:object-contain` — a pure CSS
   * media query, applied by the engine rather than by React state. That matters
   * for a rotation: a state-driven version has to wait for a JS round-trip
   * between the physical rotation and the re-render, and on a slow device that
   * gap is exactly when the member sees the wrong crop. The media query changes
   * on the same frame as the viewport.
   *
   * This covers the INLINE case. When the element manages to claim real
   * fullscreen (see the rotation effect above) the browser letterboxes it and
   * this class is moot — the two mechanisms are complementary, not competing.
   */
  const surfaceClass = [
    // `landscape-bleed` lets the landscape block in globals.css force this element
    // to the full viewport. Combined with `object-contain` below, the VIDEO fills
    // the rotated screen and is letterboxed inside it rather than cropped — which
    // is the whole point of rotating a video.
    //
    // ── `object-cover` USED TO ALSO BE ON THIS ELEMENT ──────────────────────────
    // Both `object-cover` and `object-contain` were listed here. They are mutually
    // exclusive, and which one actually applied was decided by the order Tailwind
    // happens to emit the two rules in the stylesheet — NOT by the order they
    // appear in this array. Two identical-specificity utilities on one element
    // means the winner is an accident of the build.
    //
    // When the loser was `object-cover`, a portrait video of a person standing was
    // scaled to fill the width and had its top and bottom cropped away — which on a
    // full-body shot cuts off exactly the legs. That is the reported "over-zoomed,
    // legs cut off" symptom, and it was intermittent across builds, which is the
    // signature of a CSS-order race rather than a fixed layout choice.
    //
    // Only `object-contain` remains. The CARD supplies the framing; the MEDIA
    // supplies the fit. A portrait clip is letterboxed, a landscape one is
    // pillarboxed, and neither is ever cropped.
    "landscape-bleed h-full w-full object-contain transition-opacity duration-300",
    // The explicit landscape variant is redundant now that `object-contain` is
    // unconditional, and it was one more place for the two utilities to disagree.
    // Removed rather than kept "just in case".
    ready ? "opacity-100" : "opacity-0",
  ].join(" ");

  /**
   * A failure renders INSTEAD of the media, not underneath it.
   *
   * Swapping rather than overlaying matters: the video element would otherwise
   * keep its box and a failed card would still be a black rectangle behind the
   * message. `key` on the retry counter remounts the element, which is what
   * makes a retry actually re-request rather than no-op on a poisoned element.
   */
  if (failed) {
    return (
      <MediaFallback onRetry={() => setRetryKey((k) => k + 1)} />
    );
  }

  if (moment.mediaType === "link") {
    return <MediaEmbed moment={moment} active={active} />;
  }

  if (moment.mediaType === "video") {
    // Off-screen cards ask the browser for NOTHING. `none` (rather than
    // "metadata") is what keeps a long feed from holding a buffer per card -
    // the memory pressure the old unload-on-scroll was trying to solve - but it
    // does so WITHOUT destroying the element or its audio channel, so scrolling
    // back is instant and free of sound drops.
    const preload = active ? "auto" : "none";

    return (
      <>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          key={retryKey}
          ref={videoRef}
          src={moment.mediaUrl}
          // Re-asserted on every render as well as imperatively in the effect:
          // React writes the ATTRIBUTE, and some mobile engines have decided
          // audibility from the attribute present at load time rather than from
          // the live property. Setting both removes the ambiguity.
          muted={muted}
          loop
          // Required for iOS Safari, which otherwise takes the video fullscreen
          // on play. A no-op everywhere else.
          playsInline
          // The legacy iOS spelling of `playsInline`. React only writes the modern
          // attribute, and older iOS Safari looks for this one — without it the
          // video still hijacks the screen on rotation.
          webkit-playsinline="true"
          // Android Chrome: without this the element may be promoted out of the
          // page and the feed's own fullscreen handling is bypassed, so rotating
          // back would strand the member in a player with no way to the feed.
          x5-playsinline="true"
          x-webkit-airplay="deny"
          // Stops iOS painting its native control bar over the feed chrome.
          controls={false}
          // Suppresses the iOS Picture-in-Picture affordance on long-press.
          disablePictureInPicture
          // No `autoPlay` attribute: it would play every mounted card at once.
          // The effect above is the single source of truth for playback.
          preload={preload}
          onLoadedData={() => setReady(true)}
          // Buffering is a normal, recoverable state. Surfacing it means a
          // mid-play rebuffer reads as "loading" rather than a random pause.
          // Nothing here RESTARTS playback - the element resumes by itself once
          // data arrives, and forcing a restart is what used to reset the
          // playback position and re-trigger the audio glitch.
          onWaiting={() => setBuffering(true)}
          onStalled={() => setBuffering(true)}
          onPlaying={() => {
            setBuffering(false);
            setBlocked(false);
          }}
          onCanPlay={() => setBuffering(false)}
          // A decode, format or network failure must not leave a silent black
          // card. This is the handler that turns a blank screen into a message.
          onError={() => {
            setReady(false);
            setFailed(true);
          }}
          className={surfaceClass}
        />
        {/* Tap to play / pause.
            This is a real <button> covering the media rather than an onClick on
            the <video> itself. Two reasons:
              • A <video> has no accessible name or role, so a click handler on it
                is invisible to a screen reader; a button can carry one.
              • It is the only element that reliably receives the tap, because
                the cinema-view overlay sits above the video in the stacking
                order. See the note on the card wrapper in MediaFeed's JSX. */}
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={userPaused ? "Play video" : "Pause video"}
          aria-pressed={userPaused}
          className="absolute inset-0 z-10 cursor-pointer"
        />
        {/* Centre indicator. Purely a visual acknowledgement of the tap, so it
            is aria-hidden and pointer-events-none — it must never intercept the
            next tap, which has to reach the button above. */}
        {indicator ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
              {indicator === "play" ? (
                <svg viewBox="0 0 24 24" className="ml-1 h-10 w-10 fill-white" aria-hidden>
                  <path d="M8 5.14v13.72L19 12 8 5.14Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-10 w-10 fill-white" aria-hidden>
                  <path d="M7 5h3.5v14H7V5Zm6.5 0H17v14h-3.5V5Z" />
                </svg>
              )}
            </span>
          </div>
        ) : null}
        {/* Buffering spinner. pointer-events-none so it never eats the tap
            zones; aria-hidden because the media element already conveys state. */}
        {active && buffering ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <Loader2 className="h-10 w-10 animate-spin text-white/80" />
          </div>
        ) : null}
        {/* The one recovery that works when autoplay is refused: a tap.
            z-30 so it sits ABOVE the tap-to-play button below: when autoplay has
            been refused the member's tap must unmute, not be swallowed by the
            play/pause toggle, which would look like a dead screen. */}
        {active && blocked ? (
          <button
            type="button"
            onClick={resumePlayback}
            aria-label="Tap to play with sound"
            className="absolute inset-0 z-30 flex items-center justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur">
              <VolumeX className="h-4 w-4" aria-hidden />
              Tap for sound
            </span>
          </button>
        ) : null}
      </>
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
      // Same reasoning as the video: a broken image previously rendered as an
      // empty box with no affordance and no explanation.
      onError={() => setFailed(true)}
      className={surfaceClass}
    />
  );
}

/**
 * Shown in place of a moment whose media could not be decoded.
 *
 * Deliberately dependency-free and inline: this renders at the exact moment the
 * rest of the card has failed, so it must not depend on anything that could
 * itself be the thing that broke.
 */
function MediaFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-900 px-6 text-center"
      role="status"
    >
      <p className="text-sm font-semibold text-white">This moment won&apos;t load</p>
      <p className="max-w-xs text-xs leading-5 text-ink-300">
        The file may still be processing, or it is no longer available.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * One control plus its counter, grouped so the two stay together.
 *
 * The counter renders only when it is non-zero, so a control with nothing to
 * report stays a clean circle instead of showing a lonely "0" — and the rail
 * does not reflow as counts change.
 */
function RailItem({ count, children }: { count?: number; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      {count && count > 0 ? (
        <span className="text-[11px] font-semibold tabular-nums text-white/90">
          {count > 999 ? "999+" : count}
        </span>
      ) : null}
    </div>
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
        // 11 rather than 12: the rail now carries four controls, and the
        // smaller circle plus the transparent fill keeps the stack from
        // reading as a solid bar laid over the video.
        "flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-40",
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

/**
 * A moment whose media is a video hosted elsewhere (YouTube / TikTok /
 * Instagram), rendered as an iframe.
 *
 * WHY CLICK-TO-LOAD, NOT AN AUTO-LOADING IFRAME:
 *
 * 1. Bandwidth. A feed of ten cards would open ten third-party connections and
 *    pull megabytes nobody asked for. Only the card in view is ever loaded.
 * 2. Cookies. An auto-loading embed hands a third party a request on page load
 *    - and a way to set cookies - before the member has done anything. The
 *    member's tap is the consent that makes it happen.
 * 3. Autoplay. Embedded players autoplay with sound, which is exactly the
 *    thing the direct-file path is careful to avoid.
 *
 * The poster is the provider's own thumbnail where one exists, so the card is
 * recognisable before it is loaded.
 */
function MediaEmbed({ moment, active }: { moment: MomentView; active: boolean }) {
  // Mounting the iframe is irreversible for this card, so this deliberately
  // latches: once loaded, scrolling away and back must NOT tear the player down
  // and restart the video from zero.
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const embed = parseVideoEmbedUrl(moment.mediaUrl);
  // A row that exists but does not parse should degrade to the fallback rather
  // than render a bare iframe pointing nowhere. Cannot normally happen - the
  // server validates before storing - but a link that has since been withdrawn
  // by the provider can still fail to render.
  if (!embed.ok) {
    return <MediaFallback onRetry={() => setFailed(false)} />;
  }

  return (
    <div className="relative h-full w-full bg-black">
      {loaded ? (
        <iframe
          src={embed.embedUrl}
          title={`Video shared by ${moment.authorName ?? "a member"}`}
          // Scoped deliberately: no allow-same-origin, no allow-top-navigation.
          // The provider's player does not need either, and granting them would
          // hand a third party access to this origin.
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0"
          onError={() => setFailed(true)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="group relative flex h-full w-full items-center justify-center bg-[#0F172A]"
        >
          {embed.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={embed.thumbnailUrl}
              alt=""
              // Only fetched once the card is in view, for the same bandwidth
              // reason as the iframe itself.
              loading={active ? "eager" : "lazy"}
              className="h-full w-full object-cover opacity-80"
            />
          ) : null}
          <span className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/25 transition group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden>
              <path d="M8 5.14v13.72L19 12 8 5.14Z" />
            </svg>
          </span>
          <span className="absolute bottom-6 left-0 right-0 px-6 text-center text-xs text-white/80">
            {embed.provider === "youtube" ? "YouTube" : embed.provider === "tiktok" ? "TikTok" : "Instagram"}
            {" · tap to play"}
          </span>
        </button>
      )}
      {failed ? <MediaFallback onRetry={() => { setFailed(false); setLoaded(false); }} /> : null}
    </div>
  );
}

