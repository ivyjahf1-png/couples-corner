"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, SwitchCamera, Video, VideoOff } from "lucide-react";

/**
 * VideoCallModal — reusable 1:1 audio/video call surface backed by Agora RTC.
 *
 * PROPS: `channelName` is the shared room id (both peers derive the same
 * string), `uid` this side's numeric id (0 = let Agora assign), `mode`
 * starts the call audio-only or with video, `onEnd` fires when the call
 * finishes or is dismissed so the host can close its own modal/route.
 *
 * LIFECYCLE
 *  1. Fetch a fresh RTC token from POST /api/agora-token (never bundle the
 *     App Certificate in the client — tokens are minted server-side).
 *  2. 503 from that route means "Agora not configured on this deploy" — the
 *     modal reports `unconfigured` and the host should fall back to the
 *     built-in peer-to-peer `CallScreen` (WebRTC over Supabase Realtime),
 *     so calls keep working on deploys that never set Agora keys.
 *  3. `agora-rtc-react` is imported dynamically: the package may not be
 *     installed (the npm registry was unreachable when this was written),
 *     and a static import would fail the production build outright.
 */
export type VideoCallStatus =
  | "loading"
  | "connecting"
  | "connected"
  | "unconfigured"
  | "unavailable"
  | "failed"
  | "ended";

interface VideoCallModalProps {
  channelName: string;
  uid?: number;
  mode?: "audio" | "video";
  displayName?: string | null;
  onEnd?: () => void;
}

interface ClosableTrack {
  close: () => void;
  setMuted?: (muted: boolean) => Promise<void>;
  switchDevice?: () => Promise<void>;
}

interface AgoraSdk {
  createClient: (config: { mode: string; codec: string }) => AgoraClient;
  createMicrophoneAudioTrack: () => Promise<ClosableTrack & { play: () => void }>;
  createCameraVideoTrack: () => Promise<ClosableTrack & { play: (el: HTMLElement) => void }>;
}

interface AgoraClient {
  join: (appId: string, channel: string, token: string, uid: number) => Promise<void>;
  publish: (tracks: unknown[]) => Promise<void>;
  on: (event: string, cb: (...args: never[]) => void) => void;
  leave: () => Promise<void>;
  unpublish?: () => Promise<void>;
}

