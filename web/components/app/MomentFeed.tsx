"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  MoreVertical,
  Send,
  Trash2,
  Copy,
  Plus,
  MapPin,
} from "lucide-react";

interface MomentItem {
  id: string;
  videoUrl: string;
  username: string;
  userAvatar: string;
  caption: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
  isOwner?: boolean;
}

interface MomentFeedProps {
  moments: MomentItem[];
  onDelete?: (id: string) => void;
}

export default function MomentFeed({ moments, onDelete }: MomentFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * MUST default to true.
   * Every modern browser blocks unmuted autoplay. The previous default of
   * false meant the <video> was rendered with muted={false} + autoPlay,
   * so the browser refused to start playback at all — and the speaker toggle
   * appeared "broken" because the video was never playing to begin with,
   * especially for cross-origin ("external link") videos.
   */
  const [isMuted, setIsMuted] = useState(true);

  const [showOptions, setShowOptions] = useState(false);
  const [autoScroll] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentMoment = moments[currentIndex];

  /**
   * React does NOT reliably reflect the muted prop on <video> after the
   * initial mount (it's a property, not an attribute, and React's DOM
   * diffing skips it in some cases). We imperatively write it on every
   * mute change AND every video switch. This is what makes the speaker icon
   * actually work for external links, not just same-origin sources.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = isMuted;
  }, [isMuted, currentIndex]);

  /**
   * Kick playback on every new video + recover from an autoplay rejection.
   * Cross-origin videos frequently get rejected if the browser decides the
   * page hasn't had a user gesture yet; the fallback forces muted and retries
   * so the feed keeps playing instead of freezing on a black frame.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        v.muted = true;
        setIsMuted(true);
        v.play().catch(() => {});
      });
    }
  }, [currentIndex]);

  const handleVideoEnd = () => {
    if (autoScroll && currentIndex < moments.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Moment link copied to clipboard!");
    setShowOptions(false);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this moment?")) {
      onDelete?.(currentMoment.id);
      setShowOptions(false);
    }
  };

  return (
    /* 100dvh (not 100vh) so the player fills the visible viewport on
       phones whose URL bar shows/hides. overflow-hidden guarantees nothing
       escapes the full-screen shell. */
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden select-none">

      {/* ── 1. TOP HEADER — TRANSPARENT, NO DARK BACKDROP ─────────────────
          The old bg-gradient-to-b from-black/80 via-black/40 is gone. Only
          a per-text drop-shadow keeps the labels readable over bright videos.
          pointer-events-none on the wrapper means the full-bleed video can
          still receive taps in the empty header area; the one real control
          ("Discover Nearby") re-enables pointer events on itself. */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between pointer-events-none">
        <h1 className="text-lg font-bold tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          Moment
        </h1>
        <button className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-xs font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <MapPin size={14} />
          <span>Discover Nearby</span>
        </button>
      </div>

      {/* ── 2. FULL-SCREEN VIDEO ──────────────────────────────────────────
          absolute inset-0 w-full h-full object-cover guarantees the video
          fills every phone screen regardless of its native aspect ratio —
          portrait, square, or landscape — cropping to fit rather than
          letterboxing. key={currentMoment.id} forces a fresh <video>
          element per item so autoPlay reliably fires on every swipe
          (reusing the node across src changes is flaky in several browsers). */}
      {currentMoment && (
        <video
          key={currentMoment.id}
          ref={videoRef}
          src={currentMoment.videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop={!autoScroll}
          muted={isMuted}
          onEnded={handleVideoEnd}
          playsInline
          preload="auto"
        />
      )}

      {/* ── 3. RIGHT SIDE ACTION RAIL ─────────────────────────────────── */}
      <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-5">
        <div className="relative">
          <img
            src={currentMoment?.userAvatar}
            alt={currentMoment?.username}
            className="w-11 h-11 rounded-full border-2 border-orange-500 object-cover"
          />
          <button className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white">
            <Plus size={12} />
          </button>
        </div>

        <button className="flex flex-col items-center gap-1">
          <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <Heart
              size={22}
              className={
                currentMoment?.isLiked
                  ? "fill-orange-500 text-orange-500"
                  : "text-white"
              }
            />
          </div>
          <span className="text-xs font-semibold">{currentMoment?.likes}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <MessageCircle size={22} />
          </div>
          <span className="text-xs font-semibold">{currentMoment?.comments}</span>
        </button>

        <button
          onClick={() => setIsMuted((m) => !m)}
          aria-label={isMuted ? "Unmute video" : "Mute video"}
          className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
        >
          {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
          >
            <MoreVertical size={22} />
          </button>

          {showOptions && (
            <div className="absolute right-0 bottom-12 w-44 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl p-1.5 z-40 flex flex-col gap-1">
              <button
                onClick={handleShareLink}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg w-full text-left transition"
              >
                <Copy size={15} className="text-orange-400" />
                <span>Copy Share Link</span>
              </button>

              {currentMoment?.isOwner && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg w-full text-left transition"
                >
                  <Trash2 size={15} />
                  <span>Delete Video</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. BOTTOM STACK ────────────────────────────────────────────────
          bottom-[72px] pins this stack right on top of the 72px bottom
          navigation bar. Inside, flex flex-col orders the children
          top-to-bottom, so:
              • profile card  ← top
              • input bar     ← immediately below the card, immediately above
                                the bottom nav
          The subtle upward gradient here is for text legibility over bright
          videos — it is NOT a header backdrop, so it doesn't violate the
          "no dark header" requirement. */}
      <div className="absolute bottom-[72px] left-0 right-0 z-30 px-4 flex flex-col gap-2 bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-6">
        {/* Profile card — sits directly on top of the input bar */}
        <div className="flex items-center gap-2.5 max-w-[80%]">
          <img
            src={currentMoment?.userAvatar}
            alt={currentMoment?.username}
            className="w-8 h-8 rounded-full border border-orange-500/50 object-cover"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-wide">
              @{currentMoment?.username}
            </span>
            <p className="text-[11px] text-slate-300 line-clamp-1">
              {currentMoment?.caption}
            </p>
          </div>
        </div>

        {/* Input bar — sits directly on top of the bottom navigation bar */}
        <div className="relative flex items-center w-full">
          <input
            type="text"
            placeholder={`Message ${currentMoment?.username}...`}
            className="w-full bg-slate-900/80 backdrop-blur-md border border-orange-500/40 rounded-full py-2.5 pl-4 pr-11 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
          />
          <button className="absolute right-1.5 p-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}