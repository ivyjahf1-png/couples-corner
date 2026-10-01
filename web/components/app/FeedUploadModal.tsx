"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createFeedPostAction } from "@/lib/actions/profile";
import { uploadMediaDirect } from "@/lib/utils/direct-upload";
import { getSupabaseClient } from "@/lib/supabase/client";
import { SHEET_SHELL, SHEET_PANEL_RELATIVE } from "@/components/ui/layers";

/**
 * Human file size for the picker label.
 *
 * The server caps uploads and reports a megabyte limit as a rejection, so showing
 * the size BEFORE publishing lets a member see they picked an oversized photo and
 * skip the round trip. Binary units, because that is what phone cameras and every
 * other file manager report.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "Create a post" — PHOTOS AND TEXT ONLY.
 *
 * This sheet previously offered an upload/link tab pair plus a Go Live link, and
 * all three non-photo paths have been removed. See the note above the picker for
 * why, including why dropping `video/*` loses no capability (short video is the
 * Moment screen's job).
 *
 * Consequently the `mode` state, the link URL, `parseVideoEmbedUrl` and
 * `publishLinkMomentAction` are all gone rather than left as dead branches. The
 * link path is still reachable from the Moment screen, so nothing is orphaned.
 */
export function FeedUploadModal({ onClose, userId }: { onClose: () => void; userId?: string }) {
  // `useId` rather than a literal: the `<label htmlFor>` and the input's `id` must
  // match, and two modals must never collide on one id in the DOM.
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Upload progress, split into phases.

     This modal used to call `uploadMediaDirect(uid, file)` with no
     `onProgress`, so a 4MB photo on mobile data was several seconds of a
     button reading "Publishing…" with nothing moving. On a stalled connection
     that is indistinguishable from a crash, and it invites a second tap.

     Two phases, not one percentage, because the two steps are different work and
     a member should know which one they are waiting on:
       • `uploading` — the BYTES going to Supabase Storage. The slow part.
       • `saving`    — the two tiny database writes after it. Near-instant.

     The label changes with the phase for the same reason `ProfilePhotoUploader`
     does — a stuck number tells a member nothing about whether it is working. */
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [uploadPercent, setUploadPercent] = useState(0);

  async function publish() {
    if (!userId) { setError("Sign in to publish a post."); return; }
    setPublishing(true); setError(null);
    setPhase("uploading"); setUploadPercent(0);
    try {
      /* A caption is OPTIONAL for an uploaded photo, and that is what "upload a photo
         directly into the feed" has to mean in practice.

         The gate used to require `caption.trim()`, while the server
         (`createFeedPostAction`) explicitly allows an empty body when media is
         present — "Add a caption or media before publishing". So the form was
         disabling its own Publish button for a post the server would happily
         accept: a member could pick a photo, see a live Publish button that could
         never be pressed, and have no idea why. Typing a caption became a
         pointless gatekeeping step on the one action they wanted. */
      if (!file) return;
      // Two steps: the bytes go straight to storage, then two tiny actions write
      // the gallery row and the post. This used to be a single Server Action
      // carrying the whole File, which Vercel rejects above 4.5 MB before the
      // action runs — the same E394 failure that broke moment uploads.
      const { data: auth } = await getSupabaseClient().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setError("Please sign in again."); return; }

      const uploaded = await uploadMediaDirect(uid, file, setUploadPercent);
      if (!uploaded.ok) { setError(uploaded.error); return; }

      // Bytes are up. What remains is the post row itself — a distinct phase so a
      // member watching the bar can see it reached 100% and the sheet did not
      // simply stall there.
      setPhase("saving");

      /* THE PROFILE GALLERY IS NOT TOUCHED FROM HERE. Not a bug in the past, a
         requirement now.

         This modal used to call `recordUserMediaAction` as well, which appended a
         row to `user_media` — the member's personal gallery. It was there only to
         get a `publicUrl` back, because `uploadMediaDirect` did not return one,
         and it had the side effect of every photo posted to the public feed also
         appearing in their own profile grid. Posting a sunset to the feed is not
         a statement about who you are, and it silently became one.

         `uploadMediaDirect` now returns `publicUrl` directly (getPublicUrl is
         pure string construction, no network call), so the gallery write was
         pure overhead and is gone. The two surfaces are now genuinely separate:

           • Moment feed  -> `posts`,                public, feed-visible.
           • Me / Profile -> `user_media` via the profile uploader, unchanged.

         The profile path still calls `recordUserMediaAction` and is untouched. */
      const created = await createFeedPostAction(uid, caption.trim(), [uploaded.publicUrl]);
      if (!created.ok) { setError(created.error ?? "Could not publish post."); return; }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish your post.");
    } finally {
      setPublishing(false);
      // Reset the phase so a re-pick after a failure starts from "Uploading 0%"
      // rather than showing a stale 100% bar over an error.
      setPhase("idle");
    }
  }

  // Only a photo is required. See the caption note above.
  const canPublish = Boolean(file && !publishing);

  return (
    <div className={`${SHEET_SHELL} bg-slate-950/80 backdrop-blur-sm sm:p-4`} role="dialog" aria-modal="true" aria-label="Create a post">
      <div className={`${SHEET_PANEL_RELATIVE} w-full max-w-lg rounded-t-3xl border border-white/15 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl`}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">Create a post</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10" aria-label="Close">×</button></div>

        {/* ── PHOTOS AND TEXT ONLY ───────────────────────────────────────────────
            This sheet used to offer three things: an "Upload a file" / "Paste a
            video link" tab pair, plus a full-width "Go Live" row that navigated
            away to /live.

            All three are gone. The sheet is now exactly one job — attach a photo
            and optionally write a caption.

            Why the tab pair went: with one input left there is nothing to choose
            between, and a tablist offering a single tab is pure ceremony. Why Go
            Live went: it is not a mode of THIS form — it leaves the sheet for a
            completely different surface. Putting it here implied choosing it
            would swap the inputs below, which it never did.

            Short video was already available through the Moment screen, which is
            the product's designated video surface, so removing `video/*` here
            loses nothing rather than removing a capability.

            `accept="image/*"` alone (below) is what makes the OS picker offer the
            photo library and camera. Adding `video/*` would let a member attach a
            video to a POST, which is not what a post is. */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          maxLength={2200}
          placeholder="Say something about your photo…"
          className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none focus:border-amber-300/60"
        />

        {
          /* ── THE PICKER ──────────────────────────────────────────────────────
               The whole click-to-open story lives here, and it is the part that
               was reported unresponsive. Three things make it work on a phone:

               1. THE INPUT IS `sr-only`, NOT `hidden`. `hidden` is `display:none`,
                  and Safari will not open the file picker for an input that was
                  never rendered. `sr-only` clips it to 1px while keeping it in
                  the DOM and focusable. This was the original cause of the dead
                  dropzone and is the thing most likely to regress.

               2. THE VISIBLE CONTROL IS A `<label htmlFor>`, not a button with
                  an onClick calling `inputRef.current.click()`. On iOS a
                  programmatic `.click()` only opens the picker when it follows a
                  genuine user gesture on an on-screen control; a synthetic click
                  from a detached element is silently dropped. A label activation
                  IS a real gesture, which is why this works where `.click()` did
                  not. Note `inputRef` is no longer needed for this reason — the
                  label is the mechanism.

               3. THE INPUT IS NOT WRAPPED IN SOMETHING THAT SWALLOWS THE TAP.
               It is a direct sibling of the label, with no overlay on top.

               `capture` is deliberately ABSENT: it forces the camera and removes
               the photo library, so a member wanting to post an existing photo
               could no longer reach one. `accept="image/*"` alone is what makes
               iOS offer BOTH the library and the camera.

               Videos are gone from this sheet by request. `accept="image/*"` is
               not a copy of `image/*,video/*`: it restricts the picker to photos,
               so a member cannot attach a video to a post. Short video belongs
               on the Moment screen. */}
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
              // Clear the native input so re-picking the SAME file fires `change`
              // again. Without this, choosing a photo, then replacing it with the
              // same photo, silently does nothing — the value never changed so
              // the browser suppressed the event.
              e.target.value = "";
            }}
          />
          <label
            htmlFor={inputId}
            className="mt-3 flex min-h-[6rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 px-4 py-6 text-center transition hover:border-amber-300/60 hover:bg-white/[0.03] focus-within:border-amber-300/60"
          >
            {file ? (
              <>
                <span className="max-w-full truncate text-sm font-semibold text-amber-200">
                  {file.name}
                </span>
                <span className="text-xs text-white/50">
                  {formatBytes(file.size)} · tap to choose a different photo
                </span>
              </>
            ) : (
              <>
                <span className="text-base font-semibold text-white">+ Add a photo</span>
                <span className="text-xs text-white/50">
                  Choose from your library or take a new one
                </span>
              </>
            )}
          </label>

        {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}

        {/* Upload progress. A real <progress> element rather than a styled div:
            it is announced by screen readers and carries the value natively, so
            the number and the visual cannot disagree. Same element, and same
            reason, as ProfilePhotoUploader. */}
        {publishing ? (
          <div className="mt-3" role="status" aria-live="polite">
            <progress
              max={100}
              value={phase === "saving" ? 100 : uploadPercent}
              aria-label="Photo upload progress"
              className="w-full"
            />
            <p className="mt-1 text-xs text-white/60">
              {phase === "saving" ? "Saving your post…" : `Uploading ${uploadPercent}%`}
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          {/* Cancel is disabled mid-publish deliberately. `uploadMediaDirect` holds
              the bytes in flight and exposes no abort handle, so closing the sheet
              would leave an orphaned upload with nowhere to report a failure. */}
          <Button variant="secondary" onClick={onClose} disabled={publishing}>
            Cancel
          </Button>
          <Button
            disabled={!userId || !canPublish}
            onClick={publish}
          >
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