export function VideoCallModal({
  channelName,
  uid = 0,
  mode = "video",
  displayName,
  onEnd,
}: VideoCallModalProps) {
  const [status, setStatus] = useState<VideoCallStatus>("loading");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(mode === "audio");
  const [error, setError] = useState<string | null>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<AgoraClient | null>(null);
  const tracksRef = useRef<ClosableTrack[]>([]);
  const endedRef = useRef(false);

  function finish() {
    if (endedRef.current) return;
    endedRef.current = true;
    setStatus("ended");
    onEnd?.();
  }

  useEffect(() => {
    let cancelled = false;
    async function join() {
      setStatus("loading");
      setError(null);
      let token = "";
      let appId = "";
      try {
        const res = await fetch("/api/agora-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelName, uid }),
        });
        if (res.status === 503) {
          if (!cancelled) {
            setStatus("unconfigured");
            setError("Live calling is not configured on this deployment.");
          }
          return;
        }
        if (!res.ok) throw new Error(`Token request failed (${res.status})`);
        const data = (await res.json()) as { token?: string; appId?: string };
        if (!data.token || !data.appId) throw new Error("Token request failed");
        token = data.token;
        appId = data.appId;
      } catch (err) {
        if (!cancelled) {
          setStatus("failed");
          setError(err instanceof Error ? err.message : "Could not start the call.");
        }
        return;
      }
      let rtc: AgoraSdk | null = null;
      try {
        const mod = (await import("agora-rtc-react").catch(() => null)) as {
          default?: AgoraSdk;
        } | null;
        rtc = (mod?.default ?? (mod as unknown as AgoraSdk)) || null;
        if (!rtc?.createClient) throw new Error("SDK not installed");
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
          setError("Video calling is not available in this build yet.");
        }
        return;
      }
      if (cancelled) return;
      setStatus("connecting");
      try {
        const client = rtc.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;
        client.on("user-published", async (user, mediaType) => {
          const peer = user as {
            subscribe: (c: unknown, m: string) => Promise<void>;
            videoTrack?: { play: (el: HTMLElement) => void };
            audioTrack?: { play: () => void };
          };
          try {
            await peer.subscribe(client, mediaType as string);
            if (mediaType === "video" && remoteRef.current) peer.videoTrack?.play(remoteRef.current);
            if (mediaType === "audio") peer.audioTrack?.play();
          } catch {
            /* Failed subscribe leaves that stream silent; call continues. */
          }
        });
        await client.join(appId, channelName, token, uid);
        const mic = await rtc.createMicrophoneAudioTrack();
        mic.play();
        const published: unknown[] = [mic];
        tracksRef.current = [mic];
        if (mode === "video") {
          const cam = await rtc.createCameraVideoTrack();
          if (localRef.current) cam.play(localRef.current);
          tracksRef.current = [mic, cam];
          published.push(cam);
        }
        await client.publish(published);
        if (!cancelled) setStatus("connected");
      } catch (err) {
        if (!cancelled) {
          setStatus("failed");
          setError(err instanceof Error ? err.message : "Could not connect the call.");
        }
        return;
      }
    }
    void join();
    return () => {
      cancelled = true;
      const tracks = tracksRef.current;
      tracksRef.current = [];
      for (const t of tracks) {
        try {
          t.close();
        } catch {
          /* Closing an already-closed track throws; ignore. */
        }
      }
      const client = clientRef.current;
      clientRef.current = null;
      if (client) {
        client
          .unpublish?.()
          .catch(() => undefined)
          .finally(() => {
            client.leave().catch(() => undefined);
          });
      }
    };
  }, [channelName, uid, mode]);

  async function toggleMute() {
    const next = !muted;
    setMuted(next);
    // tracksRef is [mic, camera] when both were created — only the mic (index 0)
    // should follow the mute button.
    try {
      await tracksRef.current[0]?.setMuted?.(next);
    } catch {
      /* Track already closed — state still reflects the member's intent. */
    }
  }

  async function flipCamera() {
    for (const t of tracksRef.current) {
      try {
        await t.switchDevice?.();
      } catch {
        /* Single-camera devices reject; staying on the current lens is fine. */
      }
    }
  }

  async function toggleCamera() {
    const next = !cameraOff;
    setCameraOff(next);
    // tracksRef is [mic, camera] when both were created — mute the camera so
    // "camera off" stops publishing frames, not just hides the preview.
    const videoTrack = mode === "video" ? tracksRef.current[1] : undefined;
    try {
      await videoTrack?.setMuted?.(next);
    } catch {
      /* Track already closed — state still reflects the member's intent. */
    }
  }

  if (status === "unconfigured" || status === "unavailable") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Video call unavailable"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      >
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F172A] p-6 text-center shadow-2xl">
          <p className="text-base font-semibold text-white">Video calling is unavailable</p>
          <p className="mt-2 text-sm text-white/70">
            {error ?? "This deployment is not configured for live calls yet."} Your regular
            peer-to-peer call still works.
          </p>
          <button
            type="button"
            onClick={finish}
            className="mt-4 w-full rounded-2xl bg-orange-500 py-2.5 text-sm font-bold text-white transition hover:bg-orange-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const videoMode = mode === "video";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={videoMode ? "Video call" : "Audio call"}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Remote stage */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={remoteRef}
          className="absolute inset-0 bg-slate-950 [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
        />
        {status !== "connected" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950">
            <p className="text-base font-semibold text-white">{displayName ?? "Connecting…"}</p>
            <p className="text-sm text-white/60">
              {status === "failed"
                ? (error ?? "Could not connect.")
                : status === "loading"
                  ? "Getting a call token…"
                  : "Joining the call…"}
            </p>
            {status === "failed" ? (
              <button
                type="button"
                onClick={finish}
                className="mt-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Close
              </button>
            ) : null}
          </div>
        ) : null}
        {/* Local preview */}
        {videoMode && !cameraOff ? (
          <div
            ref={localRef}
            className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-xl [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
          />
        ) : null}
      </div>
      {/* Controls: mute, camera on/off, camera flip, end call. */}
      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-[#0F172A] px-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          onClick={() => void toggleMute()}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          aria-pressed={muted}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        {videoMode ? (
          <>
            <button
              type="button"
              onClick={() => void toggleCamera()}
              aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
              aria-pressed={cameraOff}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => void flipCamera()}
              aria-label="Switch camera"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              <SwitchCamera className="h-5 w-5" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={finish}
          aria-label="End call"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition hover:bg-rose-500 active:scale-95"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}


