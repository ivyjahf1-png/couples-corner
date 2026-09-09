"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import {
  CONTENT_PLACEMENTS,
  CONTENT_STATUSES,
  MEDIA_TYPES,
  type ContentCategory,
  type ContentItem,
  type ContentPlacement,
  type ContentStatus,
  type MediaType,
} from "@/lib/models/content";
import {
  createContentAction,
  updateContentAction,
  uploadContentMedia,
} from "@/lib/actions/content";

interface ContentFormProps {
  category: ContentCategory;
  editingItem: ContentItem | null;
  adminUid: string;
  onClose: () => void;
}

function isoToInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function defaultEnd(): string {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const input =
  "mt-1 w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none";

export function ContentForm({ category, editingItem, adminUid, onClose }: ContentFormProps) {
  const [title, setTitle] = useState(editingItem?.title ?? "");
  const [description, setDescription] = useState(editingItem?.description ?? "");
  const [mediaType, setMediaType] = useState<MediaType>(editingItem?.mediaType ?? "image");
  const [mediaUrl, setMediaUrl] = useState(editingItem?.mediaUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(editingItem?.thumbnailUrl ?? "");
  const [buttonText, setButtonText] = useState(editingItem?.buttonText ?? "");
  const [destinationUrl, setDestinationUrl] = useState(editingItem?.destinationUrl ?? "");
  const [placement, setPlacement] = useState<ContentPlacement>(
    editingItem?.placement ?? "dashboard"
  );
  const [status, setStatus] = useState<ContentStatus>(editingItem?.status ?? "draft");
  const [priority, setPriority] = useState(String(editingItem?.priority ?? 0));
  const [startAt, setStartAt] = useState(
    editingItem ? isoToInput(editingItem.startAt) : isoToInput(new Date().toISOString())
  );
  const [endAt, setEndAt] = useState(editingItem ? isoToInput(editingItem.endAt) : defaultEnd());
  const [targetAudience, setTargetAudience] = useState(editingItem?.targetAudience ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function fail(msg: string) {
    setError(msg);
    setBusy(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (!title.trim()) return fail("Title is required.");
    if (!startAt || !endAt) return fail("Start and end dates are required.");
    if (new Date(startAt).getTime() >= new Date(endAt).getTime())
      return fail("End date must be after the start date.");

    const payload = {
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      mediaType,
      mediaUrl,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      buttonText: buttonText.trim() || undefined,
      destinationUrl: destinationUrl.trim() || undefined,
      placement,
      status,
      priority: Number(priority) || 0,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      targetAudience: targetAudience.trim() || undefined,
    };

    try {
      if (editingItem) {
        const id = editingItem.id;
        let mUrl = mediaUrl;
        let mThumb = thumbnailUrl.trim() || undefined;
        if (file) {
          const up = await uploadContentMedia(id, file);
          mUrl = up.mediaUrl;
          if (up.thumbnailUrl) mThumb = up.thumbnailUrl;
        }
        await updateContentAction(id, { ...payload, mediaUrl: mUrl, thumbnailUrl: mThumb }, adminUid);
      } else {
        const id = await createContentAction(
          { ...payload, mediaUrl: mediaUrl || "", thumbnailUrl: thumbnailUrl.trim() || undefined },
          adminUid
        );
        if (file) {
          const up = await uploadContentMedia(id, file);
          await updateContentAction(
            id,
            { mediaUrl: up.mediaUrl, thumbnailUrl: up.thumbnailUrl ?? undefined, status },
            adminUid
          );
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-surface p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">
          {editingItem ? "Edit content" : `New ${category.replace(/s$/, "")}`}
        </h2>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
          Close
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-ink-800">
          Title <span className="text-danger-700">*</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="e.g. Join us this weekend" />
        </label>
        <label className="text-sm font-medium text-ink-800">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={input} placeholder="Short supporting copy…" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-ink-800">Media type</span>
            <div className="mt-1 flex gap-2">
              {MEDIA_TYPES.map((mt) => (
                <button
                  key={mt}
                  type="button"
                  onClick={() => setMediaType(mt)}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    mediaType === mt
                      ? "border-brand-600 bg-brand-100 text-brand-800"
                      : "border-ink-200 bg-surface text-ink-700 hover:bg-surface-muted",
                  ].join(" ")}
                >
                  {mt}
                </button>
              ))}
            </div>
          </div>
          <label className="text-sm font-medium text-ink-800">
            Placement
            <select value={placement} onChange={(e) => setPlacement(e.target.value as ContentPlacement)} className={input}>
              {CONTENT_PLACEMENTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-sm font-medium text-ink-800">
          Upload media (image or video)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-ink-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink-800">
            Media URL (blank to upload)
            <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className={input} placeholder="https://…" />
          </label>
          <label className="text-sm font-medium text-ink-800">
            Thumbnail / poster URL
            <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className={input} placeholder="https://…" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink-800">
            Button text
            <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className={input} placeholder="Learn more" />
          </label>
          <label className="text-sm font-medium text-ink-800">
            Destination URL
            <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} className={input} placeholder="https://… or /discover" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-ink-800">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className={input}>
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-ink-800">
            Priority
            <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className={input} />
          </label>
          <label className="text-sm font-medium text-ink-800">
            Target audience
            <input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className={input} placeholder="all, new-users" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink-800">
            Start date/time
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={input} />
          </label>
          <label className="text-sm font-medium text-ink-800">
            End date/time
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={input} />
          </label>
        </div>

        {error ? <p className="text-sm text-danger-700">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={busy}>
            {busy ? <Icon name="sparkle" className="h-4 w-4 animate-pulse" /> : null}
            {busy ? "Saving…" : editingItem ? "Save changes" : "Create content"}
          </Button>
        </div>
      </form>
    </div>
  );
}