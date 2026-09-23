/**
 * Client-side media upload for the admin content form.
 *
 * Files are uploaded DIRECTLY from the browser to the Supabase Storage
 * `media` bucket (path `content/{contentId}/{file}`) via the anon-key
 * browser client. Only the resulting public URL strings are handed to the
 * Server Action (`createContentAction` / `updateContentAction`), so large
 * media payloads never travel through the Next.js Server Action POST body
 * (which is capped — the source of "fetch failed" / "Body exceeded 1 MB
 * limit" errors).
 *
 * This also fixes the previous "fetch failed" crash: the form used to call
 * `fetch(previewUrl)` on local File objects / revoked blob URLs / WhatsApp
 * image paths, which throws TypeError: fetch failed. Files are now passed
 * as binary streams straight to `supabase.storage.upload()` — no fetch()
 * of local objects, no FormData round-trip, no base64 inflation.
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import { CONTENT_UPLOAD } from "@/lib/models/content";

/** The storage bucket + prefix used for advertisement media (matches server actions). */
const MEDIA_BUCKET = "media";

export interface ClientUploadResult {
  mediaUrls: string[];
}

/** Validate one file against the shared content-upload limits. Returns null when valid, else an error message. */
function validateFile(file: File): string | null {
  // Guard against null/undefined file objects slipping in from the form.
  if (!file || typeof file.name !== "string" || file.name === "") {
    return "Invalid file (missing name).";
  }
  const isImage = CONTENT_UPLOAD.imageTypes.some((t) => t === file.type);
  const isVideo = CONTENT_UPLOAD.videoTypes.some((t) => t === file.type);
  if (!isImage && !isVideo) return `${file.name}: unsupported type (${file.type || "unknown"})`;
  const maxSize = isImage ? CONTENT_UPLOAD.maxImageBytes : CONTENT_UPLOAD.maxVideoBytes;
  if (file.size > maxSize) return `${file.name}: exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB`;
  return null;
}

/**
 * Build a collision-proof storage path for the uploaded file:
 * `content/{contentId}/{random}-{timestamp}.{ext}` — same layout the server
 * actions use (`content/{contentId}/...` inside the `media` bucket).
 */
function buildFilePath(contentId: string, file: File): string {
  const fileExt = file.name.includes(".")
    ? file.name.split(".").pop() ?? "bin"
    : "bin";
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  // Storage-safe: strip anything outside the allowed charset (defense in depth
  // even though the generated name is already safe).
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `content/${contentId}/${safeName}`;
}

/** Constructed public URL fallback (mirrors the storage API layout). */
function fallbackPublicUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/**
 * Upload files from the browser straight to the Supabase Storage `media`
 * bucket. Throws on total failure; collects per-file failures into the
 * returned warnings so a single bad file doesn't abort the whole batch.
 */
export async function uploadMediaFromBrowser(
  contentId: string,
  files: File[]
): Promise<{ result: ClientUploadResult; warnings: string[] }> {
  if (files.length === 0) return { result: { mediaUrls: [] }, warnings: [] };
  if (files.length > CONTENT_UPLOAD.maxFiles) {
    throw new Error(`Max ${CONTENT_UPLOAD.maxFiles} files. Got ${files.length}.`);
  }

  const supabase = getSupabaseClient();
  const mediaUrls: string[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    // 0. Handle the file object safely — validate before touching Storage.
    const problem = validateFile(file);
    if (problem) {
      warnings.push(problem);
      continue;
    }
    const filePath = buildFilePath(contentId, file);

    // 1. Upload the raw File object as a binary stream — never fetch() a
    // local/blob/WhatsApp path (that throws "fetch failed"). Wrap in
    // try/catch so network failures surface as warnings, not crashes.
    let uploadError: { message: string } | null = null;
    try {
      const res = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || undefined,
        });
      uploadError = res.error;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Normalize the classic fetch-failure so admins get an actionable hint.
      const hint = /fetch failed|failed to fetch|networkerror|load failed/i.test(msg)
        ? " (network fetch failed — check your connection and Supabase URL, then retry)"
        : "";
      console.error("Storage upload error:", msg);
      warnings.push(`${file.name}: ${msg}${hint}`);
      continue;
    }

    // Handle any storage errors cleanly — no raw alerts/throws per file;
    // collect the message so the form can surface it in its error banner.
    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      warnings.push(`${file.name}: ${uploadError.message}`);
      continue;
    }

    // 2. Get the public URL to save into the advertisements table.
    // getPublicUrl is synchronous in this supabase-js version.
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || fallbackPublicUrl(filePath);
    console.log("Uploaded successfully. Public URL:", publicUrl);
    mediaUrls.push(publicUrl);
  }

  return { result: { mediaUrls }, warnings };
}
