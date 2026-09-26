"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, Video } from "lucide-react";
import { publishMomentAction, claimTaskAction } from "@/lib/actions/tasks";
import { uploadMediaDirect } from "@/lib/utils/direct-upload";
import { getSupabaseClient } from "@/lib/supabase/client";
import { PageLock } from "@/components/app/PageHeader";

/**
 * Per-file cap. Matches MAX_USER_MEDIA_BYTES in lib/utils/media-upload.ts,
 * which is what actually enforces the limit server-side via validateMediaFile.
 *
 * This is NO LONGER coupled to a Server Action body limit. The file used to be
 * sent as the action request body, where Vercel's 4.5 MB platform cap killed
 * any larger upload before the action ran. The bytes now go browser ->
 * Supabase Storage directly, so this cap only has to agree with the app's own
 * per-file limit.
 */
const MAX_BYTES = 250 * 1024 * 1024;

/**
 * HANG GUARD.
 *
 * The upload is a single Server Action call carrying the whole File as the
 * request body. If the socket stalls (mobile handover, proxy timeout, a
 * half-open connection) the promise simply never settles — `await` blocks
 * forever, `busy` stays true, and the button reads "Publishing..." with no way
 * out. The action's own try/catch cannot help: it only runs if the request
 * ARRIVES, so a stalled transfer never reaches it.
 *
 * So the deadline has to live on the CLIENT, racing the action.
 *
 * TIMING: the budget is scaled by file size rather than being a flat 30s. A
 * flat 30s would abort perfectly healthy uploads — a 100 MB clip on a typical
 * mobile uplink needs minutes, and killing it would report a bogus "timed out"
 * for a transfer that was going to succeed. Instead we allow a floor of 30s
 * plus a throughput term, and generously more for large files. The floor still
 * catches the real failure mode (a genuinely stuck connection) within a minute.
 */
const UPLOAD_FLOOR_MS = 30_000;
const UPLOAD_BYTES_PER_MS = 2_000; // ~2 MB/s sustained, deliberately pessimistic

function uploadTimeoutMs(size: number): number {
  return UPLOAD_FLOOR_MS + Math.ceil(size / UPLOAD_BYTES_PER_MS);
}

