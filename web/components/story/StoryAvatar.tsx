"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  createStoryAction,
  getActiveStoriesAction,
  type StoryView,
} from "@/lib/actions/profile";
import { Avatar } from "@/components/app/Avatar";
import { uploadFileDirect } from "@/lib/utils/direct-upload";
import { StoryViewer } from "@/components/app/StoryViewer";

/**
 * StoryAvatar — the "Your Story" cell plus every other member's active story,
 * rendered as the top story row of the Chat inbox.
 *
 * RETURNS A FRAGMENT on purpose: each cell must be a direct flex child of the
 * inbox's horizontal scroller (`MessagesInbox`), not wrapped in an extra div
 * that would collapse them into one 64px column. The hidden `<input>` is
 * `display:none` so it never takes a flex slot, and `StoryViewer` portals to
 * `document.body`, so neither disturbs the row.
 *
 * ── YOUR STORY CELL ─────────────────────────────────────────────────────────
 *   • EMPTY  — a dashed brand-orange ring with a centred `+` and a
 *     "Your Story" label. Tapping it opens the media file picker.
 *   • ACTIVE — the dashed ring is replaced by the member's newest uploaded
 *     story (image or silent looping video) inside an ANIMATED conic gradient
 *     ring (`.story-ring-gradient`, see globals.css). A small `+` badge sits at
 *     the bottom-right so more stories can be added without leaving the row;
 *     tapping the media itself opens the viewer at that story.
 *
 * ── UPLOAD (two steps, order matters) ───────────────────────────────────────
 * The bytes travel browser -> Supabase Storage via `uploadFileDirect` FIRST,
 * and only then does `createStoryAction` insert the `stories` row. Passing a
 * File to a Server Action would make it the request body, and Vercel rejects
 * bodies over 4.5 MB with 413 before the action ever runs — which is exactly
 * why a 10 MB story used to fail with "Payload too large" while the UI
 * advertised a 250 MB cap. `pathPrefix: stories/<uid>/` keeps the object under
 * the folder the storage RLS policy and the server's path check both expect.
 *
 * On completion the new story is PREPENDED to local state for an instant ring
 * update, then `load()` re-fetches so author name/avatar (which the insert
 * cannot know) reconcile with the server's truth.
 *
 * ── PEER CELLS ──────────────────────────────────────────────────────────────
 * Every other active story renders with the same animated gradient ring around
 * the uploader's avatar. Tapping any cell — yours or a peer's — opens the
 * shared full-screen `StoryViewer`, which supplies the auto-advancing progress
 * bars and the fast exit (X / Escape).
 */
