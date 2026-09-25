"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { uploadUserMediaAction } from "@/lib/actions/profile";
import { Avatar } from "@/components/app/Avatar";

/**
 * Messages story tray.
 *
 * Horizontal, scrollable status row pinned under the Messages header. The
 * first cell is always "Add Story": picking a photo or a short video uploads it
 * through the existing user-media Server Action (same pipeline as feed posts)
 * and optimistically appends it to the tray.
 */
export function StoryTray({ userId, displayName }: { userId?: string; displayName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<{ id: string; url: string; kind: "image" | "video" }[]>([]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!userId) {
      setError("Sign in to post a story");
      return;
    }
    setBusy(true);
    setError(null);
    const uploaded = await uploadUserMediaAction(userId, file, "story");
    setBusy(false);
    if (!uploaded.ok || !uploaded.data) {
      setError(uploaded.error ?? "Could not upload your story");
      return;
    }
    setStories((prev) => [
      { id: uploaded.data!.id, url: uploaded.data!.publicUrl, kind: file.type.startsWith("video/") ? "video" : "image" },
      ...prev,
    ]);
  }

  return (
    <section aria-label="Stories" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Status</h2>
        {error ? <span role="alert" className="text-[11px] text-danger-300">{error}</span> : null}
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="group flex w-16 shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-orange-400/70 bg-gradient-to-br from-orange-500/20 to-violet-500/20">
            {userId ? (
              <Avatar name={displayName} size="lg" className="opacity-80" />
            ) : (
              <span className="h-14 w-14 rounded-full bg-white/5" />
            )}
            <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white ring-2 ring-[#0F172A]">
              <Plus className="h-4 w-4" />
            </span>
          </span>
          <span className="w-16 truncate text-center text-[11px] font-medium text-ink-200 group-hover:text-white">
            {busy ? "Uploading..." : "Add Story"}
          </span>
        </button>

        {stories.map((story) => (
          <span key={story.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-gradient-to-br border-orange-400/80 p-[2px]">
              {story.kind === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={story.url} muted playsInline className="h-full w-full rounded-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={story.url} alt="Your story" className="h-full w-full rounded-full object-cover" />
              )}
            </span>
            <span className="w-16 truncate text-center text-[11px] font-medium text-ink-200">Your story</span>
          </span>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onPick}
        aria-label="Add story photo or video"
      />
    </section>
  );
}