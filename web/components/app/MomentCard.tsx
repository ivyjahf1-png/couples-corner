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
import { parseMediaUrl } from "@/lib/media/embedParser";

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
  // Normalise both shapes onto one media URL + declared type.
  const rawMediaUrl = isMomentView(post)
    ? post.mediaUrl
    : (post.video_url ?? post.media_url ?? post.image_url ?? null);

  // Social links (YouTube / Instagram / TikTok) render as embeds; raw files
  // keep the native <video>/<img> path. `parseMediaUrl` re-derives the
  // canonical embed URL from the video id, so a stored raw link can never
  // become an arbitrary iframe src.
  const parsed = rawMediaUrl ? parseMediaUrl(rawMediaUrl) : null;
  const embedUrl =
    parsed && (parsed.type === "youtube" || parsed.type === "instagram" || parsed.type === "tiktok")
      ? parsed.embedUrl
      : null;

  // Normalise both shapes onto one video/image decision.
  const videoSource =
    !embedUrl &&
    (isMomentView(post)
      ? post.mediaType === "video"
        ? post.mediaUrl
        : null
      : (post.video_url ?? (post.media_type === "video" ? post.media_url : null) ?? null));
  const hasVideo = Boolean(videoSource);
  const imageSource = isMomentView(post)
    ? post.mediaType !== "video"
      ? post.mediaUrl
      : null
    : (post.image_url ?? null);
  const body = isMomentView(post) ? post.content : post.body;
  // Portrait-first embeds (TikTok / Reels / Shorts) get a taller frame so the
  // player is not letterboxed into a sliver; landscape YouTube keeps 16:9.
  const isPortraitEmbed = parsed?.type === "tiktok" || parsed?.type === "instagram";

  return (
    <div className="rounded-xl bg-[#1F1A32] p-4 text-white">
      {/* Post author and text content... */}
      {body ? <p className="my-2 text-sm">{body}</p> : null}

      {/* Social embed (YouTube / Instagram / TikTok) */}
      {embedUrl ? (
        <div
          className={
            isPortraitEmbed
              ? "relative mx-auto mt-3 aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-xl bg-black"
              : "relative mt-3 aspect-video w-full overflow-hidden rounded-xl bg-black"
          }
        >
          <iframe
            src={embedUrl}
            title={body ? `Embedded video: ${body.slice(0, 80)}` : "Embedded video"}
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : null}

      {/* Render Video if available */}
      {!embedUrl && hasVideo && videoSource ? (
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
      {!embedUrl && !hasVideo && imageSource ? (
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
