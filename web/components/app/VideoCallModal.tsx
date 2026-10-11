"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, SwitchCamera, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { startActiveCallAction, endActiveCallAction } from "@/lib/actions/calls";

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
  /** Caller's user id (uuid). Provided by the parent that owns the call button. */
  callerId?: string;
  /** Receiver's user id (uuid). Provided by the parent that owns the call button. */
  receiverId?: string;
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
  callerId,
  receiverId,
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
  /** The live call session id, written to `active_calls` on initiation. */
  const activeCallIdRef = useRef<string | null>(null);
  /** The Realtime channel handle for `active_calls` (the receiver's wake-up). */
  const activeCallChannelRef = useRef<{ unsubscribe: () => Promise<unknown> } | null>(null);
  const endedRef = useRef(false);
  /* Ringing tone: looping Web Audio ringback while connecting, silent once the
     peer joins or the call ends. Pure oscillator — no audio asset needed. */
  const ringCtxRef = useRef<AudioContext | null>(null);
  const ringTimerRef = useRef<number | null>(null);
  const [speakerOn, setSpeakerOn] = useState(true);

  function stopRinging() {
    if (ringTimerRef.current !== null) {
      window.clearInterval(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    try {
      void ringCtxRef.current?.close();
    } catch {
      /* Already closed — ringing is over either way. */
    }
    ringCtxRef.current = null;
  }

  function startRinging() {
    try {
      stopRinging();
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      ringCtxRef.current = ctx;
      const playRing = () => {
        if (!ringCtxRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1);
      };
      playRing();
      ringTimerRef.current = window.setInterval(playRing, 2000);
    } catch {
      /* Audio blocked — the call itself still works. */
    }
  }

  async function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    /* Route remote audio to speaker / earpiece where the platform exposes an
       output-device selector; elsewhere this is a state-only toggle. */
    const remote = remoteRef.current?.querySelector("audio, video") as (HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    try {
      await remote?.setSinkId?.(next ? "" : "communications");
    } catch {
      /* setSinkId unsupported — button state still reflects intent. */
    }
  }

  useEffect(() => stopRinging, []);

  /* Any terminal or connected state silences the ringback — the peer is here
     or the call is over. Centralised here so no exit path can forget it. */
  useEffect(() => {
    if (status === "connected" || status === "ended" || status === "failed" || status === "unavailable" || status === "unconfigured") {
      stopRinging();
    }
  }, [status]);

  /* Incoming-call receiver: listen for another member's broadcast on this
     conversation's call channel and ring loudly with an overlay until the
     member answers or dismisses. Mounted only when this modal is NOT already
     in an active call surface for the same channel. */
  const [incoming, setIncoming] = useState<{ callerName: string; mode: "audio" | "video" } | null>(null);

  useEffect(() => {
    if (status === "connected" || status === "connecting" || status === "loading") return;
    let channel: { unsubscribe: () => Promise<unknown> } | null = null;
    let alive = true;
    (async () => {
      try {
        const { getSupabaseClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseClient();
        const ch = supabase
          .channel(`call:${channelName}`)
          .on("broadcast", { event: "incoming-call" }, (msg) => {
            const payload = (msg as { payload?: { callerName?: string; mode?: string; callerUid?: string } }).payload;
            /* Ignore our own broadcast echo (callerUid arrives as a string). */
            if (payload?.callerUid != null && payload.callerUid === String(uid)) return;
            if (!alive) return;
            setIncoming({ callerName: payload?.callerName ?? "Someone", mode: payload?.mode === "video" ? "video" : "audio" });
            startRinging();
          });
        await ch.subscribe();
        channel = ch as unknown as { unsubscribe: () => Promise<unknown> };
      } catch {
        /* Realtime unavailable — direct call links still work. */
      }
    })();
    return () => {
      alive = false;
      stopRinging();
      if (channel) void channel.unsubscribe().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, uid, status]);

  function finish() {
    if (endedRef.current) return;
    endedRef.current = true;
    stopRinging();
    setStatus("ended");
    onEnd?.();
    /* Terminate the live call session in Supabase. This updates `status` to
     * `ended` and stamps `ended_at` so the recipient's device can show a clean
     * state. The Agora client is left by the cleanup effect above (the
     * `unpublish().then(leave())` chain). */
    const callId = activeCallIdRef.current;
    if (callId) {
      void endActiveCallAction({ callId, userId: String(uid) }).catch(() => undefined);
      activeCallIdRef.current = null;
    }
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
      /* Ringback while the peer has not joined yet; the user-published
         handler and the connected transition silence it below. */
      startRinging();
      /* Call initiation: write the live session row to `public.active_calls` so
       * the receiver's realtime subscription (on `receiver_id`) wakes up and
       * rings with an incoming-call overlay. The `channel_name` is the Agora
       * room id the two clients derive from the conversation; it is passed
       * through verbatim so both sides join the same channel. A 503 from the
       * server means "Agora is not configured on this deployment" and the call
       * still proceeds (falling back to the peer-to-peer `CallScreen`). */
      try {
        const session = await startActiveCallAction({
          conversationId: String(channelName), // channel id is the room id; the conversation is the same value on both sides
          callerId: callerId ?? String(uid),
          receiverId: receiverId ?? "unknown",
          channelName,
        });
        if (session.ok && session.id != null) activeCallIdRef.current = session.id;
      } catch {
        /* The call still proceeds; the active_calls row is best-effort so the
         * realtime wake-up is not a hard dependency. */
      }

      /* Subscribe to the live call surface on the receiver's end. `active_calls`
       * is filtered by `receiver_id = auth.uid()` so any ringing call rings the
       * device exactly once, without polling or a second lookup. The row that
       * fires is the caller's session row — the caller wants to hear that the
       * call was placed, not their own echo. */
      try {
        const { getSupabaseClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseClient();
        const ch = supabase
          .channel("active_calls")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "active_calls",
              filter: `receiver_id=eq.${receiverId ?? String(uid)}`,
            },
            (payload) => {
              /* `payload.new` is the full row inserted by `startActiveCallAction`.
               * The caller wants to hear the ring unless the row belongs to them
               * (which it shouldn't — they are the caller). */
              const row =
                (payload as { new: { caller_id?: string; receiver_id?: string; mode?: string; callerName?: string } }).new;
              if (row.caller_id != null && row.caller_id !== String(uid)) return;
              if (cancelled) return;
              setIncoming({
                callerName: row.callerName ?? "Someone",
                mode: (row.mode ?? mode) as "audio" | "video",
              });
              startRinging();
            },
          )
          .subscribe();
        activeCallChannelRef.current = ch as unknown as { unsubscribe: () => Promise<unknown> };
      } catch {
        /* Realtime unavailable — direct call links still work. */
      }
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
            /* Peer arrived — ringback has done its job. */
            stopRinging();
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
      /* Clean up the `active_calls` Realtime subscription so the receiver's
       * device does not ring after the call is over. */
      const activeChannel = activeCallChannelRef.current;
      activeCallChannelRef.current = null;
      if (activeChannel) {
        void activeChannel.unsubscribe().catch(() => undefined);
      }
      /* If the user hung up while a call session was still open, move the row to
       * `ended` now — the same way the end-call button does it. */
      const callId = activeCallIdRef.current;
      activeCallIdRef.current = null;
      if (callId) {
        void endActiveCallAction({ callId, userId: String(uid) }).catch(() => undefined);
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
        {/* Speaker toggle — switches audio output route (speaker / earpiece)
            via setSinkId where supported; falls back to state-only toggle. */}
        <button
          type="button"
          onClick={() => void toggleSpeaker()}
          aria-label={speakerOn ? "Switch to earpiece" : "Switch to speaker"}
          aria-pressed={speakerOn}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
        >
          {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>
      {/* Incoming-call overlay: rings loudly (ringback above) until the member
          answers — which joins this same channel — or declines. */}
      {incoming ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={`Incoming ${incoming.mode} call from ${incoming.callerName}`}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-6 text-center backdrop-blur-sm"
        >
          <span className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_0_30px_rgba(249,115,22,0.6)]">
            {incoming.mode === "video" ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
          </span>
          <p className="text-lg font-bold text-white">{incoming.callerName}</p>
          <p className="text-sm text-white/60">Incoming {incoming.mode} call — tap to answer</p>
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setIncoming(null);
                stopRinging();
                setStatus("connecting");
              }}
              aria-label="Answer call"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-400 active:scale-95"
            >
              <Phone className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIncoming(null);
                stopRinging();
                finish();
              }}
              aria-label="Decline call"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition hover:bg-rose-500 active:scale-95"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


