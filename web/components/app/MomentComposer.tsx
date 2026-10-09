"use client";

import { useRef, useState } from "react";
import { Video, Send, Link as LinkIcon, Trash2 } from "lucide-react";
import { parseVideoEmbedUrl, type ParsedEmbed, type ParsedEmbedResult } from "@/lib/utils/video-embed";
import { uploadMediaDirect } from "@/lib/utils/direct-upload";
import { MAX_MOMENT_VIDEO_BYTES } from "@/lib/utils/media-upload";
import { getSupabaseClient } from "@/lib/supabase/client";
import { publishMomentAction, publishLinkMomentAction } from "@/lib/actions/tasks";

/** Human-readable file size, e.g. "48.2 MB", for the pre-upload guard message. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * MomentComposer — caption field + video upload button for the Moment screen.
 *
 * Wires the requested UI (video pill button, "Share a moment..." input) to this
 * repo's real two-step pipeline:
 *   1. bytes go browser -> Supabase Storage via `uploadMediaDirect`
 *      (never through a server action — a 4.5 MB platform cap rejects files
 *      sent to actions with a 413 before the function body even runs).
 *   2. only the small JSON payload ({ storagePath, content, mediaType })
 *      crosses the `publishMomentAction` boundary.
 *
 * There is no `/api/upload/video` route and no `lib/actions/moments` module in
 * this codebase, so the draft's `fetch` + `createMomentAction` calls are
 * replaced with the above. File limits/types come from
 * `lib/utils/media-upload.ts` (250 MB, MP4/MOV/WebM et al.) and are enforced
 * inside the upload helper — no client-side size constant to drift.
 */
export function MomentComposer({ onPublished }: { onPublished?: () => void }) {
  const [body, setBody] = useState("");
  const [linkResult, setLinkResult] = useState<ParsedEmbedResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── link parse helper ───────────────────────────────────────────────
  async function handleParseLink() {
    const trimmed = body.trim();
    if (!trimmed) {
      setLinkResult({ ok: false, error: "Paste a link first." });
      return;
    }
    const parsed = parseVideoEmbedUrl(trimmed);
    setLinkResult(parsed);
  }

  // ── video upload path ───────────────────────────────────────────────
  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;

    // A staged link cancels an in-flight video pick.
    setLinkResult(null);
    setError(null);

    // Pre-upload size guard. Catching an over-limit file HERE avoids the exact
    // "Network error" on 1000014866.mp4: without it the whole file transfers,
    // the bucket replies 413, and the composer shows a generic failure. Failing
    // fast with a real message is cheaper for the member and the network.
    if (file.size > MAX_MOMENT_VIDEO_BYTES) {
      setError(
        `That video is ${formatBytes(file.size)} — over the ${formatBytes(
          MAX_MOMENT_VIDEO_BYTES
        )} limit. Please choose a shorter or smaller clip.`
      );
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const { data: auth } = await getSupabaseClient().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setError("Please sign in again to publish.");
        return;
      }

      // Step 1 — bytes straight to the `user-media` bucket, with byte-level
      // progress so a large upload shows real movement instead of a bare
      // "Uploading..." that is indistinguishable from a hang.
      const uploaded = await uploadMediaDirect(uid, file, (percent) =>
        setProgress(percent)
      );
      if (!uploaded.ok) {
        setError(uploaded.error);
        return;
      }
      if (uploaded.mediaType !== "video") {
        setError("Please choose a video file for a moment.");
        return;
      }

      // Step 2 — publish the moment referencing the stored object.
      const result = await publishMomentAction({
        storagePath: uploaded.storagePath,
        content: body.trim(),
        mediaType: "video",
      });
      if (!result.ok) {
        setError(result.error ?? "Could not publish your moment. Please try again.");
        return;
      }

      setBody("");
      onPublished?.();
    } catch (err) {
      console.error("[moments] composer upload failed:", err);
      // `uploadMediaDirect` already maps storage codes to real copy and returns
      // them as `{ ok: false, error }`, which is handled above. This catch is the
      // backstop for anything thrown outside that contract.
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Upload failed. Check your connection and try again."
      );
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  // ── submit (link or video) ──────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    const parsed = parseVideoEmbedUrl(trimmed);
    if (parsed.ok) {
      // Link moment
      setSubmitting(true);
      setError(null);
      try {
        const { data: auth } = await getSupabaseClient().auth.getUser();
        const uid = auth.user?.id;
        if (!uid) {
          setError("Please sign in again to publish.");
          setSubmitting(false);
          return;
        }
        const result = await publishLinkMomentAction({
        url: parsed.embedUrl,
        content: trimmed,
      });
      if (!result.ok) {
          setError(result.error ?? "Could not publish your moment. Please try again.");
          setSubmitting(false);
          return;
        }
        setBody("");
        setLinkResult(null);
        onPublished?.();
      } catch (err) {
        console.error("[moments] composer link publish failed:", err);
        setError("Failed to publish your moment. Please try again.");
        setSubmitting(false);
      }
      return;
    }

    // Otherwise fall back to video pick
    fileInputRef.current?.click();
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-t border-[#3A3358] p-3">
        {/* Hidden file input targeted by the upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/ogg,video/mpeg,video/x-msvideo,video/x-matroska,video/3gpp"
          className="hidden"
          onChange={handleVideoSelect}
        />

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload video"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#C9C2E4] transition hover:bg-white/10 disabled:opacity-50"
        >
          <Video aria-hidden className="h-5 w-5 text-[#FF7A00]" />
        </button>

        <input
          type="text"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (linkResult?.ok) setLinkResult(null);
          }}
          placeholder={
            uploading
              ? progress !== null
                ? `Uploading video... ${progress}%`
                : "Uploading video..."
              : "Share a moment... (YouTube / Instagram / TikTok)"
          }
          disabled={uploading || submitting}
          aria-label="Moment caption or link"
          className="flex-1 rounded-full bg-[#1F1A32] px-4 py-2 text-sm text-white placeholder-[#B8B2D1] focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
        />

        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${linkResult?.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-[#FF7A00]/15 text-[#FF7A00]"}`}
        >
          <Send className="h-4 w-4" />
        </span>
      </div>

      {/* Upload progress bar. Only present while a video is transferring, and
          only once the first byte has reported — so a short upload never flashes
          a bar that instantly disappears. Gives the member a real completion
          signal instead of the bare "Uploading video..." placeholder. */}
      {uploading && progress !== null ? (
        <div className="px-3 pb-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Video upload progress"
            className="h-1.5 w-full overflow-hidden rounded-full bg-[#2A2440]"
          >
            <div
              className="h-full rounded-full bg-[#FF7A00] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div aria-hidden="true" className="flex items-center gap-2 px-3 pb-1">
        <button
          type="submit"
          disabled={!body.trim() || uploading || submitting}
          className="flex h-9 items-center gap-2 rounded-full bg-[#FF7A00] px-4 text-sm font-semibold text-white transition hover:bg-[#FF6B00] disabled:opacity-40"
        >
          {submitting ? "Publishing..." : "Share"}
        </button>
      </div>
    

      {linkResult?.ok === false && body.trim() ? (
        <p role="alert" className="px-4 pb-3 text-xs text-amber-300">
          {linkResult.error} We only support YouTube, Instagram and TikTok links.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="px-4 pb-3 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

