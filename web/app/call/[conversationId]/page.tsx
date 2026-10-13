"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

/**
 * /call/[conversationId] — the Agora RTC room for a live 1:1 call.
 *
 * The conversation id in the URL is the shared room id both peers derive from
 * their conversation. On mount we fetch a fresh RTC token from the deployed
 * Supabase Edge Function `generate-agora-token` (the App Certificate never
 * leaves the server), join the channel with the public App ID
 * (NEXT_PUBLIC_AGORA_APP_ID), publish the local mic + camera, subscribe to
 * remote users, and render local + remote video with mute / camera / end-call
 * controls.
 *
 * `agora-rtc-react` is imported dynamically: a static import would fail the
 * production build if the package is unavailable, and the SDK only runs in
 * the browser anyway.
 */

type CallStatus = "connecting" | "connected" | "failed" | "ended";

interface RemoteUser {
  uid: number | string;
}

interface ClosableTrack {
  close: () => void;
  setMuted?: (muted: boolean) => Promise<void>;
}

interface PlayableVideoTrack {
  play: (el: HTMLElement) => void;
}

interface AgoraRemoteUser {
  uid: number | string;
  videoTrack?: PlayableVideoTrack;
}

interface AgoraClient {
  join: (appId: string, channel: string, token: string, uid: number | string) => Promise<number>;
  leave: () => Promise<void>;
  publish: (tracks: unknown[]) => Promise<void>;
  subscribe: (user: unknown, mediaType: string) => Promise<void>;
  on: (event: string, cb: (...args: never[]) => void) => void;
}

interface LocalVideoTrack extends ClosableTrack {
  play: (el: HTMLElement) => void;
  setEnabled?: (enabled: boolean) => Promise<void>;
}

interface LocalAudioTrack extends ClosableTrack {
  play: () => void;
}

interface AgoraSdk {
  createClient: (config: { mode: string; codec: string }) => AgoraClient;
  createMicrophoneAudioTrack: () => Promise<LocalAudioTrack>;
  createCameraVideoTrack: () => Promise<LocalVideoTrack>;
}

export default function CallRoomPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const conversationId = params?.conversationId ? decodeURIComponent(params.conversationId) : "";

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";

  const [status, setStatus] = useState<CallStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);

  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<AgoraClient | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const endedRef = useRef(false);

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

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    teardown();
    setStatus("ended");
    router.back();
  }, [router, teardown]);

  useEffect(() => teardown, [teardown]);

  async function toggleMute() {
    const track = audioTrackRef.current;
    const next = !muted;
    setMuted(next);
    if (track?.setMuted) await track.setMuted(next).catch(() => undefined);
  }

  async function toggleCamera() {
    const track = videoTrackRef.current;
    const next = !cameraOff;
    setCameraOff(next);
    if (track?.setEnabled) await track.setEnabled(!next).catch(() => undefined);
  }

  useEffect(() => {
    if (!conversationId || !appId) {
      setError(!appId ? "Video calling is not configured on this deployment." : "Missing call room.");
      setStatus("failed");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { getSupabaseClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.functions.invoke("generate-agora-token", {
          body: { channelName: conversationId, uid: 0 },
        });
        if (error) throw error;
        const token = (data as { token?: string } | null)?.token;
        if (!token || cancelled) {
          if (!cancelled) throw new Error("Could not start the call (no token).");
          return;
        }

        const mod = (await import("agora-rtc-react")) as unknown as {
          default?: AgoraSdk;
        };
        const AgoraRTC = mod.default;
        if (!AgoraRTC || cancelled) {
          if (!cancelled) {
            setError("Calling is unavailable right now.");
            setStatus("failed");
          }
          return;
        }

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        const [audioTrack, videoTrack] = await Promise.all([
          AgoraRTC.createMicrophoneAudioTrack(),
          AgoraRTC.createCameraVideoTrack(),
        ]);
        audioTrackRef.current = audioTrack;
        videoTrackRef.current = videoTrack;

        client.on("user-published", (...args: never[]) => {
          if (cancelled) return;
          const user = args[0] as AgoraRemoteUser;
          void client.subscribe(user, "video").catch(() => undefined);
          setRemoteUsers((current) =>
            current.some((u) => u.uid === user.uid) ? current : [...current, { uid: user.uid }],
          );
          requestAnimationFrame(() => {
            if (remoteRef.current && user.videoTrack?.play) user.videoTrack.play(remoteRef.current);
          });
        });
        client.on("user-unpublished", (...args: never[]) => {
          const user = args[0] as { uid: number | string };
          setRemoteUsers((current) => current.filter((u) => u.uid !== user.uid));
        });
        client.on("user-left", (...args: never[]) => {
          const user = args[0] as { uid: number | string };
          setRemoteUsers((current) => current.filter((u) => u.uid !== user.uid));
        });

        await client.join(appId, conversationId, token, 0);
        await client.publish([audioTrack, videoTrack]);

        if (!cancelled && localRef.current) {
          videoTrack.play(localRef.current);
          audioTrack.play();
        }
        if (!cancelled) setStatus("connected");
      } catch (err) {
        console.error("[CallRoom] failed to start call:", err);
        if (!cancelled) {
          setError("The call could not connect.");
          setStatus("failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, appId]);

  if (status === "failed") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
        <p className="text-lg font-semibold">Call unavailable</p>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full bg-slate-700 px-6 py-2 text-sm font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-slate-950 text-white">
      <div className="flex-1">
        {status === "connecting" ? (
          <div className="flex h-full items-center justify-center text-slate-400">Connecting…</div>
        ) : (
          <div
            ref={remoteRef}
            className="h-full w-full bg-slate-900 [&>div]:h-full [&>div]:w-full"
            aria-label="Remote video"
          />
        )}
      </div>

      <div
        ref={localRef}
        className="absolute bottom-28 right-4 h-40 w-28 overflow-hidden rounded-xl border border-white/15 bg-slate-800 shadow-lg [&>div]:h-full [&>div]:w-full"
        aria-label="Your video"
      />

      <div className="flex items-center justify-center gap-4 pb-10 pt-4">
        <button
          type="button"
          onClick={() => void toggleMute()}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => void toggleCamera()}
          aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
        >
          {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={finish}
          aria-label="End call"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition hover:bg-rose-500 active:scale-95"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}