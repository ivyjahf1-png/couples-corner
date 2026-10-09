"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  Share2,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { publishMomentAction } from "@/lib/actions/tasks";
import { openProfileView } from "@/components/profile/ProfileViewModal";
import { uploadMediaDirect } from "@/lib/utils/direct-upload";
import { validateMediaFile } from "@/lib/utils/media-upload";
import { deleteUserMediaAction } from "@/lib/actions/profile";

/** Media kinds this player knows how to render. Mirrors `MomentMediaType`
    from `lib/moments.ts` (the server view model) as a local union so the
    demo card can carry the field without importing server-shaped types. */
export type MomentMediaKind = "image" | "video" | "link";

/** The subset of a moment this self-contained player needs to render. */
export interface MomentData {
  id: string;
  authorName: string;
  timeAgo: string;
  mediaUrl: string;
  /**
   * What `mediaUrl` points at. Optional for hand-written callers (a file
   * extension fallback covers them), but ALWAYS supplied by `/moments`: a
   * video uploaded through the Task Center must reach this card as "video"
   * or it would render as a broken <img> — the "my upload is missing" bug.
   */
  mediaType?: MomentMediaKind;
  /** Portrait for the author pill; falls back to initials when absent. */
  avatarUrl?: string;
  /**
   * The AUTHOR'S USER ID — opens the global profile view modal when the pill
   * is tapped. Optional because the built-in demo moment and hand-written
   * callers have no real member behind them; when absent the tap falls back to
   * the card's `onOpenProfile` callback (or does nothing), rather than opening
   * a modal that has nothing to fetch.
   */
  authorId?: string;
  location?: string;
  likesCount?: number;
  isVerified?: boolean;
}

interface MomentViewerCardProps {
  /** Overrides the built-in demo moment when provided. */
  moment?: MomentData;
  /** Signed-in uid for direct-to-storage uploads; supplied by `/moments`. */
  uploadingTo?: string;
  onOpenProfile?: () => void;
}

/** Demo moment so the screen always has something to play. */
const DEMO_MOMENT: MomentData = {
  id: "1",
  authorName: "Gbaski",
  timeAgo: "5d",
  mediaUrl:
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800",
  mediaType: "image",
  avatarUrl:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
  location: "Discover Nearby, Austin, TX",
  likesCount: 1,
  isVerified: true,
};

/**
 * MomentViewerCard — the single-moment player rendered by `/moments`.
 *
 * Deliberately self-contained: likes, the Connect toggle and the comment draft
 * all live in local state, so the view always renders even when there is no
 * backend moment to fetch. Pass the `moment` prop to override the demo card.
 */
