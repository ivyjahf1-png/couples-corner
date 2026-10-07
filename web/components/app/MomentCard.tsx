"use client";

/**
 * MomentCard — feed-list moment item with video-or-image media.
 *
 * VIDEO-FIRST RENDER CONTRACT. A moment carries exactly one media slot, so
 * video wins over image: when a video source exists the card renders a
 * <video> element (never a static <img> of a video file), otherwise it falls
 * back to the image. Detection is explicit —
 * `video_url` wins outright, otherwise `media_type === "video"` plus a
 * `media_url` — so a row with a video flag but no URL renders no media
 * rather than a broken player.
 *
 * WHY `controls + playsInline + preload="metadata"` HERE. This card lives in
 * a scrolling list where many players share the viewport, so unlike the
 * full-screen MomentViewer (autoPlay/muted/loop with an IntersectionObserver
 * driver) it must NOT autoplay: `controls` gives the member explicit play,
 * `playsInline` keeps iOS from hijacking to fullscreen, and
 * `preload="metadata"` fetches only dimensions/poster until tapped, which is
 * what keeps a long timeline from opening dozens of streams at once.
 */

import type { MomentView } from "@/lib/moments";

/**
 * Minimal post shape this card accepts. `MomentView` (lib/moments.ts) is the
 * primary source — `mediaUrl` + `mediaType` — while `MomentPost` covers rows
 * that still use the legacy `video_url` / `image_url` column names, so both
 * callers get the same video-first rendering without a rewrite.
 */
export interface MomentPost {
  id: string;
  body: string;
  video_url?: string | null;
  media_url?: string | null;
  image_url?: string | null;
  media_type?: string | null;
}

type MomentCardPost = MomentPost | MomentView;

function isMomentView(post: MomentCardPost): post is MomentView {
  return "mediaUrl" in post && "mediaType" in post;
}

export function MomentCard({ post }: { post: MomentCardPost }) {
  // Normalise both shapes onto one video/image decision.
  const videoSource = isMomentView(post)
    ? post.mediaType === "video"
      ? post.mediaUrl
      : null
    : (post.video_url ?? (post.media_type === "video" ? post.media_url : null) ?? null);
  const hasVideo = Boolean(videoSource);
  const imageSource = isMomentView(post)
    ? post.mediaType !== "video"
      ? post.mediaUrl
      : null
    : (post.image_url ?? null);
  const body = isMomentView(post) ? post.content : post.body;

  return (
    <div className="rounded-xl bg-[#1F1A32] p-4 text-white">
      {/* Post author and text content... */}
      {body ? <p className="my-2 text-sm">{body}</p> : null}

      {/* Render Video if available */}
      {hasVideo && videoSource ? (
        <div className="relative mt-3 overflow-hidden rounded-xl bg-black">
          <video
            src={videoSource}
            controls
            playsInline
            preload="metadata"
            className="max-h-[400px] w-full object-cover"
          />
        </div>
      ) : null}

      {/* Render Image if available and no video */}
      {!hasVideo && imageSource ? (
        <img
          src={imageSource}
          alt="Moment media"
          loading="lazy"
          decoding="async"
          className="mt-3 max-h-[400px] w-full rounded-xl object-cover"
        />
      ) : null}
    </div>
  );
}
