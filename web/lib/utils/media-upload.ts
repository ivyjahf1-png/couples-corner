/** Per-file limits, not lifetime/account quotas. Provider quotas still apply. */
/** Size limits are intentionally omitted: users may upload media of any size
   up to their account's storage quota. */
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif", "image/bmp", "image/tiff"] as const;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/ogg", "video/mpeg", "video/x-msvideo", "video/x-matroska", "video/3gpp"] as const;
export const USER_MEDIA_MIME_TYPES: readonly string[] = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];
// Profile photos must render in browsers; HEIC/TIFF uploads belong in the gallery.
export const PROFILE_PHOTO_MIME_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

/**
 * Moment video uploads have NO client-side per-file size limit: members may
 * upload media of any size up to their account's storage quota. Uploads travel
 * browser -> Supabase Storage over the resumable TUS path
 * (lib/utils/direct-upload.ts), which chunks the file and resumes from the
 * last confirmed byte, so even multi-gigabyte clips survive a flaky uplink.
 * The `user-media` bucket's `file_size_limit` is likewise null (migration
 * 059), so the server enforces no per-file ceiling either.
 */

export function validateMediaFile(file: { size: number; type: string }, profilePhoto = false): string | null {
  const types = profilePhoto ? PROFILE_PHOTO_MIME_TYPES : USER_MEDIA_MIME_TYPES;
  if (!types.includes(file.type)) return profilePhoto
    ? "Use JPEG, PNG, WebP, GIF, or AVIF for a profile photo."
    : "Unsupported media type. Choose a supported image or video (including MP4, MOV, or WebM).";
  if (!Number.isFinite(file.size) || file.size <= 0) return "The selected file is empty.";
  return null;
}
