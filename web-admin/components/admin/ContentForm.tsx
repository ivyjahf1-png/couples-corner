"use client";

import { useState, useRef, useEffect, useMemo, type FormEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import {
  AD_COPY_SUGGESTIONS,
  AD_COPY_THEMES,
} from "@/lib/data/ad-copy-suggestions";
import {
  CONTENT_PLACEMENTS,
  CONTENT_STATUSES,
  MEDIA_TYPES,
  CONTENT_UPLOAD,
  type ContentCategory,
  type ContentItem,
  type ContentPlacement,
  type ContentStatus,
  type MediaType,
} from "@/lib/models/content";
import {
  createContentAction,
  updateContentAction,
} from "@/lib/actions/content";
import { uploadMediaFromBrowser } from "@/lib/utils/media-upload";

interface ContentFormProps {
  category: ContentCategory;
  editingItem: ContentItem | null;
  adminUid: string;
  onClose: () => void;
}

const MAX_FILES = 10;

const inputClass =
  "mt-1 w-full rounded-lg border border-orange-500/30 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 [color-scheme:dark] focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 [&>option]:bg-slate-900 [&>option]:text-slate-100";

const labelClass = "text-sm font-medium text-slate-100";

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

interface FileSlot {
  file: File;
  previewUrl: string;
}

export function ContentForm({ category, editingItem, adminUid, onClose }: ContentFormProps) {
  const [title, setTitle] = useState(editingItem?.title ?? "");
  const [description, setDescription] = useState(editingItem?.description ?? "");
  const [mediaType, setMediaType] = useState<MediaType>(editingItem?.mediaType ?? "image");
  const [mediaUrl, setMediaUrl] = useState(editingItem?.mediaUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(editingItem?.thumbnailUrl ?? "");
  const [buttonText, setButtonText] = useState(editingItem?.buttonText ?? "");
  const [destinationUrl, setDestinationUrl] = useState(editingItem?.destinationUrl ?? "");
  const [placement, setPlacement] = useState<ContentPlacement>(editingItem?.placement ?? "dashboard");
  const [status, setStatus] = useState<ContentStatus>(editingItem?.status ?? "draft");
  const [priority, setPriority] = useState(String(editingItem?.priority ?? 0));
  const [startAt, setStartAt] = useState(
    editingItem ? isoToInput(editingItem.startAt) : isoToInput(new Date().toISOString())
  );
  const [endAt, setEndAt] = useState(
    editingItem ? isoToInput(editingItem.endAt) : defaultEnd()
  );
  const [targetAudience, setTargetAudience] = useState(editingItem?.targetAudience ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [fileSlots, setFileSlots] = useState<FileSlot[]>([]);
  const [copyTheme, setCopyTheme] = useState<string>("");
  const [copySearch, setCopySearch] = useState<string>("");
  const [copyOpen, setCopyOpen] = useState(false);
  const copyBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileSlotsRef = useRef<FileSlot[]>([]);
  fileSlotsRef.current = fileSlots;

  // Revoke object URLs only on unmount. Individual removals revoke their own
  // URL, so a mount-once listener avoids tearing down still-displayed previews
  // (which previously broke multi-file uploads and could leave the UI stuck).
  useEffect(() => {
    const ref = fileSlotsRef;
    return () => {
      ref.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Client-side validation for immediate feedback (server re-validates).
    const problems: string[] = [];
    const valid = files.filter((file) => {
      const imageTypes = CONTENT_UPLOAD.imageTypes as readonly string[];
      const videoTypes = CONTENT_UPLOAD.videoTypes as readonly string[];
      const isVideo = videoTypes.includes(file.type);
      const isImage = imageTypes.includes(file.type);
      if (!isImage && !isVideo) {
        problems.push(`${file.name}: unsupported type (${file.type || "unknown"})`);
        return false;
      }
      const maxSize = isVideo ? CONTENT_UPLOAD.maxVideoBytes : CONTENT_UPLOAD.maxImageBytes;
      if (file.size > maxSize) {
        problems.push(`${file.name}: ${formatBytes(file.size)} exceeds ${formatBytes(maxSize)} limit`);
        return false;
      }
      return true;
    });

    setError(problems.length > 0 ? problems.join(" · ") : null);
    if (valid.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Append to any existing slots, respecting the total MAX_FILES cap.
    const room = Math.max(0, MAX_FILES - fileSlots.length);
    const accepted = valid.slice(0, room);
    if (valid.length > room) {
      setError(`${valid.length - room} of ${valid.length} file(s) skipped — max ${MAX_FILES} total.`);
    }
    if (accepted.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileSlots((prev) => {
      const newSlots: FileSlot[] = accepted.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...newSlots];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeSlot(index: number) {
    setFileSlots((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  }

  function clearAllFiles() {
    fileSlots.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setFileSlots([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUploadProgress(null);

    if (!title.trim()) {
      setError("Title is required.");
      return setBusy(false);
    }
    if (!startAt || !endAt) {
      setError("Start and end dates are required.");
      return setBusy(false);
    }
    if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
      setError("End date must be after the start date.");
      return setBusy(false);
    }

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
      priority: parseInt(priority || "0", 10),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      targetAudience: targetAudience.trim() || undefined,
    };

    try {
      if (editingItem) {
        if (fileSlots.length > 0) {
          // Upload DIRECTLY from the browser to Supabase Storage (binary
          // streams — no fetch() of local/blob paths, no Server Action body).
          setUploadProgress(`Uploading ${fileSlots.length} file${fileSlots.length > 1 ? "s" : ""}…`);
          const { result, warnings } = await uploadMediaFromBrowser(
            editingItem.id,
            fileSlots.map((s) => s.file)
          );
          if (result.mediaUrls.length === 0) {
            throw new Error(
              warnings.length > 0 ? `Upload failed: ${warnings.join("; ")}` : "Upload failed."
            );
          }
          payload.mediaUrl = result.mediaUrls[0];
          payload.mediaUrls = result.mediaUrls;
          payload.thumbnailUrl = result.mediaUrls[0];
          if (warnings.length > 0) setUploadProgress(`Uploaded with warnings: ${warnings.join("; ")}`);
        }
        await updateContentAction(editingItem.id, payload, adminUid);
      } else {
        const contentId = crypto.randomUUID();
        if (fileSlots.length > 0) {
          setUploadProgress(`Uploading ${fileSlots.length} file${fileSlots.length > 1 ? "s" : ""}…`);
          const { result, warnings } = await uploadMediaFromBrowser(
            contentId,
            fileSlots.map((s) => s.file)
          );
          if (result.mediaUrls.length === 0) {
            throw new Error(
              warnings.length > 0 ? `Upload failed: ${warnings.join("; ")}` : "Upload failed."
            );
          }
          payload.mediaUrl = result.mediaUrls[0];
          payload.mediaUrls = result.mediaUrls;
          payload.thumbnailUrl = result.mediaUrls[0];
        }
        await createContentAction(payload, adminUid, contentId);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content.");
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  const acceptedTypes = [...CONTENT_UPLOAD.imageTypes, ...CONTENT_UPLOAD.videoTypes].join(",");
  const canAddMore = fileSlots.length < MAX_FILES;

  const copyFiltered = useMemo(() => {
    const q = copySearch.trim().toLowerCase();
    return AD_COPY_SUGGESTIONS.filter(
      (s) =>
        (!copyTheme || s.theme === copyTheme) &&
        (!q || s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    );
  }, [copyTheme, copySearch]);

  // Show up to all 500 matches in the scrollable dropdown (fully virtualized
  // by the browser's overflow scroll — responsive on mobile/tablet/desktop).
  const copyMatches = useMemo(() => copyFiltered.slice(0, 500), [copyFiltered]);
  const copyTotal = AD_COPY_SUGGESTIONS.length;

  useEffect(() => {
    if (!copyOpen) return;
    const onDown = (e: MouseEvent) => {
      if (copyBoxRef.current && !copyBoxRef.current.contains(e.target as Node)) setCopyOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [copyOpen]);

  function applySuggestion(id: string) {
    const found = AD_COPY_SUGGESTIONS.find((s) => s.id === id);
    if (!found) return;
    setTitle(found.title);
    setDescription(found.description);
    setCopyOpen(false);
  }

  function surpriseMe() {
    const pool = copyMatches.length > 0 ? copyMatches : AD_COPY_SUGGESTIONS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) {
      setTitle(pick.title);
      setDescription(pick.description);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-orange-500/30 bg-slate-900/90 p-6 shadow-2xl shadow-orange-500/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {editingItem ? "Edit" : "Create"} {category}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-orange-300 hover:bg-orange-500/20 hover:text-white" aria-label="Close">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {category === "advertisement" && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  Ad copy ideas <span className="ml-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-200">500 suggestions</span>
                </p>
                <button type="button" onClick={surpriseMe} className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-200 hover:bg-orange-500/20">
                  Surprise me
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <select value={copyTheme} onChange={(e) => setCopyTheme(e.target.value)} className={inputClass} aria-label="Filter suggestions by theme">
                  <option value="">All {copyTotal} ideas — every theme</option>
                  {AD_COPY_THEMES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
                <input value={copySearch} onChange={(e) => { setCopySearch(e.target.value); setCopyOpen(true); }} onFocus={() => setCopyOpen(true)} className={inputClass} placeholder="Search 500 titles & descriptions…" aria-label="Search ad copy suggestions" />
              </div>
              <div ref={copyBoxRef} className="relative mt-2">
                <button type="button" onClick={() => setCopyOpen((v) => !v)} aria-expanded={copyOpen} className="w-full rounded-lg border border-orange-500/30 bg-slate-900 px-3 py-2 text-left text-sm text-slate-200 hover:border-orange-500/60">
                  {copyMatches.length > 0 ? `Browse ${copyMatches.length} matching idea${copyMatches.length === 1 ? "" : "s"}…` : "No matches — try another theme or keyword"}
                </button>
                {copyOpen && (
                  <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-orange-500/30 bg-slate-950 shadow-2xl">
                    {copyMatches.map((s) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => applySuggestion(s.id)} className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-orange-500/10">
                          <span className="text-sm font-medium text-white">{s.title}</span>
                          <span className="line-clamp-2 text-xs text-slate-400">{s.description}</span>
                          <span className="text-[11px] font-medium uppercase tracking-wide text-orange-300/70">{s.theme}</span>
                        </button>
                      </li>
                    ))}
                    {copyMatches.length === 0 && (
                      <li className="px-3 py-4 text-center text-xs text-slate-400">No suggestions match. Clear the search or pick another theme.</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
          <label className={labelClass}>Title<input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Summer campaign" /></label>
          <label className={labelClass}>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={2} placeholder="Optional description" /></label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Media type<select value={mediaType} onChange={(e) => setMediaType(e.target.value as MediaType)} className={inputClass}>{MEDIA_TYPES.map((m) => (<option key={m} value={m}>{m}</option>))}</select></label>
            <label className={labelClass}>Placement<select value={placement} onChange={(e) => setPlacement(e.target.value as ContentPlacement)} className={inputClass}>{CONTENT_PLACEMENTS.map((p) => (<option key={p} value={p}>{p}</option>))}</select></label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Media files (up to {MAX_FILES})</label>
              {fileSlots.length > 0 && (
                <button type="button" onClick={clearAllFiles} className="text-xs text-red-400 hover:underline">Clear all</button>
              )}
            </div>

            {fileSlots.length === 0 ? (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-orange-500/30 bg-slate-900 px-4 py-8 text-center hover:border-orange-500/50">
                <Icon name="upload" className="h-8 w-8 text-orange-400" />
                <span className="text-sm font-medium text-orange-200">Click to upload images or videos</span>
                <span className="text-xs text-orange-300/70">JPEG, PNG, WebP (10 MB) · MP4, WebM (100 MB) · Up to {MAX_FILES} files</span>
                <input ref={fileInputRef} type="file" accept={acceptedTypes} multiple onChange={handleFileChange} className="hidden" />
              </label>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  {fileSlots.map((slot, i) => (
                    <div key={i} className="relative overflow-hidden rounded-lg border border-orange-500/30 bg-slate-900">
                      {slot.file.type.startsWith("image/") ? (
                        /* eslint-disable @next/next/no-img-element */
                        <img src={slot.previewUrl} alt={slot.file.name} className="h-24 w-full object-cover" />
                      ) : (
                        /* eslint-disable jsx-a11y/media-has-caption */
                        <video src={slot.previewUrl} className="h-24 w-full object-cover" />
                      )}
                      <button type="button" onClick={() => removeSlot(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-red-600" aria-label={`Remove ${slot.file.name}`}>
                        <Icon name="x" className="h-3 w-3" />
                      </button>
                      <p className="truncate px-2 py-1 text-xs text-orange-200" title={slot.file.name}>{slot.file.name}</p>
                      <p className="px-2 pb-1 text-xs text-orange-300/60">{formatBytes(slot.file.size)}</p>
                    </div>
                  ))}
                </div>
                {canAddMore && (
                  <label className="cursor-pointer self-start rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-200 hover:bg-orange-500/20">
                    + Add more ({fileSlots.length}/{MAX_FILES})
                    <input ref={fileInputRef} type="file" accept={acceptedTypes} multiple onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>
            )}
          </div>

          {uploadProgress ? <p className="text-sm font-medium text-orange-300">{uploadProgress}</p> : null}
<div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Media URL<input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className={inputClass} placeholder="https://…" /></label>
            <label className={labelClass}>Thumbnail / poster URL<input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className={inputClass} placeholder="https://…" /></label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Button text<input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className={inputClass} placeholder="Learn more" /></label>
            <label className={labelClass}>Destination URL<input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} className={inputClass} placeholder="https://… or /discover" /></label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelClass}>Status<select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className={inputClass}>{CONTENT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}</select></label>
            <label className={labelClass}>Priority<input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Target audience<input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className={inputClass} placeholder="all, new-users" /></label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Start date/time<input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputClass} /></label>
            <label className={labelClass}>End date/time<input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputClass} /></label>
          </div>

          {error ? <p className="text-sm font-medium text-danger-400">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button size="sm" type="submit" disabled={busy}>
              {busy ? <Icon name="sparkle" className="h-4 w-4 animate-pulse" /> : null}
              {busy ? "Saving…" : editingItem ? "Save changes" : "Create content"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
