"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createFeedPostAction, recordUserMediaAction } from "@/lib/actions/profile";
import { publishLinkMomentAction } from "@/lib/actions/tasks";
import { uploadMediaDirect } from "@/lib/utils/direct-upload";
import { getSupabaseClient } from "@/lib/supabase/client";
import { parseVideoEmbedUrl } from "@/lib/utils/video-embed";
import { SHEET_SHELL, SHEET_PANEL_RELATIVE } from "@/components/ui/layers";

type Mode = "upload" | "link";

export function FeedUploadModal({ onClose, userId }: { onClose: () => void; userId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side preview of what the server will accept. The server re-validates,
  // so this is only to avoid a pointless round-trip - it is not the check that
  // decides whether the moment is safe to store.
  const linkCheck = linkUrl.trim() ? parseVideoEmbedUrl(linkUrl) : null;

  async function publish() {
    if (!userId) { setError("Sign in to publish a post."); return; }
    setPublishing(true); setError(null);
    try {
      if (mode === "link") {
        const created = await publishLinkMomentAction({
          url: linkUrl.trim(),
          content: caption.trim(),
        });
        if (!created.ok) { setError(created.error ?? "Could not publish."); return; }
        onClose();
        return;
      }

      if (!file || !caption.trim()) return;
      // Two steps: the bytes go straight to storage, then two tiny actions write
      // the gallery row and the post. This used to be a single Server Action
      // carrying the whole File, which Vercel rejects above 4.5 MB before the
      // action runs — the same E394 failure that broke moment uploads.
      const { data: auth } = await getSupabaseClient().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setError("Please sign in again."); return; }

      const uploaded = await uploadMediaDirect(uid, file);
      if (!uploaded.ok) { setError(uploaded.error); return; }

      // Links the file to the profile gallery permanently, as well as to the post.
      const recorded = await recordUserMediaAction({
        userId: uid,
        storagePath: uploaded.storagePath,
        mediaType: uploaded.mediaType,
        caption: caption.trim(),
      });
      if (!recorded.ok || !recorded.data) {
        setError(recorded.error ?? "Could not save your media.");
        return;
      }

      const created = await createFeedPostAction(uid, caption.trim(), [recorded.data.publicUrl]);
      if (!created.ok) { setError(created.error ?? "Could not publish post."); return; }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish your post.");
    } finally {
      setPublishing(false);
    }
  }

  // Publish is gated per-mode. In link mode the link must actually parse, so a
  // member cannot publish a moment that is guaranteed to be rejected server-side.
  const canPublish =
    mode === "link"
      ? Boolean(linkUrl.trim() && caption.trim()) && linkCheck?.ok === true && !publishing
      : Boolean(file && caption.trim() && !publishing);

  return (
    <div className={`${SHEET_SHELL} bg-slate-950/80 backdrop-blur-sm sm:p-4`} role="dialog" aria-modal="true" aria-label="Create a post">
      <div className={`${SHEET_PANEL_RELATIVE} w-full max-w-lg rounded-t-3xl border border-white/15 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl`}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">Create a post</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10" aria-label="Close">×</button></div>

        {/* GO LIVE — the third way to post, alongside upload and link.

            It is a full-width row rather than a third tab because it is not a
            mode of THIS form: it leaves the sheet and opens a completely
            different surface (the live room, /live). Putting it in the tablist
            would imply choosing it swaps the inputs below, which it does not.

            The sheet is the highest-intent creation surface in the app — it is
            what the floating "+" opens — so it is the natural home for a Go
            Live entry point, and it was previously reachable only by typing the
            URL. */}
        <Link
          href="/live"
          onClick={onClose}
          className="group mt-4 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-500/15 to-orange-500/10 p-3 transition hover:border-rose-400/50 hover:from-rose-500/25"
        >
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/25 text-rose-200 transition group-hover:bg-rose-500/35"
          >
            <Radio className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-bold text-white">
              Go Live
              {/* The pulsing dot is the standard live affordance and is what
                  makes this read as "start streaming" rather than "open a
                  page". It is decorative; the label carries the meaning. */}
              <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
            </span>
            <span className="block text-xs text-white/60">
              Broadcast live to your followers and take gifts in real time
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
        </Link>

        {/* Two ways to add media, side by side. Tabs rather than one long form
            because the paths are mutually exclusive: a post is either an
            uploaded file or an embed, never both, and showing both inputs at
            once would leave the member guessing which one wins. */}
        <div role="tablist" aria-label="Post type" className="mt-4 flex gap-1 rounded-xl border border-white/10 bg-slate-950 p-1">
          <button type="button" role="tab" aria-selected={mode === "upload"} onClick={() => { setMode("upload"); setError(null); }} className={["flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition", mode === "upload" ? "bg-amber-300/15 text-amber-100" : "text-slate-400 hover:text-white"].join(" ")}>Upload a file</button>
          <button type="button" role="tab" aria-selected={mode === "link"} onClick={() => { setMode("link"); setError(null); }} className={["flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition", mode === "link" ? "bg-amber-300/15 text-amber-100" : "text-slate-400 hover:text-white"].join(" ")}>Paste a video link</button>
        </div>

        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={2200} placeholder="Share something with your community…" className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none focus:border-amber-300/60" />

        {mode === "upload" ? (
          <>
            <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 flex w-full items-center justify-center rounded-xl border border-dashed border-white/20 py-5 text-sm text-white/65 hover:border-amber-300/60 hover:text-amber-200">{file ? file.name : "+ Add photo or short video"}</button>
          </>
        ) : (
          <div className="mt-3">
            <input
              type="url"
              inputMode="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…  YouTube, TikTok or Instagram"
              aria-label="Video link"
              aria-invalid={linkCheck ? !linkCheck.ok : undefined}
              className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none focus:border-amber-300/60"
            />
            {/* Inline validation, so a bad link is obvious before publishing
                rather than only after a round-trip. The server is the
                authority; this only saves the round-trip. */}
            {linkCheck ? (
              linkCheck.ok ? (
                <p className="mt-2 text-xs text-emerald-300">
                  {(linkCheck.provider === "youtube" ? "YouTube" : linkCheck.provider === "tiktok" ? "TikTok" : "Instagram") + " link ready."}
                </p>
              ) : (
                <p className="mt-2 text-xs text-red-300">{linkCheck.error}</p>
              )
            ) : (
              <p className="mt-2 text-xs text-slate-500">Paste a link to a YouTube, TikTok or Instagram video.</p>
            )}
          </div>
        )}

        {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!userId || !canPublish} onClick={publish}>{publishing ? "Publishing…" : "Publish"}</Button>
        </div>
      </div>
    </div>
  );
}

