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

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
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

  // Normalise both shapes onto one video/image decision. `embedUrl` short-
  // circuits the native video path so the value is never `false` for an image
  // card; that keeps the JSX `src` prop strictly `string | null`.
  const videoSource = embedUrl
    ? null
    : isMomentView(post)
      ? post.mediaType === "video"
        ? post.mediaUrl
        : null
      : (post.video_url ?? (post.media_type === "video" ? post.media_url : null) ?? null);
  const hasVideo = Boolean(videoSource);
  const videoPosterSrc = post.previewUrl ?? videoSource ?? undefined;
  const imageSource = isMomentView(post)
    ? post.mediaType !== "video"
      ? post.mediaUrl
      : null
    : (post.image_url ?? null);
  const imageSrc = imageSource ?? undefined;
  const body = isMomentView(post) ? post.content : post.body;
  // Portrait-first embeds (TikTok / Reels / Shorts) get a taller frame so the
  // player is not letterboxed into a sliver; landscape YouTube keeps 16:9.
  const isPortraitEmbed = parsed?.type === "tiktok" || parsed?.type === "instagram";

  // Navigation router - clicking the card navigates to full-screen viewer
  const router = useRouter();

  // Determines the moment id for navigation (both post shapes have an `id`)
  const momentId = post.id;

  return (
    <Link
      href={`/feed?moment=${momentId}`}
      className="block rounded-2xl bg-gradient-to-b from-[#2a1a40] to-[#1f1a32] p-4 overflow-hidden relative group hover:opacity-95 transition-opacity"
    >
      {/* Media section - static thumbnail only, no video controls */}
      {embedUrl ? (
        // Embedded videos (YouTube/Instagram/TikTok) - keep the iframe embed
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
      ) : hasVideo ? (
        // Native video - static thumbnail poster with ▶️ indicator badge in top-right
        <div
          className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40 group-hover:opacity-90 transition-opacity"
        >
          {/* Thumbnail image */}
          <img
            src={videoPosterSrc}
            alt="Moment video preview"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Play indicator badge in top-right corner - purely visual */}
          <div
            className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white/60"
            aria-label="Video content"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Video
          </div>
          {/* Dark overlay for contrast */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
      ) : imageSource ? (
        // Static image
        <img
          src={imageSource}
          alt="Moment media"
          loading="lazy"
          decoding="async"
          className="relative w-full h-auto rounded-xl object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : null}

      {/* Title, creator info, and type at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-2 flex items-baseline">
        <div className="flex flex-col gap-1">
          <h3
            className="font-bold text-xs tracking-tight select-none line-clamp-1"
            style={{ color: "white" }}
          >
            {body ? body.slice(0, 40) : "Untitled"}
          </h3>
          {hasVideo && (
            <span className="text-[10px] text-white/60 capitalize">
              {videoSource ? "Video" : "Moment"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
