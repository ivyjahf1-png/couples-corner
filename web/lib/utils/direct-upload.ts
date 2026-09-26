/**
 * Couples Corner — direct browser -> Supabase Storage upload.
 *
 * WHY THIS EXISTS (the "An unexpected response was received from the server"
 * bug): the moment form used to hand the whole `File` to a Server Action.
 * That sends the entire video as the Server Action request body, and Vercel
 * rejects any function request body over 4.5 MB with a 413
 * (FUNCTION_PAYLOAD_TOO_LARGE) BEFORE the action code runs. `bodySizeLimit` in
 * next.config.ts cannot raise that — it is a platform limit, not a Next.js one.
 *
 * The 413 body is not an RSC payload and not text/plain, so Next's action
 * client cannot parse it and throws error E394, whose message is exactly
 * "An unexpected response was received from the server". The action's own
 * try/catch never runs, because the action never runs — which is why no amount
 * of server-side logging could ever have explained this failure.
 *
 * The fix is architectural: upload the bytes straight to storage from the
 * browser (this file), then send only a small JSON payload — a path and some
 * text — through the Server Action. A few hundred bytes always fits.
 *
 * Storage RLS (`user_media_storage_insert`, migration 008) requires the first
 * path segment to be the caller's uid, so the path shape here is a security
 * requirement, not just a naming convention.
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import { getFreshAccessToken } from "@/lib/supabase/auth-client";
import { uploadWithProgress } from "@/lib/utils/upload-progress";
import { validateMediaFile } from "@/lib/utils/media-upload";

export type DirectUploadResult =
  | { ok: true; storagePath: string; mediaType: "image" | "video" }
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

/**
 * Upload `file` directly to the `user-media` bucket and return its storage path.
 *
 * `onProgress` receives 0-100. Throws on failure; callers should catch. The
 * returned path is the only thing the Server Action needs afterwards.
 */
export async function uploadMediaDirect(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<DirectUploadResult> {
  const invalid = validateMediaFile(file);
  if (invalid) return { ok: false, error: invalid };

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) {
    return { ok: false, error: "Storage is not configured. Contact support." };
  }

  // Confirm the browser session really is this uid before writing under their
  // folder. The bearer token is what authorizes the storage insert, so trusting
  // a caller-supplied uid here would let one member write into another's folder.
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false, error: "Please sign in again." };
  }
  if (auth.user.id !== uid) {
    return { ok: false, error: "You can only upload to your own account." };
  }

  const token = await getFreshAccessToken();
  if (!token) return { ok: false, error: "Your session expired. Please sign in again." };

  // Surface a missing user_media table now, with a real message, rather than
  // letting the moment insert fail later with a confusing reference error.
  const { error: schemaError } = await client.from("user_media").select("id").limit(0);
  if (schemaError) {
    return {
      ok: false,
      error: `Media storage is not ready: ${schemaError.message}`,
    };
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const ext = (sanitized.split(".").pop() ?? "").toLowerCase() || "jpg";
  // Derived from the RESOLVED type, never file.type: an empty file.type would
  // make startsWith("video/") false and file every video as an image, which then
  // renders as a broken <img> in the feed.
  const contentType = file.type || EXT_MIME[ext] || "application/octet-stream";
  const mediaType: "image" | "video" = contentType.startsWith("video/")
    ? "video"
    : "image";

  // First segment MUST be the uid: the storage RLS policy checks it, and the
  // server re-checks it before publishing.
  const path = `${uid}/${crypto.randomUUID()}_${sanitized}`;

  await uploadWithProgress(
    `${base}/storage/v1/object/user-media/${path}`,
    file,
    {
      Authorization: `Bearer ${token}`,
      apikey: key,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    onProgress ?? (() => undefined)
  );

  return { ok: true, storagePath: path, mediaType };
}