export function StoryAvatar({ userId }: { userId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<StoryView[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    const result = await getActiveStoriesAction();
    if (result.ok) setStories(result.stories);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Split the fetched list so "Your Story" can prefer the member's own. */
  const ownStories = userId ? stories.filter((s) => s.userId === userId) : [];
  const peerStories = userId ? stories.filter((s) => s.userId !== userId) : stories;
  const ownLatest = ownStories[0];

  /** Open the viewer at a story, resolving its position in the FULL list. */
  function openStory(storyId: string) {
    const index = stories.findIndex((s) => s.id === storyId);
    if (index >= 0) setOpenIndex(index);
  }

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

    // Step 1 — bytes go browser -> Storage (never through a Server Action body).
    const uploaded = await uploadFileDirect(userId, file, {
      bucket: "user-media",
      pathPrefix: `stories/${userId}`,
    });
    if (!uploaded.ok) {
      setBusy(false);
      setError(uploaded.error);
      return;
    }

    // Step 2 — insert the row. The action stamps expires_at = now + 24h
    // server-side and rolls the object back if the insert fails.
    const result = await createStoryAction(uploaded.storagePath, uploaded.mediaType);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not upload your story");
      return;
    }

    // Instant local update, then reconcile with the server list.
    setStories((prev) => [result.story, ...prev]);
    void load();
  }

  /** Keep the tray's engagement state in step with the open viewer. */
  function applyReaction(storyId: string, reacted: boolean, count: number) {
    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId ? { ...s, reactedByViewer: reacted, reactionCount: count } : s
      )
    );
  }

  return (
    <>
      {/* ── YOUR STORY CELL ───────────────────────────────────────────── */}
      {ownLatest ? (
        /* ACTIVE — uploaded media in the animated brand-orange ring, with a
           `+` badge for adding another story. The ring is an absolutely
           positioned disc behind the media, so the photo never spins. */
        <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <div className="relative h-16 w-16">
            <button
              type="button"
              onClick={() => openStory(ownLatest.id)}
              aria-label="View your story"
              className="absolute inset-0 rounded-full focus-visible:outline-none"
            >
              <span className="story-ring-gradient absolute inset-0 rounded-full" />
              <span className="absolute inset-[3px] overflow-hidden rounded-full bg-[#0F172A]">
                {ownLatest.mediaType === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={ownLatest.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ownLatest.url}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                )}
              </span>
            </button>

            {/* Add-more badge — its own button, a sibling (never nested) of
                the viewer button above, so the markup stays valid HTML. */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              aria-label="Add another story"
              className="absolute -bottom-0.5 -right-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white ring-2 ring-[#0F172A] transition hover:bg-orange-400 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <span className="w-16 truncate text-center text-xs text-ink-300">
            {busy ? "Uploading…" : "Your Story"}
          </span>
        </div>
      ) : (
        /* EMPTY — dashed ring, centred `+`, "Your Story" label. */
        <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Add to your story"
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-orange-400/70 bg-gradient-to-br from-orange-500/20 to-violet-500/20 text-orange-300 transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-60"
          >
            <Plus className="h-7 w-7" />
          </button>
          <span className="w-16 truncate text-center text-xs text-ink-300">
            {busy ? "Uploading…" : "Your Story"}
          </span>
        </div>
      )}

      {error ? (
        <span role="alert" className="max-w-[10rem] self-center text-[11px] text-danger-300">
          {error}
        </span>
      ) : null}

      {/* ── PEER STORY CELLS ──────────────────────────────────────────── */}
      {peerStories.map((story) => {
        const name = story.authorName?.split(" ")[0] || "Story";
        return (
          <button
            key={story.id}
            type="button"
            onClick={() => openStory(story.id)}
            className="group flex w-16 shrink-0 flex-col items-center gap-1.5"
            aria-label={`View story from ${story.authorName ?? "member"}`}
          >
            <span className="relative block h-16 w-16">
              {/* Animated gradient ring sits behind the media; the inset dark
                  disc is the gap that makes it read as a ring, and the media
                  covers the centre so only the outer band is ever visible. */}
              <span className="story-ring-gradient absolute inset-0 rounded-full" />
              <span className="absolute inset-[3px] flex items-center justify-center overflow-hidden rounded-full bg-[#0F172A]">
                {story.mediaType === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={story.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={story.url}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                )}
              </span>
              {/* Avatar chip identifies the uploader at a glance without
                  hiding the story thumbnail itself. */}
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-[#0F172A]">
                <Avatar
                  name={story.authorName ?? "Member"}
                  src={story.authorAvatarUrl}
                  size="sm"
                  className="h-5 w-5 text-[9px]"
                />
              </span>
            </span>
            <span className="w-16 truncate text-center text-xs text-ink-200 group-hover:text-white">
              {name}
            </span>
          </button>
        );
      })}

      {/* Hidden picker — `display:none`, so it claims no flex slot. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onPick}
        aria-label="Add story photo or video"
      />

      {/* Full-screen viewer — auto progress bars + fast exit (X / Escape).
          Portals to <body>, so it never becomes a flex item here. */}
      {openIndex !== null && stories[openIndex] ? (
        <StoryViewer
          stories={stories}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          onReact={applyReaction}
        />
      ) : null}
    </>
  );
}

