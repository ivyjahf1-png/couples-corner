"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
// Shared ICE/TURN configuration. See rtcConfig.ts for why TURN is required and
// why all five Metered URLs must stay in the list.
import { RTC_CONFIG } from "./rtcConfig";

/** A member visible in the live room. */
export interface LiveParticipant {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** The host occupies the central stage; co-hosts get floating boxes. */
  role: "host" | "guest";
}

/** One line in the live chat / gift feed. */
export interface LiveFeedItem {
  id: string;
  kind: "chat" | "gift" | "join";
  authorId: string;
  authorName: string;
  /** Message body for `chat`; the gift label for `gift`. */
  text: string;
  /** Animated gift emoji, present only on `gift` items. */
  emoji?: string;
  at: number;
}

/** Wire payload for a mesh signal, targeted at one peer. */
interface LiveSignal {
  sender: string;
  target: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface UseLiveRoomOptions {
  roomId: string;
  selfId: string;
  selfName: string;
  selfAvatarUrl?: string | null;
  /** True for the member who owns the broadcast. */
  isHost: boolean;
}

/** Cap the feed so a busy room cannot grow React state without bound. */
const MAX_FEED_ITEMS = 60;

/**
 * "Go Live" broadcasting room state.
 *
 * TRANSPORT: Supabase Realtime carries presence (who is in the room), chat,
 * gifts, and WebRTC signaling. Media is peer-to-peer in a MESH — the host
 * holds one RTCPeerConnection per co-host and sends its own camera track down
 * each one. A mesh is the right shape for the 1 host + a few co-hosts case
 * this screen is designed around; a room with dozens of co-hosts needs a real
 * SFU (e.g. LiveKit) because the host's upload scales with the guest count.
 *
 * VIEWERS ARE RECEIVE-ONLY. They publish presence but never join the mesh and
 * are never sent a signal, so the audience costs the host nothing. That is why
 * the viewer count comes from presence rather than from a peer list.
 *
 * The chat/gift feed is EPHEMERAL by design: it is broadcast, never persisted,
 * so it resets when the room empties. This matches how live chat behaves on
 * mainstream dating apps and avoids an unbounded write path.
 */
export function useLiveRoom({
  roomId,
  selfId,
  selfName,
  selfAvatarUrl = null,
  isHost,
}: UseLiveRoomOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localRef = useRef<HTMLVideoElement>(null);
  /** Remote streams keyed by peer id, so the UI can render a box per guest. */
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [feed, setFeed] = useState<LiveFeedItem[]>([]);
  const [viewerCount, setViewerCount] = useState(1);
  const [status, setStatus] = useState<"idle" | "live" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  /** Newest-first feed cap, shared by every writer. */
  const pushFeed = useCallback((item: LiveFeedItem) => {
    setFeed((current) => [item, ...current].slice(0, MAX_FEED_ITEMS));
  }, []);

  /**
   * Read presence state into the participant list and viewer count.
   *
   * `presenceState()` is snapshot-only: it reports who is present RIGHT NOW,
   * which is exactly what a viewer count must be. Entries whose presence has
   * already expired are skipped so a crashed tab does not linger in the count.
   */
  const syncPresence = useCallback((state: RealtimePresenceState) => {
    const everyone = new Map<string, LiveParticipant>();
    for (const [key, metas] of Object.entries(state)) {
      for (const meta of metas) {
        // Supabase types a presence payload as an opaque `{ presence_ref }`
        // record, but anything passed to `channel.track()` comes back on it.
        // Widening to a string map here is what lets us read our own fields.
        const fields = meta as Record<string, unknown>;
        const id =
          (typeof fields.userId === "string" ? fields.userId : undefined) ??
          key.split(":")[0];
        if (!id) continue;
        everyone.set(id, {
          id,
          name: typeof fields.name === "string" ? fields.name : "Guest",
          avatarUrl: typeof fields.avatarUrl === "string" ? fields.avatarUrl : null,
          role: fields.role === "host" ? "host" : "guest",
        });
      }
    }
    const list = Array.from(everyone.values());
    setParticipants(list);
    // The count is everyone in the room, which is what a live viewer badge
    // shows on every mainstream live product.
    setViewerCount(list.length);
  }, []);


  useEffect(() => {
    const channel = getSupabaseClient().channel(`live:${roomId}`, {
      config: { presence: { key: selfId } },
    });
    channelRef.current = channel;

    /** Tear down one guest and remove its video box. */
    const dropPeer = (remoteId: string) => {
      peersRef.current.get(remoteId)?.close();
      peersRef.current.delete(remoteId);
      remoteStreamsRef.current.delete(remoteId);
      setRemoteStreams(new Map(remoteStreamsRef.current));
    };

    const ensurePeer = (remoteId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(remoteId);
      if (existing) return existing;
      const peer = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(remoteId, peer);
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      }
      peer.ontrack = (event) => {
        const [incoming] = event.streams;
        if (!incoming) return;
        remoteStreamsRef.current.set(remoteId, incoming);
        setRemoteStreams(new Map(remoteStreamsRef.current));
      };
      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        void channel.send({
          type: "broadcast",
          event: "signal",
          payload: { sender: selfId, target: remoteId, candidate: event.candidate.toJSON() },
        });
      };
      peer.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
          dropPeer(remoteId);
        }
      };
      return peer;
    };

    // ---- Presence -------------------------------------------------------
    const onPresence = () => syncPresence(channel.presenceState());
    channel.on("presence", { event: "sync" }, onPresence);
    channel.on("presence", { event: "join" }, onPresence);
    channel.on("presence", { event: "leave" }, onPresence);

    // ---- Chat + gifts ---------------------------------------------------
    channel.on("broadcast", { event: "feed" }, ({ payload }: { payload: LiveFeedItem }) => {
      if (!payload?.id) return;
      setFeed((current) =>
        // Dedupe by id: broadcast can echo a message the sender already added
        // optimistically, and a doubled line reads as a glitch to the viewer.
        current.some((item) => item.id === payload.id)
          ? current
          : [payload, ...current].slice(0, MAX_FEED_ITEMS)
      );
    });

    // ---- WebRTC signaling ----------------------------------------------
    channel.on(
      "broadcast",
      { event: "signal" },
      async ({ payload }: { payload: LiveSignal }) => {
        if (!payload || payload.target !== selfId || payload.sender === selfId) return;
        const peer = ensurePeer(payload.sender);
        try {
          if (payload.description) {
            await peer.setRemoteDescription(payload.description);
            if (payload.description.type === "offer") {
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              void channel.send({
                type: "broadcast",
                event: "signal",
                payload: { sender: selfId, target: payload.sender, description: answer },
              });
            }
          } else if (payload.candidate) {
            await peer.addIceCandidate(payload.candidate);
          }
        } catch {
          dropPeer(payload.sender);
        }
      }
    );

    void channel.subscribe((channelStatus) => {
      if (channelStatus === "SUBSCRIBED") {
        setStatus("live");
        setError(null);
        // The host is always the deterministic initiator, so two guests
        // joining at once cannot both offer to the same peer and collide.
        void channel.track({
          userId: selfId,
          name: selfName,
          avatarUrl: selfAvatarUrl,
          role: isHost ? "host" : "guest",
        });
      } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
        setStatus("error");
        setError("Lost the live room connection");
      }
    });

    return () => {
      peersRef.current.forEach((peer) => peer.close());
      peersRef.current.clear();
      remoteStreamsRef.current.clear();
      void getSupabaseClient().removeChannel(channel);
      channelRef.current = null;
    };
  }, [isHost, roomId, selfAvatarUrl, selfId, selfName, syncPresence]);


  /**
   * Publish a chat line. Echoed to every member including the sender, so all
   * clients run the same code path and the feed stays consistent.
   */
  const sendChat = useCallback(
    (text: string) => {
      const body = text.trim();
      if (!body) return;
      void channelRef.current?.send({
        type: "broadcast",
        event: "feed",
        payload: {
          id: `${selfId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: "chat",
          authorId: selfId,
          authorName: selfName,
          text: body,
          at: Date.now(),
        } satisfies LiveFeedItem,
      });
    },
    [selfId, selfName]
  );

  /** Send a virtual gift, which animates in the feed for everyone. */
  const sendGift = useCallback(
    (emoji: string, label: string) => {
      void channelRef.current?.send({
        type: "broadcast",
        event: "feed",
        payload: {
          id: `${selfId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: "gift",
          authorId: selfId,
          authorName: selfName,
          text: label,
          emoji,
          at: Date.now(),
        } satisfies LiveFeedItem,
      });
    },
    [selfId, selfName]
  );

  /**
   * Open the host/co-host camera and start publishing to the mesh.
   *
   * Viewers never call this, which is what keeps a large audience from
   * costing the host anything.
   */
  const startBroadcast = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      localStreamRef.current = stream;
      const element = localRef.current;
      if (element) {
        element.srcObject = stream;
        void element.play().catch(() => undefined);
      }
      // Attach to any peer that connected before permission was granted.
      peersRef.current.forEach((peer) => {
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      });
      return true;
    } catch {
      setError("Camera and microphone permission is required to go live");
      return false;
    }
  }, []);

  const toggleMic = useCallback(() => {
    setMicEnabled((current) => {
      const next = !current;
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraEnabled((current) => {
      const next = !current;
      localStreamRef.current?.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, []);

  /** Release the camera and microphone. */
  const stopBroadcast = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  // Bind the preview element once the element exists.
  useEffect(() => {
    const stream = localStreamRef.current;
    const element = localRef.current;
    if (stream && element) {
      element.srcObject = stream;
      void element.play().catch(() => undefined);
    }
  }, [status]);

  return {
    localRef,
    participants,
    remoteStreams,
    feed,
    viewerCount,
    status,
    error,
    micEnabled,
    cameraEnabled,
    sendChat,
    sendGift,
    startBroadcast,
    toggleMic,
    toggleCamera,
    stopBroadcast,
    pushFeed,
  };
}
