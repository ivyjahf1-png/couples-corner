"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  createStoryAction,
  getActiveStoriesAction,
  type StoryView,
} from "@/lib/actions/profile";
import { Avatar } from "@/components/app/Avatar";
import { StoryViewer } from "@/components/app/StoryViewer";

/**
 * Messages story tray.
 *
 * Horizontal, scrollable status row pinned under the Messages header. The
 * first cell is always "Add Story": picking a photo or a short video uploads it
 * through `createStoryAction`, which stamps `expires_at = now() + 24h` server
 * side. The row is loaded from `getActiveStoriesAction`, which filters on
 * `expires_at > now()` in BOTH the query and the RLS policy, so anything older
 * than a day is never rendered.
 *
 * Every status circle is a real <button> that opens the immersive viewer. The
 * viewer's own like is written back into local state so the tray's ring stays
 * truthful without a refetch.
 */
export function StoryTray({ userId, displayName }: { userId?: string; displayName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<StoryView[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    const result = await getActiveStoriesAction();
    if (result.ok) setStories(result.stories);
  }, []);

  useEffect(() => { void load(); }, [load]);

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
    const result = await createStoryAction(file);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not upload your story");
      return;
    }
    // Prepend locally for an instant tray update, then reconcile with the
    // server list (which carries the author name/avatar the insert can't know).
    setStories((prev) => [result.story, ...prev]);
    void load();
  }

  /** Keep the tray's engagement state in step with the open viewer. */
  function applyReaction(storyId: string, reacted: boolean, count: number) {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, reactedByViewer: reacted, reactionCount: count } : s))
    );
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

        {stories.map((story, index) => {
          const name = story.authorName?.split(" ")[0] || "Story";
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group flex w-16 shrink-0 flex-col items-center gap-1.5"
              aria-label={`View story from ${story.authorName ?? "member"}`}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-[#FF5722] p-[2px] transition group-hover:brightness-110">
                <span className="h-full w-full overflow-hidden rounded-full bg-[#0F172A] p-[2px]">
                  {story.mediaType === "video" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={story.url} muted playsInline preload="metadata" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={story.url} alt="" className="h-full w-full rounded-full object-cover" />
                  )}
                </span>
              </span>
              <span className="w-16 truncate text-center text-[11px] font-medium text-ink-200 group-hover:text-white">
                {name}
              </span>
            </button>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onPick}
        aria-label="Add story photo or video"
      />

      {openIndex !== null && stories[openIndex] ? (
        <StoryViewer
          stories={stories}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          onReact={applyReaction}
        />
      ) : null}
    </section>
  );
}