export function MomentViewerCard({
  moment = DEMO_MOMENT,
  uploadingTo,
  onOpenProfile,
}: MomentViewerCardProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(moment.likesCount ?? 1);
  const [comment, setComment] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);

  /* UPLOAD FLOW — a staged pick plus its description, the byte transfer, and
     the overlay's result surface (error/success both keep the overlay up so
     they are actually readable — hiding the overlay on `isUploading === false`
     alone would swallow every message). */
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [caption, setCaption] = useState("");

  const commentInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  /* Whether the media surface is mostly on screen. Starts TRUE: the card IS
     the screen on mount, and an observer that never fires (older engines,
     server render) must not leave playback stuck off. */
  const [inView, setInView] = useState(true);

  // ── top-right 3-dot menu ─────────────────────────────────────────────
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // ── right-side action rail buttons ───────────────────────────────────
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);

  /* SCROLL → VISIBILITY, feeding the play/pause driver below. The observer
     watches the media surface, so whenever this card sits inside anything
     that scrolls — the shell's page scroll, a future multi-moment reel —
     only the ACTIVE moment is allowed to play, and it pauses the moment it
     slips mostly out of view. Created once on mount: the observed target
     never changes for the life of the card. */
  useEffect(() => {
    const el = mediaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) =>
        setInView(entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)),
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* THE PLAY/PAUSE DRIVER — the "active video ref" of the requirements. Runs
     on mount, whenever the moment CHANGES (a new id/src remounts the
     <video> through its `key`, so this effect is what starts the new clip),
     and whenever `inView` flips. `.muted` is re-asserted as a PROPERTY
     because some mobile engines decide audibility from the property set at
     load time and ignore React's attribute alone — and muted autoplay is the
     only autoplay browsers permit without a gesture, which is also why the
     element carries `autoPlay muted` explicitly. play() is fire-and-forget:
     a rejection IS the autoplay policy saying no, and the visible state
     already reflects that. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (inView) void video.play().catch(() => undefined);
    else video.pause();
  }, [inView, moment.id, moment.mediaUrl]);

  /** Dismiss the upload overlay and reset every piece of its state. */
  function cancelUpload() {
    setIsUploading(false);
    setUploadError(null);
    setUploadSuccess(null);
    setSelectedFile(null);
    setUploadProgress(0);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /** Open the OS file picker with a clean slate (what the `+` rail button calls). */
  function browse() {
    cancelUpload();
    fileInputRef.current?.click();
  }

  /**
   * Step 1 of the picker flow: validate and STAGE the file for review.
   *
   * The native input's value is cleared immediately so re-picking the SAME
   * file fires `change` again — otherwise the second attempt is a silent no-op.
   */
  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateMediaFile({ size: file.size, type: file.type });
    if (validationError) {
      // Deliberately NOT staged: retrying an invalid file can only fail again,
      // so the overlay offers "Choose file" instead of a Publish button.
      setSelectedFile(null);
      setUploadError(validationError);
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setSelectedFile(file);
    setUploadProgress(0);
  }

  /**
   * Step 2: bytes browser -> Supabase Storage (`uploadMediaDirect`), then the
   * small JSON publish (`publishMomentAction`). Never sends the File itself to
   * the server — see the header of lib/actions/tasks.ts for the 413 that
   * approach provokes on Vercel.
   *
   * The description is required: `publishMomentFromStorage` rejects empty
   * content with "Add a description to your moment.", so Publish stays
   * disabled until `caption` holds real text.
   */
  async function confirmUpload() {
    const file = selectedFile;
    const text = caption.trim();
    if (!file || isUploading || !text) return;

    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(0);
    setIsUploading(true);

    const result = await uploadMediaDirect(uploadingTo ?? "", file, (p) =>
      setUploadProgress(p)
    );
    if (!result.ok) {
      // The staged file and caption are kept, so the member can retry.
      setUploadError(result.error);
      setIsUploading(false);
      return;
    }

    const publish = await publishMomentAction({
      storagePath: result.storagePath,
      content: text,
      mediaType: result.mediaType,
    });
    if (!publish.ok) {
      setUploadError(publish.error ?? "Publish failed");
      setIsUploading(false);
      return;
    }

    setUploadSuccess("Video published!");
    setSelectedFile(null);
    setCaption("");
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Surface the new moment immediately: `/moments` is dynamic, so a refresh
    // re-runs getRecentMoments and the card remounts on the just-published row.
    router.refresh();
  }

  /** Local like toggle: flip the heart and move the count with it. */
  function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((count) => Math.max(0, count + (next ? 1 : -1)));
  }

  /** Local-only send: clear the draft once there is something to send. */
  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) return;
    setComment("");
    commentInputRef.current?.focus();
  }


  // ── top-right 3-dot menu ─────────────────────────────────────────────
  function toggleMore() {
    setIsMoreOpen((prev) => !prev);
  }
  function closeMore() {
    setIsMoreOpen(false);
  }

  /** Owner-only delete: the RLS policy and `deleteUserMediaAction` both scope a
   * destroy to the owning member, and this function leaves storage and the row
   * in sync so a refresh can never re-display the deleted clip. */
  async function handleDeleteVideo() {
    if (!moment.id || !moment.authorId || moment.mediaType !== "video" || moment.authorId !== uploadingTo) {
      alert("Only the owner can delete this video.");
      return;
    }
    if (!confirm("Delete this video? This cannot be undone.")) return;
    try {
      const res = await deleteUserMediaAction(moment.id, moment.authorId);
      if (!res.ok) {
        alert(res.error ?? "Could not delete this video.");
        return;
      }
      // The parent re-renders with the moment removed (its id no longer matches
      // the route param); no need to touch storage here — the action did it.
      router.refresh();
    } catch (err) {
      console.error("[moment] delete failed", err);
      alert("Could not delete this video.");
    }
  }


  // ── right-side action rail buttons ───────────────────────────────────
  function toggleAudio() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsAudioMuted((prev) => !prev);
  }

  async function handleShare() {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Moment from Couple's Corner",
          text: 'Check out this moment!',
          url: window.location.href,
        });
      } else {
        // Fallback: copy the URL to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      // User cancelled the share dialog
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  }

  function openShare() {
    setIsShareOpen(true);
  }

  function closeShare() {
    setIsShareOpen(false);
  }

  function openComment() {
    setIsCommentOpen(true);
    requestAnimationFrame(() => commentInputRef.current?.focus());
  }

  function closeComment() {
    setIsCommentOpen(false);
  }

  function toggleComment() {
    if (isCommentOpen) {
      closeComment();
    } else {
      openComment();
    }
  }

  /** Two-letter initials used when the moment carries no avatar image. */
  const initials =
    moment.authorName
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  /* What the media URL points at, for rendering. `mediaType` wins whenever
     the page supplies it (always, from `/moments`); the extension check is
     the fallback for callers that do not, so even a hand-built moment with a
     stray .mp4 gets a <video> instead of a broken <img>. */
  const kind: MomentMediaKind =
    moment.mediaType ??
    (/\.(mp4|m4v|mov|webm|ogv)(\?|#|$)/i.test(moment.mediaUrl) ? "video" : "image");

  /* The overlay is the flow's single surface: it opens for a staged pick,
     stays through the transfer, and remains to report the result. */
  const showUpload =
    isUploading || selectedFile !== null || uploadError !== null || uploadSuccess !== null;

  return (
    /* LOCKED COLUMN: `h-full min-h-0 overflow-hidden` — the card equals the
       region AppMain hands it and never scrolls itself. The old
       `min-h-[600px]` is GONE: it forced the card TALLER than that region on
       any phone shorter than ~700px, so the card's bottom edge — and with it
       the comment bar pinned near it — sat below the fold, hidden behind the
       fixed tab bar. Height now flows from the viewport, not from a guess. */
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-950 text-white">
      {/* HIDDEN FILE INPUT — summoned by the `+` action, never rendered. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/ogg,video/mpeg,video/x-msvideo,video/x-matroska,video/3gpp"
        className="hidden"
        aria-label="Upload a video"
        onChange={handleFileSelected}
      />

      {/* UPLOAD OVERLAY — pick, review, progress and result surface for the
          `+` flow. A backdrop click dismisses; clicks inside the card stop at
          the card, so typing a description cannot close the modal. */}
      {showUpload ? (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={cancelUpload}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <Upload className="h-5 w-6 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Upload a video</h2>
              <button
                type="button"
                onClick={cancelUpload}
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#A09AB0] transition hover:bg-white/10 hover:text-white"
                aria-label="Cancel upload"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {uploadError ? (
              <p role="alert" className="mt-3 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">
                {uploadError}
              </p>
            ) : null}

            {selectedFile ? (
              <div className="mt-3">
                <p className="text-sm text-white/80">
                  <span className="font-semibold text-white">{selectedFile.name}</span>
                  <span className="text-white/50"> · {Math.round(uploadProgress)}%</span>
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-[width] duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {!selectedFile && !uploadError ? (
              <p className="mt-2 text-xs text-white/60">
                Choose a file in MP4, MOV, or WebM (up to 250 MB).
              </p>
            ) : null}

            {uploadSuccess ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            ) : null}

            {/* DESCRIPTION — required, not optional: publishMomentFromStorage
                rejects empty content with "Add a description to your moment.",
                so Publish stays disabled until this holds real text. The
                2200-char server cap is mirrored here as maxLength. */}
            {selectedFile ? (
              <div className="mt-3">
                <label htmlFor="moment-upload-caption" className="sr-only">
                  Add a description
                </label>
                <textarea
                  id="moment-upload-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={isUploading}
                  rows={2}
                  maxLength={2200}
                  placeholder="Add a description to your moment..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none disabled:opacity-60"
                />
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              {isUploading ? (
                /* Only Cancel mid-transfer — a Publish button here would start
                   a second, parallel upload of the same file. */
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="flex flex-1 items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
                >
                  Cancel
                </button>
              ) : selectedFile ? (
                <>
                  <button
                    type="button"
                    onClick={cancelUpload}
                    className="flex flex-1 items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmUpload}
                    disabled={!caption.trim()}
                    className="flex flex-1 items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-40"
                  >
                    Publish
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={browse}
                  className="flex flex-1 items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
                >
                  Choose file
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Main media asset (absolute background fill). `ref` is the
          IntersectionObserver target for the play/pause gate above. */}
      <div ref={mediaRef} className="absolute inset-0 z-0 bg-slate-900">
        {kind === "video" ? (
          <video
            key={moment.id}
            ref={videoRef}
            src={moment.mediaUrl}
            /* EXPLICIT, per the player contract: `autoPlay` starts the clip
               on mount, `muted` is what makes autoplay legal without a
               gesture (also re-asserted as a property in the effect below),
               `loop` matches the reel format, `playsInline` stops iOS Safari
               hijacking the page into fullscreen. The `key` remounts per
               moment so a CHANGING moment restarts cleanly instead of
               reusing a poisoned element. */
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
        ) : kind === "link" ? (
          /* Link moments are validated, allowlisted embed URLs produced
             server-side (lib/utils/video-embed) — never raw member input. */
          <iframe
            key={moment.id}
            src={moment.mediaUrl}
            title="Moment video"
            className="h-full w-full border-0 object-cover"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={moment.mediaUrl}
              alt="Moment media"
              className="h-full w-full object-cover"
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-slate-950/80" />
      </div>

      {/* Top location header */}
      <div className="relative z-30 flex items-center justify-between px-4 pt-4">
        <div className="w-10" />
        {/* Real uploads carry no location, so the pill is omitted rather
            than rendered as an empty chip with a pulsing dot. */}
        {moment.location ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-amber-400"
              aria-hidden="true"
            />
            <span>{moment.location}</span>
          </div>
        ) : null}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white shadow-lg backdrop-blur-md"
          aria-label="More options"
          onClick={toggleMore}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Spacer to push content down */}
      <div className="flex-1" />

      {/* Right-side action rail.
          `bottom-[calc(9rem_+_env(safe-area-inset-bottom,0px))]` lifts the rail
          clear of the bottom stack: 5rem of tab-bar reserve + the ~40px
          comment bar + a gap, scaling with the home-indicator inset. The old
          `bottom-24` assumed the bar sat at the viewport edge, which is no
          longer where the stack lands. */}
      <div className="absolute bottom-[calc(9rem_+_env(safe-area-inset-bottom,0px))] right-4 z-30 flex flex-col items-center gap-3.5">
        <button
          type="button"
          onClick={browse}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur-md transition hover:bg-white/30 active:scale-95"
          aria-label="Add"
        >
          <Plus className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? "Remove your like" : "Like this moment"}
            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-xl backdrop-blur-md transition active:scale-95 ${
              liked
                ? "border-rose-500 bg-rose-500/30 text-rose-400"
                : "border-white/20 bg-black/40 text-white hover:bg-white/30"
            }`}
          >
            <Heart
              className={`h-5 w-5 ${liked ? "fill-rose-500 text-rose-500" : ""}`}
            />
          </button>
          <span className="text-[11px] font-bold tabular-nums text-white drop-shadow">
            {likes}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleComment}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur-md transition hover:bg-white/30 active:scale-95"
          aria-label="Jump to the comment box"
        >
          <MessageCircle className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={openShare}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur-md transition hover:bg-white/30 active:scale-95"
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={toggleAudio}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur-md transition hover:bg-white/30 active:scale-95"
          aria-label={isAudioMuted ? "Unmute" : "Mute"}
        >
          <Volume2 className={`h-5 w-5 ${isAudioMuted ? "" : "text-amber-400"}`} />
        </button>
      </div>

      {/* BOTTOM STACK — author row + comment bar, IN FLOW as the last
          children of the locked column. The bar used to be `absolute
          bottom-2`, pinning it to the CARD's bottom edge — and because the
          card's old `min-h-[600px]` pushed that edge below the fold on
          shorter phones, "Message …" rode under the fixed tab bar or off
          screen entirely. In flow the stack ends exactly at the column's
          content edge, and AppMain's `pb-20` (the scroll container's
          compensating padding for the fixed bottom navigation) reserves the
          bar's height BELOW that edge — so the bar lands ~11px ON TOP of the
          tab bar on every screen height (5rem reserve vs the measured 69px
          bar), with no page scroll available to uncover it. */}
      <div className="relative z-20 flex flex-col gap-3 px-4">
        {/* `self-start`: as a flex-column child the pill would otherwise
            stretch to full width and its rounded-full shape would read as a
            full-bleed strip rather than the compact chip it is. */}
        <div className="flex items-center gap-3 self-start rounded-full border border-white/20 bg-black/50 p-2 pr-4 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              /* THE GLOBAL PROFILE MODAL, with the legacy callback as fallback:
                 real moments carry `authorId` and open the reference-design
                 overlay in place; the demo moment (no uid behind it) still
                 honours a caller-supplied `onOpenProfile` — e.g. the owner
                 previewing their own surface — instead of opening a modal with
                 nothing to fetch. */
              if (moment.authorId) openProfileView(moment.authorId);
              else onOpenProfile?.();
            }}
            className="flex items-center gap-3 text-left"
          >
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/30 bg-slate-800">
              {moment.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={moment.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white/80">
                  {initials}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">
                  {moment.authorName}
                </span>
                {moment.isVerified ? (
                  <CheckCircle2
                    className="h-3.5 w-3.5 fill-emerald-500 text-slate-950"
                    aria-label="Verified"
                  />
                ) : null}
              </div>
              <span className="text-[11px] text-white/70">{moment.timeAgo}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsFollowing((prev) => !prev)}
            aria-pressed={isFollowing}
            className={`ml-2 rounded-full border px-3.5 py-1 text-xs font-semibold transition active:scale-95 ${
              isFollowing
                ? "border-white/30 bg-slate-800 text-white"
                : "border-white/30 bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isFollowing ? "Connected" : "Connect"}
          </button>
        </div>

        {/* Comment bar: LAST child of the stack, so its bottom edge IS the
            stack's bottom edge — the reserved strip that sits on the nav. */}
        <form
          onSubmit={handleSend}
          className="flex items-center rounded-full border border-white/25 bg-black/70 px-4 py-2 shadow-2xl backdrop-blur-xl"
          noValidate
        >
          <label htmlFor="moment-comment" className="sr-only">
            Add a comment
          </label>
          <input
            id="moment-comment"
            ref={commentInputRef}
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Message ${moment.authorName}...`}
            maxLength={500}
            className="w-full bg-transparent text-sm text-white placeholder-white/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!comment.trim()}
            className="p-1 text-amber-400 transition hover:text-amber-300 disabled:opacity-40"
            aria-label="Send comment"
          >
            <Send className="h-5 w-5 rotate-45" />
          </button>
        </form>

      {/* 3-dot menu dropdown — appears at top-right */}
      {isMoreOpen ? (
        <div className="absolute top-12 right-0 z-50 mt-2 w-48 rounded-xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl">
          <div className="py-1">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10"
              onClick={() => {
                handleDeleteVideo();
                closeMore();
              }}
            >
              <Trash2 className="h-4 w-4 text-rose-400" />
              Delete Video
            </button>
          </div>
        </div>
      ) : null}

      {/* Share modal — appears when share button is clicked */}
      {isShareOpen ? (
        <div className="absolute bottom-24 right-4 z-50 w-80 rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl">
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Share this moment</h3>
            <p className="mt-1 text-xs text-white/60">
              Tap to copy the link, or use your system share sheet.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }}
                className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition text-xs font-semibold"
              >
                Copy
              </button>
            </div>
            <button
              type="button"
              onClick={closeShare}
              className="mt-2 w-full text-center text-xs text-white/60 hover:text-white/90 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

    </div>
    </div>
   );
}

