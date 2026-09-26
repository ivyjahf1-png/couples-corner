"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createFeedPostAction, recordUserMediaAction } from "@/lib/actions/profile";
import { uploadMediaDirect } from "@/lib/utils/direct-upload";
import { getSupabaseClient } from "@/lib/supabase/client";

export function FeedUploadModal({ onClose, userId }: { onClose: () => void; userId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!userId) { setError("Sign in to publish a post."); return; }
    if (!file || !caption.trim()) return;
    setPublishing(true); setError(null);
    try {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create a post">
      <div className="w-full max-w-lg rounded-t-3xl border border-white/15 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">Create a post</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10" aria-label="Close">×</button></div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} maxLength={2200} placeholder="Share something with your community…" className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none focus:border-amber-300/60" />
        <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 flex w-full items-center justify-center rounded-xl border border-dashed border-white/20 py-5 text-sm text-white/65 hover:border-amber-300/60 hover:text-amber-200">{file ? file.name : "+ Add photo or short video"}</button>
        {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!userId || !file || !caption.trim() || publishing} onClick={publish}>{publishing ? "Publishing…" : "Publish"}</Button></div>
      </div>
    </div>
  );
}

