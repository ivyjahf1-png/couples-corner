/**
 * Couples Corner — direct browser -> Supabase Storage uploads.
 *
 * Every user-facing media upload in this app goes through this module. The bytes
 * travel from the browser straight to the storage bucket; the Next.js server is
 * only ever asked to write a small database row afterwards.
 *
 * WHY (the "An unexpected response was received from the server" bug):
 * the upload forms used to hand the whole `File` to a Server Action or an API
 * route. That makes the file the function's request body, and Vercel rejects any
 * function request body over 4.5 MB with a 413 FUNCTION_PAYLOAD_TOO_LARGE
 * BEFORE any application code runs. `bodySizeLimit` in next.config.ts cannot
 * raise that — 4.5 MB is a platform limit, not a Next.js one. The 413 body is
 * neither an RSC payload nor text/plain, so Next's action client throws error
 * E394: "An unexpected response was received from the server". Because the
 * rejection happens first, the action's try/catch never runs and nothing is ever
 * logged — which is exactly why that failure had no server-side trace.
 *
 * Uploading directly sidesteps the function body limit AND the serverless
 * execution timeout, so large videos transfer at the client's own uplink speed
 * with no proxy in the middle.
 *
 * TWO TRANSFER PATHS, both direct to storage:
 *   • No `onProgress` -> `supabase.storage.from(bucket).upload(...)`, the SDK
 *     call. Simple, and what every caller should use by default.
 *   • With `onProgress` -> raw XHR against the Storage REST endpoint, because
 *     supabase-js's `.upload()` cannot report transferred bytes and an
 *     indeterminate spinner on a 200 MB upload is indistinguishable from a hang.
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import { getFreshAccessToken } from "@/lib/supabase/auth-client";
import { uploadWithProgress } from "@/lib/utils/upload-progress";
import { validateMediaFile, MAX_MOMENT_VIDEO_BYTES } from "@/lib/utils/media-upload";

export const USER_MEDIA_BUCKET = "user-media";
export const PROFILE_PHOTOS_BUCKET = "photos";

export type DirectUploadResult =
  | {
      ok: true;
      storagePath: string;
      mediaType: "image" | "video";
      /**
       * Public URL of the stored object.
       *
       * Added so a caller that only wants to REFERENCE an upload does not have to
       * write a `user_media` row just to get a URL back. `getPublicUrl` is pure
       * string construction — it performs no network call and issues no signed
       * request — so deriving it here costs nothing.
       *
       * This is what lets the Moment feed publish straight to `posts`: before
       * this field existed, `FeedUploadModal` had to call `recordUserMediaAction`
       * purely for the `publicUrl` it returned, which silently appended every
       * feed photo to the member's personal profile gallery as a side effect.
       */
      publicUrl: string;
    }
  | { ok: false; error: string };

/** Extension -> mime, for devices whose File.type is empty (older Android). */
const EXT_MIME: Record<string, string> = {
  mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime",
  webm: "video/webm", ogv: "video/ogg", mpeg: "video/mpeg",
  mpg: "video/mpeg", avi: "video/x-msvideo", mkv: "video/x-matroska",
  "3gp": "video/3gpp",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", gif: "image/gif", avif: "image/avif",
  heic: "image/heic", heif: "image/heif", bmp: "image/bmp",
  tif: "image/tiff", tiff: "image/tiff",
};

export interface DirectUploadOptions {
  /** Defaults to `user-media`. */
  bucket?: string;
  /** Supply to get byte-level progress; switches to the XHR transfer path. */
  onProgress?: (percent: number) => void;
  /** Apply the stricter profile-photo type allowlist (images only). */
  profilePhoto?: boolean;
  /**
   * Override the leading path segment(s), e.g. `content/<id>`.
   *
   * Needed for buckets whose RLS keys off a folder that is NOT the caller's uid
   * - the admin `media` bucket stores campaign media under `content/<id>/`.
   * Left undefined, the shape below is used, which storage RLS requires.
   */
  pathPrefix?: string;
}

/**
 * Build the storage path for an upload.
 *
 * The shape is dictated by storage RLS, not chosen for tidiness:
 *   • `user-media` — `user_media_storage_insert` (migration 008) requires
 *     `storage.foldername(name)[1] = auth.uid()`, so the first segment MUST be
 *     the caller's uid.
 *   • `photos` — `photos: owner can upload` (migration 007) requires
 *     `foldername[1] = 'profiles'` and `foldername[2] = auth.uid()`.
 * A path that does not match is rejected by the database, not by this code.
 */
function buildStoragePath(bucket: string, uid: string, fileName: string, pathPrefix?: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  if (pathPrefix) {
    // Trailing slashes are stripped so a caller passing "content/abc/" cannot
    // produce a double slash, which some storage backends treat as a distinct
    // (and unlisted) object key.
    return `${pathPrefix.replace(/\/+$/, "")}/${Date.now()}_${safe}`;
  }
  if (bucket === PROFILE_PHOTOS_BUCKET) {
    return `profiles/${uid}/${Date.now()}_${safe}`;
  }
  // crypto.randomUUID keeps a retry from colliding with a previous attempt.
  return `${uid}/${crypto.randomUUID()}_${safe}`;
}

