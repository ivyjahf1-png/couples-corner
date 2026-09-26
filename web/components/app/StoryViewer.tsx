"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heart, MessageCircle, Send, X } from "lucide-react";
import { Avatar } from "@/components/app/Avatar";
import {
  addStoryCommentAction,
  getStoryCommentsAction,
  toggleStoryReactionAction,
  type StoryView,
} from "@/lib/actions/profile";

const IMAGE_MS = 5000;

type Comment = { id: string; body: string; authorName: string; createdAt: string };

/**
 * Full-screen story viewer.
 *
 * PLAYBACK: images advance on a 5s timer (paused on hold); videos play to their
 * own natural end via `onEnded`, which is what makes playback "smooth" — the
 * clip is not force-cut at an arbitrary duration. Videos are muted+autoplaying
 * so they start on iOS (which blocks unmuted autoplay) and the viewer offers no
 * volume control, matching the tray's silent-preview language.
 *
 * The auto-advance timer is cleared on unmount and whenever the index changes,
 * so a story closed mid-countdown never fires a stray setState.
 */
export function StoryViewer({
  stories,
  startIndex,
  onClose,
  onReact,
}: {
  stories: StoryView[];
  startIndex: number;
  onClose: () => void;
  /** Bubble the new like up to the tray so the heart state stays in sync. */
  onReact: (storyId: string, reacted: boolean, count: number) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(stories[startIndex]?.reactedByViewer ?? false);
  const [likeCount, setLikeCount] = useState(stories[startIndex]?.reactionCount ?? 0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tick, setTick] = useState(0);

  const story = stories[index];

  useEffect(() => setMounted(true), []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= stories.length) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [stories.length, onClose]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Reset per-story state when the slide changes.
  useEffect(() => {
    setProgress(0);
    setLiked(stories[index]?.reactedByViewer ?? false);
    setLikeCount(stories[index]?.reactionCount ?? 0);
    setDraft("");
    setTick((t) => t + 1);
  }, [index, stories]);

  // Image auto-advance. The tick dependency restarts the interval whenever the
  // slide changes; `paused` (hold to pause) clears it entirely.
  useEffect(() => {
    if (!story || story.mediaType !== "image" || paused) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - started;
      setProgress(Math.min(100, (elapsed / IMAGE_MS) * 100));
      if (elapsed >= IMAGE_MS) next();
    }, 50);
    return () => clearInterval(timer);
  }, [story, paused, next, tick]);

  // Load comments for the visible slide.
  useEffect(() => {
    if (!story) return;
    let cancelled = false;
    void getStoryCommentsAction(story.id).then((result) => {
      if (!cancelled && result.ok) setComments(result.comments);
    });
    return () => { cancelled = true; };
  }, [story]);

  // Pause the clip while the viewer is held, and resume on release.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => undefined);
  }, [paused, story, tick]);

  // Keyboard: arrows navigate, Escape closes, Space holds.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") prev();
      else if (event.key === " ") { event.preventDefault(); setPaused(true); }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.key === " ") setPaused(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [next, prev, onClose]);

  async function toggleLike() {
    if (!story) return;
    const result = await toggleStoryReactionAction(story.id);
    if (result.ok) {
      setLiked(result.reacted);
      setLikeCount(result.count);
      onReact(story.id, result.reacted, result.count);
    }
  }

  async function sendComment(event: React.FormEvent) {
    event.preventDefault();
    if (!story || !draft.trim() || sending) return;
    setSending(true);
    const result = await addStoryCommentAction(story.id, draft);
    setSending(false);
    if (result.ok) {
      setDraft("");
      const fresh = await getStoryCommentsAction(story.id);
      if (fresh.ok) setComments(fresh.comments);
    }
  }

  if (!mounted || !story) return null;

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Story by ${story.authorName ?? "member"}`}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black"
    >
      {/* Tap zones: left third = previous, right two-thirds = next. */}
      <button type="button" aria-label="Previous story" onClick={prev} className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-pointer" />
      <button type="button" aria-label="Next story" onClick={next} className="absolute inset-y-0 right-0 z-0 w-2/3 cursor-pointer" />

      <div className="relative z-20 flex h-full w-full max-w-md flex-col">
        {/* Top: segmented progress bars, then avatar + username (top-left). */}
        <div className="absolute inset-x-0 top-0 z-30 flex flex-col gap-2 bg-gradient-to-b from-black/70 to-transparent p-3">
          <div className="flex gap-1">
            {stories.map((s, i) => (
              <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  className="block h-full bg-white transition-[width] duration-75"
                  style={{
                    width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
                  }}
                />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            {story.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={story.authorAvatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/80" />
            ) : (
              <Avatar name={story.authorName ?? "?"} size="sm" className="ring-2 ring-white/80" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
              {story.authorName ?? "Member"}
              <span className="ml-2 text-[11px] font-normal text-white/60">{timeAgo(story.createdAt)}</span>
            </span>
            <button type="button" onClick={onClose} aria-label="Close story" className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Media fills the frame; hold (pointer down) pauses. */}
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          {story.mediaType === "video" ? (
            <video
              key={story.id}
              ref={videoRef}
              src={story.url}
              autoPlay
              muted
              playsInline
              onEnded={next}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration) setProgress((el.currentTime / el.duration) * 100);
              }}
              className="h-full w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.url} alt="" className="h-full w-full object-contain" />
          )}
          {paused ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white">Paused</span>
            </span>
          ) : null}
        </div>

        {/* Bottom: like, comment count, comment list, composer. */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
          {comments.length ? (
            <ul className="max-h-24 space-y-1 overflow-y-auto pr-1">
              {comments.map((c) => (
                <li key={c.id} className="text-xs text-white/90">
                  <span className="font-semibold">{c.authorName}</span> {c.body}
                </li>
              ))}
            </ul>
          ) : null}
          <form onSubmit={sendComment} className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder={`Reply to ${story.authorName ?? "this story"}...`}
              aria-label="Write a comment"
              className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
            />
            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send comment" className="rounded-full p-2 text-white transition hover:bg-white/10 disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void toggleLike()}
              aria-pressed={liked}
              aria-label={liked ? "Remove like" : "Like this story"}
              className="flex items-center gap-1.5 text-white transition hover:scale-105"
            >
              <Heart className={`h-6 w-6 ${liked ? "fill-red-500 text-red-500" : ""}`} />
              <span className="text-xs font-semibold">{likeCount}</span>
            </button>
            <span className="flex items-center gap-1.5 text-white/80">
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs font-semibold">{comments.length}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Portal to <body> so the fixed overlay is not trapped by any ancestor
  // transform/filter on the messages shell.
  return createPortal(overlay, document.body);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "now";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m`;
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
