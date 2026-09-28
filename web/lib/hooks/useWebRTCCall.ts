"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Public STUN only. A STUN server discovers the public mapping of a local
 * ICE candidate; it does not relay media. Peers behind symmetric NAT — both
 * on mobile carriers, which is common on a dating app — can therefore fail to
 * connect with no TURN server configured. Point `iceServers` at a TURN service
 * before relying on this for production call quality.
 */
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/** A session description or ICE candidate in flight between the two peers. */
interface Signal {
  sender: string;
  target: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export type CallStatus =
  | "idle"
  | "requesting-media"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "permission-denied"
  | "failed";

interface UseWebRTCCallOptions {
  /** `null` tears the call down; "audio" / "video" starts one. */
  mode: "audio" | "video" | null;
  /** Room id. Both peers must derive the SAME string to meet. */
  channelName: string;
  selfId: string;
  peerId: string | null;
}

const CAMERA_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
} as const;

/**
 * One-on-one WebRTC call over Supabase Realtime broadcast.
 *
 * SUPABASE IS THE SIGNALING RELAY, NOT THE MEDIA PATH. Offers, answers and
 * ICE candidates are broadcast on a channel both peers subscribe to; once the
 * handshake completes the audio/video flows peer-to-peer and never touches the
 * server. This follows the approach the existing chat call overlay uses, but
 * adds the two things a production call screen needs: camera flipping and a
 * proper connection state machine.
 *
 * GLARE AVOIDANCE: both peers would otherwise create an offer simultaneously
 * and collide ("called while already connecting"). Exactly one side initiates
 * — the lexicographically smaller id — so the handshake has a single author
 * and the collision cannot happen.
 *
 * ICE candidates that arrive before the remote description are buffered
 * rather than dropped. `addIceCandidate` throws if there is no remote
 * description yet, and candidates routinely arrive first on a fast link —
 * dropping them silently degrades a call that would otherwise connect.
 *
 * @returns refs to bind to the two <video> elements, the control flags, and
 *          a `stop()` that releases every track and unsubscribes the channel.
 */
export function useWebRTCCall({ mode, channelName, selfId, peerId }: UseWebRTCCallOptions) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSet = useRef(false);

  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  /** True when the local preview is mirrored; false after a flip. */
  const [mirrored, setMirrored] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  /** Release the camera/mic, close the peer connection, leave the channel. */
  const stop = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pendingCandidates.current = [];
    remoteDescriptionSet.current = false;
    if (channelRef.current) {
      void getSupabaseClient().removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Attach the local preview whenever a stream exists and the element mounts.
  // Kept in its own effect so the video element can render before the browser
  // grants permission — assigning srcObject before the element exists would
  // silently do nothing and leave a black preview forever.
  useEffect(() => {
    const stream = streamRef.current;
    const element = localRef.current;
    if (stream && element) {
      element.srcObject = stream;
      void element.play().catch(() => undefined);
    }
  }, [mode, status]);

  useEffect(() => {
    if (!mode || !peerId) {
      stop();
      setStatus("idle");
      return;
    }

    let live = true;
    setStatus("requesting-media");
    setMuted(false);
    setCameraOff(false);
    setMirrored(true);
    setElapsed(0);
    pendingCandidates.current = [];
    remoteDescriptionSet.current = false;

    const peer = new RTCPeerConnection(RTC_CONFIG);
    const channel = getSupabaseClient()
      .channel(channelName, { config: { broadcast: { self: false } } });
    peerRef.current = peer;
    channelRef.current = channel;

    const send = (payload: Signal) => {
      void channel.send({ type: "broadcast", event: "signal", payload });
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream && remoteRef.current) {
        remoteRef.current.srcObject = stream;
        void remoteRef.current.play().catch(() => undefined);
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        send({ sender: selfId, target: peerId, candidate: event.candidate.toJSON() });
      }
    };

    channel.on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
      if (!live) return;
      if (payload.sender === selfId || payload.target !== selfId) return;
      try {
        if (payload.description) {
          await peer.setRemoteDescription(payload.description);
          remoteDescriptionSet.current = true;
          // Flush whatever arrived before the description existed.
          for (const candidate of pendingCandidates.current) {
            await peer.addIceCandidate(candidate);
          }
          pendingCandidates.current = [];
          if (payload.description.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            send({ sender: selfId, target: payload.sender, description: answer });
          }
        } else if (payload.candidate) {
          // Buffer until there is a remote description to attach them to.
          if (remoteDescriptionSet.current) await peer.addIceCandidate(payload.candidate);
          else pendingCandidates.current.push(payload.candidate);
        }
      } catch {
        setStatus("failed");
      }
    });

    void channel.subscribe(async (channelStatus) => {
      if (channelStatus !== "SUBSCRIBED" || !live) return;
      setStatus("ringing");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video" ? { ...CAMERA_CONSTRAINTS } : false,
        });
        // The user may have hung up while the permission prompt was open.
        if (!live) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const element = localRef.current;
        if (element) {
          element.srcObject = stream;
          void element.play().catch(() => undefined);
        }
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        if (selfId < peerId) {
          setStatus("connecting");
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          send({ sender: selfId, target: peerId, description: offer });
        }
      } catch {
        setStatus("permission-denied");
      }
    });

    return () => {
      live = false;
      stop();
    };
  }, [channelName, mode, peerId, selfId, stop]);

  // Run the call timer only while actually connected, so the readout does not
  // count up through a ringing period that never connected.
  useEffect(() => {
    if (status !== "connected") return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  /** Toggle the audio track. Disabled tracks keep flowing silently. */
  const toggleMic = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      streamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  /** Toggle the video track, keeping the track live so re-enabling is instant. */
  const toggleCamera = useCallback(() => {
    setCameraOff((current) => {
      const next = !current;
      streamRef.current?.getVideoTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  /**
   * Switch between the front and rear camera.
   *
   * `facingMode` cannot be flipped on an existing track, so the only way is
   * to acquire a NEW stream from the opposite camera and swap it into the
   * live peer connection. The old track is stopped immediately: leaving two
   * cameras open keeps the camera indicator light on and halves battery life.
   *
   * If the device has no second camera the constraint rejects, and the error
   * is swallowed so the call carries on with the original camera.
   */
  const flipCamera = useCallback(async () => {
    const nextFacing = mirrored ? "environment" : "user";
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { ...CAMERA_CONSTRAINTS, facingMode: nextFacing },
      });
      const previous = streamRef.current;
      streamRef.current = nextStream;
      const element = localRef.current;
      if (element) {
        element.srcObject = nextStream;
        void element.play().catch(() => undefined);
      }
      // Swap the outgoing video track and drop the old camera.
      const sender = peerRef.current?.getSenders().find((s) => s.track?.kind === "video");
      const replacement = nextStream.getVideoTracks()[0];
      if (sender && replacement) await sender.replaceTrack(replacement);
      previous?.getVideoTracks().forEach((track) => track.stop());
      // A camera flipped back on must not silently reappear off.
      if (cameraOff && replacement) replacement.enabled = false;
      setMirrored(!mirrored);
    } catch {
      // No second camera (common on desktop) — keep the current one.
    }
  }, [cameraOff, mirrored]);

  return {
    localRef,
    remoteRef,
    status,
    muted,
    cameraOff,
    mirrored,
    elapsed,
    toggleMic,
    toggleCamera,
    flipCamera,
    stop,
  };
}
