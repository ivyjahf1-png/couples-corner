"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import {
  CONTENT_PLACEMENTS,
  CONTENT_STATUSES,
  CONTENT_UPLOAD,
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

const inputClass =
  "mt-1 w-full rounded-xl border border-ink-700 bg-surface px-3 py-2 text-sm text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none";

/** File types accepted by the media picker (mirrors server-side validation). */
const ACCEPT_TYPES = [...CONTENT_UPLOAD.imageTypes, ...CONTENT_UPLOAD.videoTypes].join(",");

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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // File chosen in the picker — uploaded on submit (overrides pasted media URL).
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  // Captured after the first successful create so a retry following an upload
  // failure updates the same row instead of creating a duplicate.
  const [savedId, setSavedId] = useState<string | null>(editingItem?.id ?? null);

  function fail(msg: string) {
    setError(msg);
    setBusy(false);
  }

  /** Client-side gate before submit: type/size mirror the server checks. */
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (!file) {
      setMediaFile(null);
      return;
    }
    const isImage = CONTENT_UPLOAD.imageTypes.some((t) => t === file.type);
    const isVideo = CONTENT_UPLOAD.videoTypes.some((t) => t === file.type);
    if (!isImage && !isVideo) {
      e.target.value = "";
      fail(
        `Unsupported file type: ${file.type || "unknown"}. Allowed: JPEG, PNG, WebP, MP4, WebM.`
      );
      return;
    }
    const maxSize = isImage ? CONTENT_UPLOAD.maxImageBytes : CONTENT_UPLOAD.maxVideoBytes;
    if (file.size > maxSize) {
      e.target.value = "";
      fail(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${(maxSize / 1024 / 1024).toFixed(1)}MB.`
      );
      return;
    }
    setMediaFile(file);
    setMediaType(isVideo ? "video" : "image");
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
      mediaUrls: mediaUrl ? [mediaUrl] : ([] as string[]),
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      buttonText: buttonText.trim() || undefined,
      destinationUrl,
      placement,
      status,
      priority: Number(priority) || 0,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      targetAudience: targetAudience.trim() || undefined,
    };

    try {
      // Persist the row first — the storage path needs the content id.
      let contentId = savedId;
      if (contentId) {
        await updateContentAction(contentId, payload, adminUid);
      } else {
        contentId = await createContentAction(payload, adminUid);
        setSavedId(contentId);
      }

      // A selected file overrides the pasted media URL after upload.
      if (mediaFile) {
        setUploading(true);
        try {
          const { mediaUrl: uploadedUrl } = await uploadContentMedia(contentId, mediaFile);
          const uploadedType: MediaType = mediaFile.type.startsWith("video/")
            ? "video"
            : "image";
          await updateContentAction(
            contentId,
            {
              mediaUrl: uploadedUrl,
              mediaType: uploadedType,
              // Default the poster to the uploaded image unless one was pasted.
              thumbnailUrl:
                uploadedType === "image"
                  ? thumbnailUrl.trim() || uploadedUrl
                  : thumbnailUrl.trim() || undefined,
            },
            adminUid
          );
          setMediaUrl(uploadedUrl);
        } catch (uploadErr) {
          setUploading(false);
          fail(
            `Content saved, but the file upload failed: ${
              uploadErr instanceof Error ? uploadErr.message : "unknown error"
            } — submit again to retry the upload.`
          );
          return;
        }
        setUploading(false);
      }
      onClose();
    } catch (err) {
      fail(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-20 backdrop-blur">
      <div className="w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">
          {editingItem ? "Edit content" : `New ${category.replace(/s$/, "")}`}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="text-sm font-medium text-ink-100">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Summer couples retreat" required />
          </label>
          <label className="text-sm font-medium text-ink-100">
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={3} placeholder="Brief description (optional)" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink-100">
              Media type
              <select value={mediaType} onChange={(e) => setMediaType(e.target.value as MediaType)} className={inputClass}>
                {MEDIA_TYPES.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
            </label>
            <label className="text-sm font-medium text-ink-100">
              Placement
              <select value={placement} onChange={(e) => setPlacement(e.target.value as ContentPlacement)} className={inputClass}>
                {CONTENT_PLACEMENTS.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </label>
          </div>
          <p className="text-xs text-ink-400">
            Upload a file (stored in Supabase Storage) or paste direct URLs below. A selected
            file replaces the media URL on save.
          </p>
          <label className="text-sm font-medium text-ink-100">
            Upload file{" "}
            <span className="font-normal text-ink-400">(JPEG, PNG, WebP · MP4, WebM)</span>
            <input
              type="file"
              accept={ACCEPT_TYPES}
              onChange={handleFileChange}
              className={`${inputClass} file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-white/20`}
            />
          </label>
          {mediaFile ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm text-white">
              <span className="truncate">
                {mediaFile.name}{" "}
                <span className="text-ink-400">
                  ({(mediaFile.size / 1024 / 1024).toFixed(1)}MB)
                </span>
              </span>
              <button
                type="button"
                onClick={() => setMediaFile(null)}
                className="shrink-0 text-xs text-ink-400 transition hover:text-white"
              >
                Remove
              </button>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink-100">
              Media URL {mediaFile ? "(file overrides)" : "(blank to upload)"}
              <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className={inputClass} placeholder="https://…" />
            </label>
            <label className="text-sm font-medium text-ink-100">
              Thumbnail / poster URL
              <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className={inputClass} placeholder="https://…" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink-100">
              Button text
              <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className={inputClass} placeholder="Learn more" />
            </label>
            <label className="text-sm font-medium text-ink-100">
              Destination URL
              <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} className={inputClass} placeholder="https://… or /discover" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-ink-100">
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className={inputClass}>
                {CONTENT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </label>
            <label className="text-sm font-medium text-ink-100">
              Priority
              <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-ink-100">
              Target audience
              <input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className={inputClass} placeholder="all, new-users" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink-100">
              Start date/time
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-ink-100">
              End date/time
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputClass} />
            </label>
          </div>
          {error ? <p className="text-sm text-danger-300">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button size="sm" type="submit" disabled={busy}>
              {busy ? <Icon name="sparkle" className="h-4 w-4 animate-pulse" /> : null}
              {busy
                ? uploading
                  ? "Uploading…"
                  : "Saving…"
                : editingItem || savedId
                  ? "Save changes"
                  : "Create content"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}