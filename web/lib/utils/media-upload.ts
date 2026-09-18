/** Per-file limits, not lifetime/account quotas. Provider quotas still apply. */
export const MAX_PROFILE_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_USER_MEDIA_BYTES = 250 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif", "image/bmp", "image/tiff"] as const;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/ogg", "video/mpeg", "video/x-msvideo", "video/x-matroska", "video/3gpp"] as const;
export const USER_MEDIA_MIME_TYPES: readonly string[] = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];
// Profile photos must render in browsers; HEIC/TIFF uploads belong in the gallery.
export const PROFILE_PHOTO_MIME_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export function validateMediaFile(file: { size: number; type: string }, profilePhoto = false): string | null {
  const types = profilePhoto ? PROFILE_PHOTO_MIME_TYPES : USER_MEDIA_MIME_TYPES;
  const max = profilePhoto ? MAX_PROFILE_PHOTO_BYTES : MAX_USER_MEDIA_BYTES;
  if (!types.includes(file.type)) return profilePhoto
    ? "Use JPEG, PNG, WebP, GIF, or AVIF for a profile photo."
    : "Unsupported media type. Choose a supported image or video (including MP4, MOV, or WebM).";
  if (!Number.isFinite(file.size) || file.size <= 0) return "The selected file is empty.";
  if (file.size > max) return `File too large. Maximum size is ${max / 1024 / 1024} MB per file.`;
  return null;
}