/**
 * Reject if `promise` has not settled within `ms`.
 *
 * Scoped to the STORAGE UPLOAD only, never the publish step. The publish action
 * is a small JSON call, so its own server-side errors are the honest signal and
 * wrapping it would only trade a useful message for a timeout.
 *
 * Note this abandons the wait, it does not cancel the upload: the browser's
 * request to storage keeps running. The member gets their button back
 * immediately, which is the point. If the upload later completes it leaves an
 * orphaned storage object at worst — never a duplicate moment — because the
 * publish step only runs after the upload has resolved.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

export default function UploadMomentPage() {
  return <MomentUploadForm />;
}

export function MomentUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState<string | null>(null);
  // Upload phase label and byte progress. The upload now runs browser ->
  // storage, so real progress is available (XHR exposes transferred bytes) and
  // worth showing: on a 100 MB clip the member previously saw an indeterminate
  // "Publishing..." with no idea whether anything was happening.
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  const isVideo = file?.type.startsWith("video/") ?? false;
  const ready = Boolean(file) && content.trim().length > 0 && file!.size <= MAX_BYTES;

  async function publish() {
    if (!file || !ready || busy) return;
    setBusy(true);
    setError(null);
    setProgress(0);

    // Everything below is guarded: `finally` always clears `busy`, so no path
    // — success, handled error, thrown error, or timeout — can leave the
    // button stuck on "Publishing...".
    try {
      // The uid comes from the live Supabase session, never from a prop or
      // form field: the storage path is namespaced by it and the storage RLS
      // policy checks it, so a forged uid would write into someone else's
      // folder. The server independently re-checks ownership before publishing.
      const { data: auth } = await getSupabaseClient().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setError("Please sign in again to publish.");
        return;
      }

      // STEP 1 — bytes go straight to storage, bypassing Vercel entirely.
      setStatus("Uploading...");
      const budgetMs = uploadTimeoutMs(file.size);
      const uploaded = await withTimeout(
        uploadMediaDirect(uid, file, setProgress),
        budgetMs,
        `Upload timed out after ${Math.round(budgetMs / 1000)}s. Check your connection and try a smaller file.`
      );
      if (!uploaded.ok) {
        setStatus("");
        setError(uploaded.error);
        return;
      }

      // STEP 2 — a few hundred bytes cross the Server Action boundary. This
      // cannot hit the 4.5 MB platform cap that broke the old single-step flow.
      setStatus("Publishing...");
      const result = await publishMomentAction({
        storagePath: uploaded.storagePath,
        content,
        mediaType: uploaded.mediaType,
        taskSlug: "upload-moment",
      });
      setStatus("");

      if (!result.ok) {
        setError(result.error ?? "Could not publish your moment. Please try again.");
        return;
      }
      setDone(true);
      // Task is now unlockable; try to claim its reward automatically.
      const claim = await claimTaskAction("upload-moment");
      if (claim.ok) {
        setReward(`+${claim.rewardCoins} coins added to your wallet`);
        router.refresh();
      }
    } catch (caught) {
      setStatus("");
      // A stalled socket throws out of withTimeout; a network failure rejects
      // the upload. Both land here and re-enable the button.
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not publish your moment. Please check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageLock
      // Rigid viewport container. PageLock's body is the only scroll region, so
      // without this the form grew past 100dvh and the Publish button ended up
      // behind the fixed bottom tab nav. h-[100dvh] + overflow-hidden pins the
      // whole form to one screen; the short head block stays put and the body
      // scrolls internally instead of the page.
      className="mx-auto h-[100dvh] w-full max-w-xl overflow-hidden"
      bodyClassName="flex flex-col gap-4 pb-4"
      head={
        <div>
          <h1 className="text-lg font-bold tracking-wide text-white sm:text-xl">Upload a Moment</h1>
          <p className="mt-0.5 text-xs text-ink-300 sm:text-sm">
            Share a photo or short video. It appears on the home feed for everyone.
          </p>
        </div>
      }
    >

      {done ? (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <CheckCircle2 className="h-5 w-5" /> Your moment is live.
          </p>
          {reward ? <p className="text-xs text-emerald-100/80">{reward}</p> : null}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="self-start rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
          >
            Back to Task Center
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full shrink-0 flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-indigo-500/40 bg-indigo-950/40 p-4 text-center transition hover:border-orange-400/50 hover:bg-indigo-950/60"
          >
            {file ? (
              isVideo ? (
                <Video className="h-7 w-7 text-orange-300" />
              ) : (
                <ImagePlus className="h-7 w-7 text-orange-300" />
              )
            ) : (
              <ImagePlus className="h-7 w-7 text-indigo-300" />
            )}
            <span className="max-w-full truncate text-sm font-semibold text-white">
              {file ? file.name : "Choose a photo or short video"}
            </span>
            <span className="text-[11px] text-ink-400">Up to 250 MB. Free — no coins required. JPG, PNG, WEBP, MP4 or MOV.</span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              setError(null);
            }}
            aria-label="Choose moment photo or video"
          />

          <label htmlFor="moment-description" className="text-sm font-medium text-white">
            Describe your moment
          </label>
          {/* Fixed compact height (h-20) instead of rows={5}. The old textarea
              grew to ~200px on its own and, combined with the tall file picker,
              pushed the Publish button past the fold and behind the bottom nav.
              `resize-none` stops a user drag from re-breaking that layout. */}
          <textarea
            id="moment-description"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={3}
            maxLength={2200}
            placeholder="Tell everyone what this moment is about..."
            className="h-20 w-full resize-none rounded-2xl border border-indigo-500/25 bg-indigo-950/50 p-3 text-sm text-white placeholder:text-ink-400 focus:border-orange-400/50 focus:outline-none"
          />
          <p className="-mt-1 text-[11px] text-ink-400">{content.length}/2200</p>

          {error ? <p role="alert" className="text-xs text-danger-300">{error}</p> : null}

          {/* Real transfer progress. Only rendered while uploading (progress < 100
              or still uploading), so it never lingers after a failed attempt. */}
          {busy && status ? (
            <div className="flex flex-col gap-1.5" aria-live="polite">
              <div className="flex items-center justify-between text-[11px] text-ink-300">
                <span>{status}</span>
                {status.startsWith("Uploading") && progress > 0 ? (
                  <span aria-hidden>{progress}%</span>
                ) : null}
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
                className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-orange-500 transition-[width] duration-200"
                  style={{ width: `${status.startsWith("Uploading") ? progress : 100}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Publishing is FREE. There is no coin check anywhere in this path —
              publishMomentFromStorage() never touches the wallet; the only coin
              movement is the optional task-reward PAYOUT claimed above. The old
              "(+400 coins)" label wrongly implied a charge.

              `shrink-0` keeps the button at its natural height instead of being
              squeezed by the flex parent, so it is always the last fully visible
              row of the form. */}
          <button
            type="button"
            onClick={publish}
            disabled={!ready || busy}
            className="w-full shrink-0 rounded-2xl bg-orange-500 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-400 disabled:opacity-50"
          >
            {busy ? (status || "Publishing...") : "Publish moment — Free"}
          </button>
        </div>
      )}
    </PageLock>
  );
}