"use client";

import { useRef, useState } from "react";
import { Video, Send, Link as LinkIcon, Trash2 } from "lucide-react";
import { parseVideoEmbedUrl, type ParsedEmbed, type ParsedEmbedResult } from "@/lib/utils/video-embed";
import { uploadMediaDirect } from "@/lib/utils/direct-upload";
import { getSupabaseClient } from "@/lib/supabase/client";
import { publishMomentAction, publishLinkMomentAction } from "@/lib/actions/tasks";

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
    setUploading(true);
    setError(null);
    try {
      const { data: auth } = await getSupabaseClient().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setError("Please sign in again to publish.");
        return;
      }

      // Step 1 — bytes straight to the `user-media` bucket.
      const uploaded = await uploadMediaDirect(uid, file);
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
      setError("Failed to upload video. Please try again.");
    } finally {
      setUploading(false);
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
          placeholder={uploading ? "Uploading video..." : "Share a moment... (YouTube / Instagram / TikTok)"}
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

