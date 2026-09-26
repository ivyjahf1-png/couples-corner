"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, Video } from "lucide-react";
import { publishMomentAction, claimTaskAction } from "@/lib/actions/tasks";
import { PageLock } from "@/components/app/PageHeader";

// Client-side cap. MUST stay in step with two server-side limits, or the user
// gets a confusing failure instead of a clear one:
//   • MAX_USER_MEDIA_BYTES in lib/utils/media-upload.ts (250 MB)
//   • experimental.serverActions.bodySizeLimit in next.config.ts
// The whole File is sent as the Server Action request body, so Next.js rejects
// anything over its bodySizeLimit BEFORE our code runs. That was the real cause
// of "Could not publish your moment" on video: a 12 MB clip passed this check
// but was refused by the 10mb body limit, and the action never executed.
const MAX_BYTES = 250 * 1024 * 1024;

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

  const isVideo = file?.type.startsWith("video/") ?? false;
  const ready = Boolean(file) && content.trim().length > 0 && file!.size <= MAX_BYTES;

  async function publish() {
    if (!file || !ready) return;
    setBusy(true);
    setError(null);
    const result = await publishMomentAction({ file, content, taskSlug: "upload-moment" });
    setBusy(false);
    // Keep the underlying reason visible. The action already returns specific
    // messages ("Upload failed: ...", "Supabase not configured", the size/type
    // validation text); the generic fallback was hiding the one thing that
    // explains WHY a video failed to publish.
    if (!result.ok) {
      setError(result.error ?? "Could not publish your moment. Please try a smaller file or another format.");
      return;
    }
    setDone(true);
    // Task is now unlockable; try to claim its reward automatically.
    const claim = await claimTaskAction("upload-moment");
    if (claim.ok) {
      setReward(`+${claim.rewardCoins} coins added to your wallet`);
      router.refresh();
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

          {/* Publishing is FREE. There is no coin check anywhere in this path —
              publishMoment() and uploadUserMediaAction() never touch the wallet;
              the only coin movement is the optional task-reward PAYOUT claimed
              above. The old "(+400 coins)" label wrongly implied a charge.

              `shrink-0` keeps the button at its natural height instead of being
              squeezed by the flex parent, so it is always the last fully visible
              row of the form. */}
          <button
            type="button"
            onClick={publish}
            disabled={!ready || busy}
            className="w-full shrink-0 rounded-2xl bg-orange-500 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-400 disabled:opacity-50"
          >
            {busy ? "Publishing..." : "Publish moment — Free"}
          </button>
        </div>
      )}
    </PageLock>
  );
}