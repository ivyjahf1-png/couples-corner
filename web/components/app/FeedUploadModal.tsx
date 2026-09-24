"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createFeedPostAction, uploadUserMediaAction } from "@/lib/actions/profile";

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
    const uploaded = await uploadUserMediaAction(userId, file, caption.trim());
    if (!uploaded.ok || !uploaded.data) { setError(uploaded.error ?? "Could not upload media."); setPublishing(false); return; }
    const created = await createFeedPostAction(userId, caption.trim(), [uploaded.data.publicUrl]);
    if (!created.ok) setError(created.error ?? "Could not publish post."); else onClose();
    setPublishing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create a post">
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

