"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getFreshAccessToken } from "@/lib/supabase/auth-client";
import { USER_MEDIA_MIME_TYPES, validateMediaFile } from "@/lib/utils/media-upload";
import { uploadWithProgress } from "@/lib/utils/upload-progress";
import { shareUserMediaToFeedAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
type Media = { id: string; storage_path: string; media_type: string };

export function UserMediaGallery({ uid }: { uid: string }) {
  const [items, setItems] = useState<Media[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const { data, error } = await getSupabaseClient().from("user_media")
        .select("id,storage_path,media_type").eq("user_id", uid)
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(offset, offset + 23);
      if (error) throw new Error(`Could not load media: ${error.message}`);
      setItems(previous => offset ? [...previous, ...(data ?? [])] : data ?? []);
      setMore(data?.length === 24);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not load media."); }
    finally { setLoading(false); }
  }, [uid]);
  useEffect(() => { void load(); }, [load]);

  async function upload() {
    const file = input.current?.files?.[0];
    if (!file || busy) return;
    setBusy(true); setError(""); setStatus(""); setProgress(0);
    try {
      const invalid = validateMediaFile(file);
      if (invalid) throw new Error(invalid);
      const token = await getFreshAccessToken();
      if (!token) throw new Error("Please sign in again.");
      const client = getSupabaseClient();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || auth.user?.id !== uid) throw new Error("Please sign in to your own account.");
      const { error: schemaError } = await client.from("user_media").select("id").limit(0);
      if (schemaError) throw new Error(`Media storage is not ready: ${schemaError.message}`);
      const path = `${uid}/${crypto.randomUUID()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!base || !key) throw new Error("Storage is not configured.");
      setStatus("Uploading…");
      await uploadWithProgress(`${base}/storage/v1/object/user-media/${path}`, file,
        { Authorization: `Bearer ${token}`, apikey: key, "Content-Type": file.type, "x-upsert": "false" }, setProgress);
      setStatus("Saving…");
      const { error: saveError } = await client.from("user_media").insert({
        user_id: uid, storage_path: path, media_type: file.type.startsWith("video/") ? "video" : "image",
      });
      if (saveError) {
        const { error: cleanupError } = await client.storage.from("user-media").remove([path]);
        throw new Error(`Could not save media: ${saveError.message}${cleanupError ? ". Cleanup failed; contact support." : ""}`);
      }
      await load(); setStatus("Media uploaded successfully.");
    } catch (error) {
      setStatus(""); setError(error instanceof Error ? error.message : "Upload failed.");
    } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  // Publish one gallery item to the community Moments feed.
  async function share(mediaId: string) {
    if (busy) return;
    setSharingId(mediaId);
    setError("");
    setStatus("");
    try {
      const result = await shareUserMediaToFeedAction(mediaId);
      if (!result.ok) {
        setError(result.error ?? "Could not share that item.");
        return;
      }
      setStatus("Shared to your Moments feed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not share that item.");
    } finally {
      setSharingId(null);
    }
  }

  return <Card className="flex flex-col gap-4">
    <h2 className="font-semibold text-white">Your photos and videos</h2>
    <p className="text-sm text-ink-300">Public gallery. No account item cap; up to 250 MB per file, subject to provider limits. Some formats require downloading to view.</p>
    <input ref={input} type="file" accept={USER_MEDIA_MIME_TYPES.join(",")} className="hidden" disabled={busy} onChange={() => void upload()} />
    <Button disabled={busy || loading} variant="secondary" onClick={() => input.current?.click()}>Upload photo / video</Button>
    {busy ? <progress aria-label="Media upload progress" max={100} value={progress} className="w-full" /> : null}
    <p role="status" className="text-sm text-ink-300">{status || (loading ? "Loading media…" : "")}{busy ? ` (${progress}%)` : ""}</p>
    {error ? <p role="alert" className="text-sm text-danger-300">{error}</p> : null}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(item => {
        const url = getSupabaseClient().storage.from("user-media").getPublicUrl(item.storage_path).data.publicUrl;
        const sharing = sharingId === item.id;
        return <div key={item.id} className="overflow-hidden rounded-xl bg-white/5">
          {item.media_type === "video" ? <video controls preload="metadata" src={url} className="aspect-square w-full object-contain" />
            : <img loading="lazy" src={url} alt="Your uploaded media" className="aspect-square w-full object-cover" />}
          <div className="flex items-center justify-between gap-2 p-2">
            <a href={url} target="_blank" rel="noreferrer" className="text-xs text-brand-300 hover:underline">Open original</a>
            {/* Opt-in syndication: publishing is an explicit choice, never automatic. */}
            <button
              type="button"
              onClick={() => void share(item.id)}
              disabled={sharing || busy}
              className="shrink-0 rounded-lg border border-orange-400/40 bg-orange-500/10 px-2 py-1 text-[11px] font-semibold text-orange-200 transition hover:bg-orange-500/20 disabled:opacity-50"
            >
              {sharing ? "Sharing…" : "Share to feed"}
            </button>
          </div>
        </div>;
      })}
    </div>
    {!loading && !error && !items.length ? <p className="text-sm text-ink-400">No gallery uploads yet.</p> : null}
    {more ? <Button variant="ghost" disabled={loading || busy} onClick={() => void load(items.length)}>Load more</Button> : null}
  </Card>;
}
