/** Per-file limits, not lifetime/account quotas. Provider quotas still apply. */
/** Size limits are intentionally omitted: users may upload media of any size
   up to their account's storage quota. */
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif", "image/bmp", "image/tiff"] as const;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/ogg", "video/mpeg", "video/x-msvideo", "video/x-matroska", "video/3gpp"] as const;
export const USER_MEDIA_MIME_TYPES: readonly string[] = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];
// Profile photos must render in browsers; HEIC/TIFF uploads belong in the gallery.
export const PROFILE_PHOTO_MIME_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

/**
 * Single per-file ceiling for Moment videos, in bytes (100 MB).
 *
 * This is the ONE source of truth shared by the composer's pre-upload guard and
 * the `user-media` bucket's `file_size_limit` (migration 053). They MUST agree:
 * if the client allows more than the bucket accepts, the member watches a full
 * upload transfer and only then gets a server 413 — the exact "Network error"
 * this constant exists to prevent. Raising either side means raising both.
 */
export const MAX_MOMENT_VIDEO_BYTES = 100 * 1024 * 1024;

export function validateMediaFile(file: { size: number; type: string }, profilePhoto = false): string | null {
  const types = profilePhoto ? PROFILE_PHOTO_MIME_TYPES : USER_MEDIA_MIME_TYPES;
  if (!types.includes(file.type)) return profilePhoto
    ? "Use JPEG, PNG, WebP, GIF, or AVIF for a profile photo."
    : "Unsupported media type. Choose a supported image or video (including MP4, MOV, or WebM).";
  if (!Number.isFinite(file.size) || file.size <= 0) return "The selected file is empty.";
  return null;
}
