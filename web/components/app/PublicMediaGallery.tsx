"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MediaGrid, type GalleryMedia } from "@/components/app/MediaGrid";
import { Card } from "@/components/ui/Card";

type Media = GalleryMedia;

/**
 * Read-only media gallery for public profile views.
 *
 * Shows a member's uploaded photos/videos from the `user_media` table (same
 * storage bucket as the own-profile gallery, minus the upload controls, which
 * only make sense for the signed-in owner). Falls back to a quiet empty state
 * when nothing is shared yet or the table isn't provisioned.
 */
export function PublicMediaGallery({ uid }: { uid: string }) {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from("user_media")
        .select("id,storage_path,media_type")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(0, 23);
      if (error) throw new Error(`Could not load media: ${error.message}`);
      setItems(data ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load media.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-semibold text-white">Photos & videos</h2>
      <p className="text-sm text-ink-300">
        Media shared publicly by this member.
      </p>
      {error ? <p role="alert" className="text-sm text-danger-300">{error}</p> : null}
      {loading ? (
        <p role="status" className="text-sm text-ink-400">Loading media…</p>
      ) : null}
      {!loading && !error && !items.length ? (
        <p className="text-sm text-ink-400">No uploads shared yet.</p>
      ) : null}
      <MediaGrid items={items} alt="Member media" />
    </Card>
  );
}