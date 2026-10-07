"use client";

import { useRef, useState, type FormEvent } from "react";
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

/** The subset of a moment this self-contained player needs to render. */
interface MomentData {
  id: string;
  authorName: string;
  timeAgo: string;
  mediaUrl: string;
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

  return (
    <div className="relative flex h-full w-full min-h-[600px] flex-1 flex-col overflow-hidden bg-slate-950 text-white">
      {/* Main media asset (absolute background fill) */}
      <div className="absolute inset-0 z-0 bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={moment.mediaUrl}
          alt="Moment media"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-slate-950/80" />
      </div>

      {/* Top location header */}
      <div className="relative z-30 flex items-center justify-between px-4 pt-4">
        <div className="w-10" />
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md">
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-amber-400"
            aria-hidden="true"
          />
          <span>{moment.location}</span>
        </div>
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

      {/* Right-side action rail */}
      <div className="absolute bottom-24 right-4 z-30 flex flex-col items-center gap-3.5">
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

      {/* Bottom author & connect card overlay */}
      <div className="relative z-20 mb-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3 rounded-full border border-white/20 bg-black/50 p-2 pr-4 shadow-2xl backdrop-blur-md">
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
      </div>


      {/* Bottom comment input bar */}
      <div className="absolute bottom-2 left-3 right-3 z-30">
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

