/** Media embed parser for the moments feed (client-safe).
 *
 * Thin, backwards-compatible wrapper around the SECURITY-REVIEWED
 * `parseVideoEmbedUrl` in `@/lib/utils/video-embed` -- that module owns the
 * host allowlist and rebuilds every embed URL from the extracted video id, so
 * a hostile host can never reach an iframe `src`.
 *
 * This module keeps the `parseMediaUrl(url)` API the feed cards use to pick a
 * rendering strategy (youtube / instagram / tiktok iframe vs raw video vs
 * image), and adds direct-file detection for MP4 / Supabase storage URLs which
 * are played natively rather than framed.
 */

import { parseVideoEmbedUrl } from "@/lib/utils/video-embed";

export type EmbedType = "youtube" | "instagram" | "tiktok" | "video" | "image" | "unknown";

export interface ParsedMedia {
  type: EmbedType;
  /** Canonical embed URL for iframe rendering (youtube/instagram/tiktok). Null for native files. */
  embedUrl: string | null;
  originalUrl: string;
}

const VIDEO_EXT = new RegExp("\\.(mp4|webm|mov|m4v|ogv)(\\?|#|$)", "i");
const IMAGE_EXT = new RegExp("\\.(jpg|jpeg|png|gif|webp|avif)(\\?|#|$)", "i");

export function parseMediaUrl(raw: string): ParsedMedia {
  const url = (raw ?? "").trim();
  if (!url) return { type: "unknown", embedUrl: null, originalUrl: raw };

  // Social embeds: allowlisted + rebuilt from the video id.
  const embed = parseVideoEmbedUrl(url);
  if (embed.ok) {
    return { type: embed.provider, embedUrl: embed.embedUrl, originalUrl: url };
  }

  // Direct video files (uploads, Supabase storage public URLs) play natively.
  if (VIDEO_EXT.test(url)) return { type: "video", embedUrl: null, originalUrl: url };
  if (IMAGE_EXT.test(url)) return { type: "image", embedUrl: null, originalUrl: url };

  // Supabase storage public URLs without an extension (signed/transformed URLs)
  // are video uploads, not embeds -- play them natively.
  if (url.toLowerCase().indexOf("/storage/v1/object/") !== -1) {
    return { type: "video", embedUrl: null, originalUrl: url };
  }

  return { type: "unknown", embedUrl: null, originalUrl: url };
}

export default parseMediaUrl;
