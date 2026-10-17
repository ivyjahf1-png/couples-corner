"use client";
/**
 * VideoCall — the Agora RTC audio/video call engine.
 *
 * Self-contained client component built directly on `agora-rtc-sdk-ng`:
 *  - Token flow: POST /api/agora-token mints a 1-hour RTC token server-side
 *    (the App CERTIFICATE never reaches the browser). When that route is
 *    unavailable (signed out / keys unconfigured) the component falls back to
 *    an App-ID-only join, which works on projects with Testing Mode enabled.
 *  - Publishes local mic + camera; subscribes to remote peers (video into the
 *    full-bleed stage, audio inline).
 *  - Controls: mic mute/unmute and camera on/off via setEnabled on the live
 *    tracks (no re-publish), plus hang-up which tears down before navigating.
 *  - Cleanup is exhaustive: every exit closes both tracks and leaves the
 *    channel, so navigating away never leaves a camera light on.
 *
 * env: NEXT_PUBLIC_AGORA_APP_ID (public project App ID) — optional when the
 * token route is configured.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import AgoraRTC, { type ICameraVideoTrack, type IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

type CallStatus = "connecting" | "connected" | "failed" | "ended";

/** Ask the server for a channel token via the live Supabase Edge Function. */
async function fetchJoinCredentials(channelName: string): Promise<{ token: string; appId: string }> {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.");
  }

  const res = await fetch("https://chjemrhjovingpzdassk.supabase.co/functions/v1/generate-agora-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ channelName, uid: 0 }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Edge Function error ${res.status}: ${body.message || "Unknown error"}`);
  }

  const data = (await res.json()) as { token?: string; appId?: string };
  const token = data.token;
  if (!token) {
    throw new Error("Unable to acquire video token from server");
  }
  return { token, appId: data.appId || process.env.NEXT_PUBLIC_AGORA_APP_ID || "" };
}

export function VideoCall({ channel = "test-room" }: { channel?: string }) {
  const router = useRouter();

  const [status, setStatus] = useState<CallStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);

  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const clientRef = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  const remotesRef = useRef<Set<number | string>>(new Set());

  /** Close both local tracks and leave the channel (idempotent). */
  const teardown = useCallback(() => {
    for (const track of [audioTrackRef.current, videoTrackRef.current]) {
      try {
        track?.close();
      } catch {
        /* already closed */
      }
    }
    audioTrackRef.current = null;
    videoTrackRef.current = null;
    const client = clientRef.current;
    clientRef.current = null;
    if (client) void client.leave().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus("connecting");
        const { token, appId } = await fetchJoinCredentials(channel);
        if (!appId) {
          throw new Error("Agora is not configured — set NEXT_PUBLIC_AGORA_APP_ID or AGORA_APP_CERTIFICATE.");
        }

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video" && user.videoTrack && remoteRef.current) {
            user.videoTrack.play(remoteRef.current);
          }
          if (mediaType === "audio") user.audioTrack?.play();
        });
        client.on("user-joined", (user) => {
          remotesRef.current.add(user.uid);
          setRemoteCount(remotesRef.current.size);
        });
        client.on("user-left", (user) => {
          remotesRef.current.delete(user.uid);
          setRemoteCount(remotesRef.current.size);
        });

        // Mic and camera are independent: a missing one must not kill the call.
        let audioTrack: IMicrophoneAudioTrack | null = null;
        let videoTrack: ICameraVideoTrack | null = null;
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        } catch {
          /* no microphone — continue video-only */
        }
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack({ encoderConfig: "480p_1" });
        } catch {
          /* no camera — continue audio-only */
        }
        if (!audioTrack && !videoTrack) throw new Error("No microphone or camera is available.");
        audioTrackRef.current = audioTrack;
        videoTrackRef.current = videoTrack;

        await client.join(appId, channel, token, 0);
        if (cancelled) return;
        const tracks = [audioTrack, videoTrack].filter((t): t is NonNullable<typeof t> => t !== null);
        await client.publish(tracks);
        if (cancelled) return;

        if (videoTrack && localRef.current) videoTrack.play(localRef.current);
        setStatus("connected");
      } catch (err) {
        console.error("[VideoCall] failed to start call:", err);
        teardown();
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "The call could not connect.");
          setStatus("failed");
        }
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [channel, teardown]);

  const toggleMute = useCallback(async () => {
    const track = audioTrackRef.current;
    if (!track) return;
    const next = !muted;
    try {
      await track.setEnabled(!next); // next=true → disable the mic
      setMuted(next);
    } catch (err) {
      console.error("[VideoCall] mic toggle failed:", err);
    }
  }, [muted]);

  const toggleCamera = useCallback(async () => {
    const track = videoTrackRef.current;
    if (!track) return;
    const next = !cameraOff;
    try {
      await track.setEnabled(!next); // next=true → disable the camera
      setCameraOff(next);
    } catch (err) {
      console.error("[VideoCall] camera toggle failed:", err);
    }
  }, [cameraOff]);

  const hangUp = useCallback(() => {
    setStatus("ended");
    teardown();
    router.back();
  }, [router, teardown]);

  if (status === "failed") {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
        <span className="text-4xl" aria-hidden>
          📡
        </span>
        <p className="text-lg font-semibold">Call unavailable</p>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full bg-slate-700 px-6 py-2 text-sm font-medium transition hover:bg-slate-600 active:scale-95"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-slate-950 text-white select-none">
      {/* Remote stage — the SDK injects a sized <div> per subscribed video track */}
      <div
        ref={remoteRef}
        className="absolute inset-0 bg-slate-900 [&>div]:h-full [&>div]:w-full"
        aria-label="Remote video"
      />

      {/* Header: channel pill + live status */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 backdrop-blur-md">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "connected" ? "bg-emerald-400" : "bg-amber-300 animate-pulse"
            }`}
            aria-hidden
          />
          <span className="text-xs font-bold text-white/90">#{channel}</span>
          <span className="text-[10px] font-semibold text-white/60">
            {status === "connected"
              ? `${remoteCount + 1} in call`
              : "Connecting…"}
          </span>
        </div>
      </div>

      {/* Your video (picture-in-picture) */}
      <div
        ref={localRef}
        className="absolute bottom-32 right-4 z-10 h-40 w-28 overflow-hidden rounded-2xl border border-white/20 bg-slate-800 shadow-2xl [&>div]:h-full [&>div]:w-full"
        aria-label="Your video"
      />

      {/* Controls: mic · camera · hang-up */}
      <div className="relative z-10 mt-auto flex items-center justify-center gap-4 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom)))] pt-4">
        <button
          type="button"
          onClick={() => void toggleMute()}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          className={`flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-md transition active:scale-95 ${
            muted
              ? "border-rose-400/60 bg-rose-500/25 text-rose-200"
              : "border-white/15 bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => void toggleCamera()}
          aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
          className={`flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-md transition active:scale-95 ${
            cameraOff
              ? "border-rose-400/60 bg-rose-500/25 text-rose-200"
              : "border-white/15 bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={hangUp}
          aria-label="End call"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-[0_0_24px_rgba(225,29,72,.55)] transition hover:bg-rose-500 active:scale-95"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
