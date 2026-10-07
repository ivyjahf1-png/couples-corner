"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  Share2,
  Volume2,
} from "lucide-react";

/** Media kinds this player knows how to render. Mirrors `MomentMediaType`
    from `lib/moments.ts` (the server view model) as a local union so the
    demo card can carry the field without importing server-shaped types. */
export type MomentMediaKind = "image" | "video" | "link";

/** The subset of a moment this self-contained player needs to render. */
export interface MomentData {
  id: string;
  authorName: string;
  timeAgo: string;
  mediaUrl: string;
  /**
   * What `mediaUrl` points at. Optional for hand-written callers (a file
   * extension fallback covers them), but ALWAYS supplied by `/moments`: a
   * video uploaded through the Task Center must reach this card as "video"
   * or it would render as a broken <img> — the "my upload is missing" bug.
   */
  mediaType?: MomentMediaKind;
  /** Portrait for the author pill; falls back to initials when absent. */
  avatarUrl?: string;
  location?: string;
  likesCount?: number;
  isVerified?: boolean;
}

interface MomentViewerCardProps {
  /** Overrides the built-in demo moment when provided. */
  moment?: MomentData;
  onOpenProfile?: () => void;
}

/** Demo moment so the screen always has something to play. */
const DEMO_MOMENT: MomentData = {
  id: "1",
  authorName: "Gbaski",
  timeAgo: "5d",
  mediaUrl:
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800",
  mediaType: "image",
  avatarUrl:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
  location: "Discover Nearby, Austin, TX",
  likesCount: 1,
  isVerified: true,
};

/**
 * MomentViewerCard — the single-moment player rendered by `/moments`.
 *
 * Deliberately self-contained: likes, the Connect toggle and the comment draft
 * all live in local state, so the view always renders even when there is no
 * backend moment to fetch. Pass the `moment` prop to override the demo card.
 */
