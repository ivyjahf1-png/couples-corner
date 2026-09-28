"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import {
  CHROME_FADE,
  FlipIcon,
  GiftIcon,
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "./RealtimeIcons";
import { useAutoHideControls } from "@/lib/hooks/useAutoHideControls";
import { useWebRTCCall, type CallStatus } from "@/lib/hooks/useWebRTCCall";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

/** The quick-gift strip offered mid-call. */
const QUICK_GIFTS = [
  { emoji: "🌹", label: "Sent a rose" },
  { emoji: "💋", label: "Sent a kiss" },
  { emoji: "🎉", label: "Sent confetti" },
  { emoji: "💎", label: "Sent a diamond" },
] as const;

interface CallScreenProps {
  mode: "audio" | "video";
  summary: ConversationParticipantSummary | null;
  conversationId: string;
  currentUserId: string;
  onClose: () => void;
}

/** Human-readable copy for each connection state. */
const STATUS_COPY: Record<CallStatus, string> = {
  idle: "Preparing",
  "requesting-media": "Starting…",
  ringing: "Ringing…",
  connecting: "Connecting…",
  connected: "Connected",
  ended: "Call ended",
  "permission-denied": "Camera or microphone blocked",
  failed: "Couldn't connect",
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Full-screen 1-on-1 voice/video call surface.
 *
 * This deliberately renders OUTSIDE the app shell. It is mounted on its own
 * route with the sidebar, top bar and bottom tab bar suppressed, because a call
 * that renders inside normal navigation gives the user somewhere to wander off
 * to mid-conversation ” the most common complaint about in-app calling. The
 * only exits are the end-call button and the browser back gesture.
 *
 * The controls are semi-transparent pills that auto-hide (see
 * `useAutoHideControls`) so the other person fills the whole screen. They come
 * back on any pointer or key activity.
 *
 * `object-cover` (not `contain`) on the remote video: a portrait phone held
 * upright against a 16:9 screen letterboxes into a small strip with black bars
 * either side. Covering crops instead, which is what every native call UI does
 * and what keeps the face large.
 */
export function CallScreen({
  mode,
  summary,
  conversationId,
  currentUserId,
  onClose,
}: CallScreenProps) {
  const router = useRouter();
  const call = useWebRTCCall({
    mode,
    // Both members derive the same channel name from the conversation id, so
    // they land in the same room without exchanging anything first.
    channelName: `call:${conversationId}`,
    selfId: currentUserId,
    peerId: summary?.id ?? null,
  });
  const { visible, reveal } = useAutoHideControls({ enabled: true });

  const [giftSent, setGiftSent] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);

  // Leave the camera behind if the component unmounts by any route other than
  // the end-call button (a back gesture, a navigation, a lost session).
  useEffect(() => () => call.stop(), [call.stop]);

  const peerName = summary?.name ?? "Chat";
  const avatarSrc = summary?.avatarUrl ?? summary?.photos?.[0]?.publicUrl ?? null;
  const isVideo = mode === "video";

  /**
   * End the call and leave. `call.stop()` runs first so the camera light goes
   * out immediately rather than after the route transition settles ” a user
   * who taps the red button expects the recording indicator to die at once.
   */
  const hangUp = () => {
    call.stop();
    onClose();
    router.back();
  };

  const sendQuickGift = (gift: (typeof QUICK_GIFTS)[number]) => {
    setGiftSent(`${gift.emoji} ${gift.label}`);
    setGiftOpen(false);
    // Auto-clear so the confirmation never lingers over the picture.
    window.setTimeout(() => setGiftSent(null), 2600);
  };

  /** Shared pill styling; the active state inverts to a warning colour. */
  const pill = (active: boolean, danger = false) =>
    [
      "flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-md transition",
      "duration-200 active:scale-95",
      active
        ? danger
          ? "bg-danger-500 text-white shadow-lg shadow-danger-500/30"
          : "bg-white text-slate-900 shadow-lg"
        : "bg-white/15 text-white hover:bg-white/25",
    ].join(" ");

  return (
    // `h-[100dvh]` + `overflow-hidden`, and above the nav bar's z-50 so the
    // shell chrome can never overlap the video.
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 text-white">
      {/* Remote video fills the screen; the avatar is the fallback shown
          underneath it before the first frame arrives. */}
      <div className="absolute inset-0">
        <video
          ref={call.remoteRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
          aria-label={`${peerName}'s video`}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/90">
          <div className="flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <Avatar src={avatarSrc} name={peerName} kind={summary?.kind} size="xl" />
          </div>
        </div>
      </div>

      {/* Top bar: name + status. Fades with the controls. */}
      <div
        className={[
          "pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-slate-950/80 to-transparent px-4 pb-8",
          "pt-[max(0.75rem,env(safe-area-inset-top))]",
          CHROME_FADE,
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <p className="text-xs uppercase tracking-widest text-purple-300">
          {isVideo ? "Video" : "Voice"} call
        </p>
        <h1 className="truncate text-lg font-semibold">{peerName}</h1>
        <p className="text-sm text-slate-300">
          {call.status === "connected" ? formatDuration(call.elapsed) : STATUS_COPY[call.status]}
        </p>
      </div>

      {/* Local preview, bottom-right. Hidden on an audio call ” there is no
          picture to preview, so the slot would just be a black rectangle. */}
      {isVideo ? (
        <div
          className={[
            "absolute right-4 z-20 h-40 w-28 overflow-hidden rounded-2xl border border-white/20",
            "bg-slate-800 shadow-2xl sm:h-52 sm:w-36",
            "bottom-[max(7rem,calc(env(safe-area-inset-bottom)+6rem))]",
            CHROME_FADE,
            // The preview stays faintly visible when the chrome fades, so the
            // user can always see whether their own camera is on.
            visible ? "opacity-100" : "opacity-70",
          ].join(" ")}
        >
          <video
            ref={call.localRef}
            muted
            autoPlay
            playsInline
            // Mirror the self-view: people expect to see themselves as a
            // mirror does. Un-mirrored after a camera flip, when the preview
            // is showing whatever the lens is actually pointed at.
            className={`h-full w-full object-cover ${call.mirrored ? "scale-x-[-1]" : ""}`}
            aria-label="Your camera preview"
          />
          {call.cameraOff ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
              <Avatar name="You" size="lg" />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Gift confirmation ” auto-clears, sits clear of the control bar. */}
      {giftSent ? (
        <div className="pointer-events-none absolute inset-x-0 z-30 flex justify-center">
          <p
            className={[
              "mt-24 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-md",
              CHROME_FADE,
              visible ? "opacity-100" : "opacity-0",
            ].join(" ")}
            role="status"
          >
            {giftSent}
          </p>
        </div>
      ) : null}

      {/* Minimalist pill controls. `pointer-events-none` on the wrapper so a
          stray tap in the empty space between pills falls through to the
          video; the pills themselves re-enable it. */}

      {/* Minimalist pill controls. `pointer-events-none` on the wrapper so a
          stray tap in the empty space between pills falls through to the
          video; the pills themselves re-enable it. */}
      <div
        className={[
          "pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3",
          "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          CHROME_FADE,
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {giftOpen ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur-md">
            {QUICK_GIFTS.map((gift) => (
              <button
                key={gift.label}
                type="button"
                onClick={() => sendQuickGift(gift)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/25"
                aria-label={gift.label}
              >
                {gift.emoji}
              </button>
            ))}
          </div>
        ) : null}

        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={call.toggleMic}
            aria-label={call.muted ? "Unmute microphone" : "Mute microphone"}
            aria-pressed={call.muted}
            className={pill(call.muted, true)}
          >
            {call.muted ? <MicOffIcon className="h-6 w-6" /> : <MicIcon className="h-6 w-6" />}
          </button>

          {isVideo ? (
            <>
              <button
                type="button"
                onClick={call.toggleCamera}
                aria-label={call.cameraOff ? "Turn camera on" : "Turn camera off"}
                aria-pressed={call.cameraOff}
                className={pill(call.cameraOff, true)}
              >
                {call.cameraOff ? (
                  <VideoOffIcon className="h-6 w-6" />
                ) : (
                  <VideoIcon className="h-6 w-6" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void call.flipCamera()}
                aria-label="Flip camera"
                className={pill(false)}
              >
                <FlipIcon className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setGiftOpen((open) => !open);
              reveal();
            }}
            aria-label="Send a quick gift"
            aria-expanded={giftOpen}
            className={pill(giftOpen)}
          >
            <GiftIcon className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={hangUp}
            aria-label="End call"
            className="flex h-14 w-20 items-center justify-center rounded-full bg-danger-500 text-white shadow-lg shadow-danger-500/30 transition active:scale-95"
          >
            <PhoneOffIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Full-surface tap target: the controls are hidden most of the time, so
          tapping anywhere in the empty middle brings them back. */}
      <button
        type="button"
        onClick={reveal}
        aria-label="Show call controls"
        className="absolute inset-0 z-10 cursor-default"
        tabIndex={-1}
      />
    </div>
  );
}
