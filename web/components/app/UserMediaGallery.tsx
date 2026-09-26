"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getFreshAccessToken } from "@/lib/supabase/auth-client";
import { USER_MEDIA_MIME_TYPES, validateMediaFile } from "@/lib/utils/media-upload";
import { uploadWithProgress } from "@/lib/utils/upload-progress";
import { shareUserMediaToFeedAction, deleteUserMediaAction } from "@/lib/actions/profile";
import { MediaGrid, type GalleryMedia } from "@/components/app/MediaGrid";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Trash2 } from "lucide-react";
type Media = GalleryMedia;

export function UserMediaGallery({ uid }: { uid: string }) {
  const [items, setItems] = useState<Media[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Media | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  // Delete one gallery item. The Server Action verifies ownership with
  // requireSessionUid() and deletes the storage object BEFORE the DB row, so a
  // failure can never leave a row pointing at a missing file. The row is
  // removed from local state on success so the grid updates immediately,
  // without waiting on the revalidation round-trip.
  async function confirmDelete() {
    const target = pendingDelete;
    if (!target || deletingId) return;
    setDeletingId(target.id);
    setError("");
    setStatus("");
    try {
      const result = await deleteUserMediaAction(target.id, uid);
      if (!result.ok) {
        setError(result.error ?? "Could not delete that item.");
        return;
      }
      setItems((previous) => previous.filter((item) => item.id !== target.id));
      setStatus("Photo deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete that item.");
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  return <Card className="flex flex-col gap-4">
    <h2 className="font-semibold text-white">Photos &amp; videos</h2>
    <p className="text-sm text-ink-300">Public gallery. Up to 250 MB per file. Hover a tile to share or delete it.</p>
    <input ref={input} type="file" accept={USER_MEDIA_MIME_TYPES.join(",")} className="hidden" disabled={busy} onChange={() => void upload()} />
    <Button disabled={busy || loading} variant="secondary" onClick={() => input.current?.click()}>Upload photo / video</Button>
    {busy ? <progress aria-label="Media upload progress" max={100} value={progress} className="w-full" /> : null}
    <p role="status" className="text-sm text-ink-300">{status || (loading ? "Loading media…" : "")}{busy ? ` (${progress}%)` : ""}</p>
    {error ? <p role="alert" className="text-sm text-danger-300">{error}</p> : null}
    <MediaGrid
      items={items}
      alt="Your uploaded media"
    >
      {(item) => {
        const sharing = sharingId === item.id;
        const deleting = deletingId === item.id;
        return (
          /* Overlays sit above the tile's link. `absolute inset-x-0 top-0`
             anchors them to the <li> (which is `relative`), and the high z-index
             keeps them clickable rather than trapped under the anchor. */
          <>
            {/* Opt-in syndication: publishing is an explicit choice, never automatic. */}
            <button
              type="button"
              onClick={() => void share(item.id)}
              disabled={sharing || busy || deleting}
              className="absolute bottom-1.5 left-1.5 z-10 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-orange-500/80 disabled:opacity-50"
            >
              {sharing ? "Sharing…" : "Share"}
            </button>
            {/* Owner-only destructive control. This whole gallery is the signed-in
                member's own view (the server page passes session.uid and this
                component is never mounted for a public profile), so no extra
                viewer check is needed here — and the Server Action re-verifies
                ownership regardless. Hidden until hover/focus so it stays subtle,
                but it is a real button in the tab order for keyboard users. */}
            <button
              type="button"
              onClick={() => setPendingDelete(item)}
              disabled={deleting || busy}
              aria-label="Delete this photo"
              className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition hover:bg-danger-500 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </>
        );
      }}
    </MediaGrid>
    {!loading && !error && !items.length ? <p className="text-sm text-ink-400">No gallery uploads yet.</p> : null}
    {more ? <Button variant="ghost" disabled={loading || busy} onClick={() => void load(items.length)}>Load more</Button> : null}
    {/* Deletion is permanent and removes the underlying file, so it is gated on
        an explicit confirm rather than firing on the first click. */}
    <ConfirmationDialog
      open={pendingDelete !== null}
      title="Delete this photo?"
      body="This permanently removes the file from storage and your profile. This cannot be undone."
      confirmLabel={deletingId ? "Deleting…" : "Delete"}
      tone="danger"
      busy={deletingId !== null}
      onConfirm={() => void confirmDelete()}
      onCancel={() => setPendingDelete(null)}
    />
  </Card>;
}