/**
 * Map a Supabase Storage failure to a clear, actionable message.
 *
 * The generic "Network error" the Moment composer used to show hides the real
 * cause. Storage rejects are not all the same: a 413 means the file exceeds the
 * bucket limit, a 401/403 is an auth/RLS problem, a 404 is a missing bucket, and
 * a bare transport failure is a genuine network drop. Members can only act on
 * the ones we name, so this keys off the status code first and the message text
 * second, always falling back to the original message rather than a placeholder.
 */
export function describeStorageError(error: unknown, limitBytes: number = MAX_MOMENT_VIDEO_BYTES): string {
  const status =
    typeof (error as { status?: unknown })?.status === "number"
      ? (error as { status: number }).status
      : typeof (error as { statusCode?: unknown })?.statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : undefined;
  const message =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown })?.message === "string"
      ? (error as { message: string }).message
      : "";

  const limitMb = Math.round(limitBytes / (1024 * 1024));

  if (status === 413 || /too large|exceed|payload too large|size/i.test(message)) {
    return `That file is larger than the ${limitMb} MB limit. Please choose a shorter or smaller video.`;
  }
  if (status === 401 || /jwt|expired|not authenticated/i.test(message)) {
    return "Your session expired while uploading. Please sign in again and retry.";
  }
  if (status === 403 || /row-level|violates|permission|denied|unauthorized/i.test(message)) {
    return "Upload was blocked by storage permissions. Please try again, or contact support if it keeps happening.";
  }
  if (status === 404 || /bucket|not found/i.test(message)) {
    return "Storage is not available right now. Please try again shortly.";
  }
  if (status === 400 || /mime|invalid|unsupported/i.test(message)) {
    return "That file type could not be stored. Please choose a supported MP4, MOV, or WebM video.";
  }
  if (status === 408 || /timeout|timed out/i.test(message)) {
    return "The upload timed out. Check your connection and retry.";
  }
  if (message) return message;
  return "Upload failed. Check your connection and try again.";
}

/**
 * Upload `file` straight to Supabase Storage and return its storage path.
 *
 * Never throws: failures come back as `{ ok: false, error }` so callers have one
 * uniform shape to render, whatever went wrong.
 */
export async function uploadFileDirect(
  uid: string,
  file: File,
  options: DirectUploadOptions = {}
): Promise<DirectUploadResult> {
  const {
    bucket = USER_MEDIA_BUCKET,
    onProgress,
    profilePhoto = false,
    pathPrefix,
  } = options;

  const invalid = validateMediaFile(file, profilePhoto);
  if (invalid) return { ok: false, error: invalid };

  const client = getSupabaseClient();

  // Confirm the browser session really is this uid before writing under their
  // folder. The bearer token is what authorizes the storage insert, so trusting a
  // caller-supplied uid would let one member write into another's folder.
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false, error: "Please sign in again." };
  }
  if (auth.user.id !== uid) {
    return { ok: false, error: "You can only upload to your own account." };
  }

  // Fail with a real message now, rather than letting the later database insert
  // fail with a confusing missing-relation error.
  const { error: schemaError } = await client
    .from(profilePhoto ? "profiles" : "user_media")
    .select(profilePhoto ? "user_id" : "id")
    .limit(0);
  if (schemaError) {
    return {
      ok: false,
      error: `Media storage is not ready: ${schemaError.message}`,
    };
  }

  const path = buildStoragePath(bucket, uid, file.name, pathPrefix);
  const ext = (path.split(".").pop() ?? "").toLowerCase();
  // Derived from the RESOLVED type, never file.type: an empty file.type makes
  // startsWith("video/") false and files every video as an image, which then
  // renders as a broken <img> in the feed.
  const contentType = file.type || EXT_MIME[ext] || "application/octet-stream";
  const mediaType: "image" | "video" = contentType.startsWith("video/")
    ? "video"
    : "image";

  try {
    if (onProgress) {
      // XHR path: needed purely for transferred-byte progress.
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!base || !key) {
        return { ok: false, error: "Storage is not configured. Contact support." };
      }
      const token = await getFreshAccessToken();
      if (!token) {
        return { ok: false, error: "Your session expired. Please sign in again." };
      }
      await uploadWithProgress(
        `${base}/storage/v1/object/${bucket}/${path}`,
        file,
        {
          Authorization: `Bearer ${token}`,
          apikey: key,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        onProgress
      );
    } else {
      // SDK path (default). The browser client carries the user's own JWT, so
      // storage RLS is enforced exactly as it is on the XHR path.
      const { error: uploadError } = await client.storage
        .from(bucket)
        .upload(path, file, { contentType, upsert: true });
      if (uploadError) {
        return { ok: false, error: describeStorageError(uploadError) };
      }
    }

    return {
      ok: true,
      storagePath: path,
      mediaType,
      publicUrl: client.storage.from(bucket).getPublicUrl(path).data.publicUrl,
    };
  } catch (error) {
    // The XHR path rejects with an Error carrying a numeric `status` when the
    // server responds; a bare transport failure has none. describeStorageError
    // turns either into a message the member can act on.
    return { ok: false, error: describeStorageError(error) };
  }
}

/** Convenience wrapper for `user-media` uploads (moments, gallery, feed). */
export function uploadMediaDirect(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<DirectUploadResult> {
  return uploadFileDirect(uid, file, { bucket: USER_MEDIA_BUCKET, onProgress });
}