export function MomentViewerCard({
  moment = DEMO_MOMENT,
  onOpenProfile,
}: MomentViewerCardProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(moment.likesCount ?? 1);
  const [comment, setComment] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);

  const commentInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  /* Whether the media surface is mostly on screen. Starts TRUE: the card IS
     the screen on mount, and an observer that never fires (older engines,
     server render) must not leave playback stuck off. */
  const [inView, setInView] = useState(true);

  /* SCROLL → VISIBILITY, feeding the play/pause driver below. The observer
     watches the media surface, so whenever this card sits inside anything
     that scrolls — the shell's page scroll, a future multi-moment reel —
     only the ACTIVE moment is allowed to play, and it pauses the moment it
     slips mostly out of view. Created once on mount: the observed target
     never changes for the life of the card. */
  useEffect(() => {
    const el = mediaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) =>
        setInView(entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)),
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* THE PLAY/PAUSE DRIVER — the "active video ref" of the requirements. Runs
     on mount, whenever the moment CHANGES (a new id/src remounts the
     <video> through its `key`, so this effect is what starts the new clip),
     and whenever `inView` flips. `.muted` is re-asserted as a PROPERTY
     because some mobile engines decide audibility from the property set at
     load time and ignore React's attribute alone — and muted autoplay is the
     only autoplay browsers permit without a gesture, which is also why the
     element carries `autoPlay muted` explicitly. play() is fire-and-forget:
     a rejection IS the autoplay policy saying no, and the visible state
     already reflects that. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (inView) void video.play().catch(() => undefined);
    else video.pause();
  }, [inView, moment.id, moment.mediaUrl]);

  /** Local like toggle: flip the heart and move the count with it. */
  function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((count) => Math.max(0, count + (next ? 1 : -1)));
  }

  /** Local-only send: clear the draft once there is something to send. */
  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) return;
    setComment("");
    commentInputRef.current?.focus();
  }

  /** Two-letter initials used when the moment carries no avatar image. */
  const initials =
    moment.authorName
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  /* What the media URL points at, for rendering. `mediaType` wins whenever
     the page supplies it (always, from `/moments`); the extension check is
     the fallback for callers that do not, so even a hand-built moment with a
     stray .mp4 gets a <video> instead of a broken <img>. */
  const kind: MomentMediaKind =
    moment.mediaType ??
    (/\.(mp4|m4v|mov|webm|ogv)(\?|#|$)/i.test(moment.mediaUrl) ? "video" : "image");

  return (
    /* LOCKED COLUMN: `h-full min-h-0 overflow-hidden` — the card equals the
       region AppMain hands it and never scrolls itself. The old
       `min-h-[600px]` is GONE: it forced the card TALLER than that region on
       any phone shorter than ~700px, so the card's bottom edge — and with it
       the comment bar pinned near it — sat below the fold, hidden behind the
       fixed tab bar. Height now flows from the viewport, not from a guess. */
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-950 text-white">
      {/* Main media asset (absolute background fill). `ref` is the
          IntersectionObserver target for the play/pause gate above. */}
      <div ref={mediaRef} className="absolute inset-0 z-0 bg-slate-900">
        {kind === "video" ? (
          <video
            key={moment.id}
            ref={videoRef}
            src={moment.mediaUrl}
            /* EXPLICIT, per the player contract: `autoPlay` starts the clip
               on mount, `muted` is what makes autoplay legal without a
               gesture (also re-asserted as a property in the effect below),
               `loop` matches the reel format, `playsInline` stops iOS Safari
               hijacking the page into fullscreen. The `key` remounts per
               moment so a CHANGING moment restarts cleanly instead of
               reusing a poisoned element. */
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
        ) : kind === "link" ? (
          /* Link moments are validated, allowlisted embed URLs produced
             server-side (lib/utils/video-embed) — never raw member input. */
          <iframe
            key={moment.id}
            src={moment.mediaUrl}
            title="Moment video"
            className="h-full w-full border-0 object-cover"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={moment.mediaUrl}
              alt="Moment media"
              className="h-full w-full object-cover"
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-slate-950/80" />
      </div>

      {/* Top location header */}
      <div className="relative z-30 flex items-center justify-between px-4 pt-4">
        <div className="w-10" />
        {/* Real uploads carry no location, so the pill is omitted rather
            than rendered as an empty chip with a pulsing dot. */}
        {moment.location ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-amber-400"
              aria-hidden="true"
            />
            <span>{moment.location}</span>
          </div>
        ) : null}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white shadow-lg backdrop-blur-md"
          aria-label="More options"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Spacer to push content down */}
      <div className="flex-1" />

      {/* Right-side action rail.
          `bottom-[calc(9rem_+_env(safe-area-inset-bottom,0px))]` lifts the rail
          clear of the bottom stack: 5rem of tab-bar reserve + the ~40px
          comment bar + a gap, scaling with the home-indicator inset. The old
          `bottom-24` assumed the bar sat at the viewport edge, which is no
          longer where the stack lands. */}
      <div className="absolute bottom-[calc(9rem_+_env(safe-area-inset-bottom,0px))] right-4 z-30 flex flex-col items-center gap-3.5">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur-md transition hover:bg-white/30 active:scale-95"
          aria-label="Add"
        >
          <Plus className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? "Remove your like" : "Like this moment"}
            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-xl backdrop-blur-md transition active:scale-95 ${
              liked
                ? "border-rose-500 bg-rose-500/30 text-rose-400"
                : "border-white/20 bg-black/40 text-white hover:bg-white/30"
            }`}
          >
            <Heart
              className={`h-5 w-5 ${liked ? "fill-rose-500 text-rose-500" : ""}`}
            />
          </button>
          <span className="text-[11px] font-bold tabular-nums text-white drop-shadow">
            {likes}
          </span>
        </div>

        <button
          type="button"
          onClick={() => commentInputRef.current?.focus()}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur-md transition hover:bg-white/30 active:scale-95"
          aria-label="Jump to the comment box"
        >
          <MessageCircle className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur-md transition hover:bg-white/30 active:scale-95"
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur-md transition hover:bg-white/30 active:scale-95"
          aria-label="Audio settings"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>

      {/* BOTTOM STACK — author row + comment bar, IN FLOW as the last
          children of the locked column. The bar used to be `absolute
          bottom-2`, pinning it to the CARD's bottom edge — and because the
          card's old `min-h-[600px]` pushed that edge below the fold on
          shorter phones, "Message …" rode under the fixed tab bar or off
          screen entirely. In flow the stack ends exactly at the column's
          content edge, and AppMain's `pb-20` (the scroll container's
          compensating padding for the fixed bottom navigation) reserves the
          bar's height BELOW that edge — so the bar lands ~11px ON TOP of the
          tab bar on every screen height (5rem reserve vs the measured 69px
          bar), with no page scroll available to uncover it. */}
      <div className="relative z-20 flex flex-col gap-3 px-4">
        {/* `self-start`: as a flex-column child the pill would otherwise
            stretch to full width and its rounded-full shape would read as a
            full-bleed strip rather than the compact chip it is. */}
        <div className="flex items-center gap-3 self-start rounded-full border border-white/20 bg-black/50 p-2 pr-4 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-3 text-left"
          >
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/30 bg-slate-800">
              {moment.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={moment.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white/80">
                  {initials}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">
                  {moment.authorName}
                </span>
                {moment.isVerified ? (
                  <CheckCircle2
                    className="h-3.5 w-3.5 fill-emerald-500 text-slate-950"
                    aria-label="Verified"
                  />
                ) : null}
              </div>
              <span className="text-[11px] text-white/70">{moment.timeAgo}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsFollowing((prev) => !prev)}
            aria-pressed={isFollowing}
            className={`ml-2 rounded-full border px-3.5 py-1 text-xs font-semibold transition active:scale-95 ${
              isFollowing
                ? "border-white/30 bg-slate-800 text-white"
                : "border-white/30 bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isFollowing ? "Connected" : "Connect"}
          </button>
        </div>

        {/* Comment bar: LAST child of the stack, so its bottom edge IS the
            stack's bottom edge — the reserved strip that sits on the nav. */}
        <form
          onSubmit={handleSend}
          className="flex items-center rounded-full border border-white/25 bg-black/70 px-4 py-2 shadow-2xl backdrop-blur-xl"
          noValidate
        >
          <label htmlFor="moment-comment" className="sr-only">
            Add a comment
          </label>
          <input
            id="moment-comment"
            ref={commentInputRef}
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Message ${moment.authorName}...`}
            maxLength={500}
            className="w-full bg-transparent text-sm text-white placeholder-white/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!comment.trim()}
            className="p-1 text-amber-400 transition hover:text-amber-300 disabled:opacity-40"
            aria-label="Send comment"
          >
            <Send className="h-5 w-5 rotate-45" />
          </button>
        </form>
      </div>
    </div>
  );
}

