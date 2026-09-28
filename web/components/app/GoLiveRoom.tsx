"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "./Avatar";
import {
  CHROME_FADE,
  CloseIcon,
  EyeIcon,
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "./RealtimeIcons";
import { useAutoHideControls } from "@/lib/hooks/useAutoHideControls";
import { useLiveRoom, type LiveFeedItem } from "@/lib/hooks/useLiveRoom";

/** Gifts available in the live room, mirroring the store's virtual goods. */
const LIVE_GIFTS = [
  { emoji: "🌹", label: "Rose" },
  { emoji: "💋", label: "Kiss" },
  { emoji: "🎂", label: "Cake" },
  { emoji: "🍾", label: "Champagne" },
  { emoji: "🎉", label: "Confetti" },
  { emoji: "💎", label: "Diamond" },
  { emoji: "👑", label: "Crown" },
  { emoji: "🚀", label: "Rocket" },
] as const;

/** How many feed lines stay on screen before older ones drop off. */
const VISIBLE_FEED = 6;

interface GoLiveRoomProps {
  roomId: string;
  selfId: string;
  selfName: string;
  selfAvatarUrl?: string | null;
  /** True when this member owns the broadcast. */
  isHost: boolean;
  /** Shown under the host name, e.g. "Lagos · Verified". */
  subtitle?: string;
}

/**
 * "Go Live" broadcasting room.
 *
 * LAYOUT CONTRACT (the reason this component is shaped the way it is):
 *
 *   • Host video is the CENTRE of the screen, edge to edge. The host is the
 *     subject of the broadcast, so their frame gets all the real estate and
 *     nothing is layered over their face or torso.
 *
 *   • Co-hosts and audience members appear as small FLOATING BOXES anchored to
 *     the right edge. They sit off-centre specifically because the middle of
 *     the screen is the one region that must stay clear.
 *
 *   • The chat + gift feed floats over the BOTTOM-LEFT third only. It is
 *     `pointer-events-none` at the container level so a tap that misses a
 *     control falls through to the video instead of being swallowed by an
 *     invisible panel ” this is the single most important detail for a
 *     non-blocking overlay, and it is why the composer re-enables pointer
 *     events on itself only.
 *
 *   • Top right carries the viewer count and a minimalist close button, and
 *     nothing else. Every extra badge up there competes with the host's face.
 *
 * Chrome fades out after a few idle seconds (see `useAutoHideControls`) so a
 * viewer watching a broadcast sees the person, not the interface.
 */
export function GoLiveRoom({
  roomId,
  selfId,
  selfName,
  selfAvatarUrl = null,
  isHost,
  subtitle,
}: GoLiveRoomProps) {
  const router = useRouter();
  const room = useLiveRoom({ roomId, selfId, selfName, selfAvatarUrl, isHost });

  // The chrome stays pinned while the viewer is typing or has the gift tray
  // open ” otherwise the composer they are using would fade out from under
  // them mid-sentence.
  const [composerPinned, setComposerPinned] = useState(false);
  const { visible, reveal } = useAutoHideControls({ enabled: true, pinned: composerPinned });

  const [composerText, setComposerText] = useState("");
  const [giftTrayOpen, setGiftTrayOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  /** Everyone else in the room: co-hosts first, then the audience. */
  const guests = useMemo(
    () => room.participants.filter((person) => person.id !== selfId),
    [room.participants, selfId]
  );

  // Open the camera once the room channel is live, and release it on exit.
  // `started` is a latch rather than a plain "is loading" flag: it stops the
  // effect from re-running (and re-prompting for the camera) on every
  // re-render that changes one of its dependencies.
  useEffect(() => {
    if (room.status !== "live" || !isHost || started) return;
    setStarted(true);
    void room.startBroadcast();
  }, [isHost, room.status, room.startBroadcast, started]);

  // Release the camera when the screen goes away by any route.
  useEffect(() => () => room.stopBroadcast(), [room.stopBroadcast]);

  // Elapsed broadcast timer, shown next to the LIVE badge.
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const leaveRoom = () => {
    room.stopBroadcast();
    router.back();
  };

  const submitChat = (event: React.FormEvent) => {
    event.preventDefault();
    const text = composerText.trim();
    if (!text) return;
    room.sendChat(text);
    setComposerText("");
  };

  const sendGift = (gift: (typeof LIVE_GIFTS)[number]) => {
    room.sendGift(gift.emoji, `sent a ${gift.label.toLowerCase()}`);
    setGiftTrayOpen(false);
  };

  const elapsedLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 text-white">
      {/* ---- Central stage: the host's video, edge to edge ------------- */}
      <div className="absolute inset-0">
        <video
          ref={room.localRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full scale-x-[-1] object-cover"
          aria-label="Live video"
        />
        {/* A viewer never publishes video, so the stage falls back to a
            designed placeholder rather than a black rectangle. */}
        {!isHost ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-950 to-purple-950/60">
            <Avatar src={selfAvatarUrl} name={selfName} size="xl" />
            <p className="text-sm text-slate-300">Watching live</p>
          </div>
        ) : null}
        {/* Bottom scrim so the feed and composer stay legible over a bright
            frame without dimming the host's face. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-slate-950/90 to-transparent"
        />
      </div>

      {/* ---- Floating guest boxes (edge-anchored, centre stays clear) --- */}
      {guests.length > 0 ? (
        <div className="pointer-events-none absolute right-3 top-1/2 z-20 flex max-h-[60%] -translate-y-1/2 flex-col gap-2 overflow-y-auto">
          {guests.slice(0, 6).map((guest) => (
            <GuestBox key={guest.id} guest={guest} stream={room.remoteStreams.get(guest.id)} />
          ))}
        </div>
      ) : null}

      {/* ---- Top bar: identity left, viewer count + close right -------- */}
      <div
        className={[
          "pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3",
          "bg-gradient-to-b from-slate-950/85 to-transparent px-4 pb-10",
          "pt-[max(0.75rem,env(safe-area-inset-top))]",
          CHROME_FADE,
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-500 px-2 py-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
              Live
            </span>
            <span className="tabular-nums text-slate-300">{elapsedLabel}</span>
          </p>
          <h1 className="truncate text-base font-semibold">{selfName}</h1>
          {subtitle ? <p className="truncate text-xs text-slate-300">{subtitle}</p> : null}
        </div>

        {/* Viewer count and close only — nothing else competes up here. */}
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm tabular-nums backdrop-blur-md">
            <EyeIcon />
            {room.viewerCount}
          </span>
          <button
            type="button"
            onClick={leaveRoom}
            aria-label="Leave live room"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition hover:bg-black/60"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {room.error ? (
        <p
          className={[
            "pointer-events-none absolute inset-x-0 top-1/3 z-30 mx-auto w-fit rounded-full",
            "bg-danger-500/90 px-4 py-2 text-sm backdrop-blur-md",
            CHROME_FADE,
            visible ? "opacity-100" : "opacity-0",
          ].join(" ")}
          role="alert"
        >
          {room.error}
        </p>
      ) : null}

      {/* ---- Chat + gift feed: bottom-LEFT third, non-blocking --------- */}
      <div
        className={[
          "pointer-events-none absolute bottom-0 left-0 z-30 flex w-full max-w-[22rem] flex-col gap-2",
          // Sits ABOVE the composer rather than behind it, so the newest
          // message is never hidden by the input the viewer is typing into.
          "pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+6rem))] px-4",
          CHROME_FADE,
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <ul className="flex flex-col gap-1.5" aria-live="polite" aria-label="Live chat and gifts">
          {room.feed.slice(0, VISIBLE_FEED).map((item) => (
            <FeedLine key={item.id} item={item} />
          ))}
        </ul>
      </div>

      {/* ---- Bottom bar: composer + host controls --------------------- */}
      <div
        className={[
          "pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-center gap-2 px-3",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          CHROME_FADE,
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {giftTrayOpen ? (
          <div className="pointer-events-auto absolute inset-x-3 bottom-[max(4.25rem,calc(env(safe-area-inset-bottom)+4rem))] flex flex-wrap justify-center gap-2 rounded-2xl bg-black/50 p-3 backdrop-blur-md">
            {LIVE_GIFTS.map((gift) => (
              <button
                key={gift.label}
                type="button"
                onClick={() => sendGift(gift)}
                aria-label={`Send ${gift.label}`}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl transition hover:bg-white/25 active:scale-95"
              >
                {gift.emoji}
              </button>
            ))}
          </div>
        ) : null}

        {isHost ? (
          <div className="pointer-events-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={room.toggleMic}
              aria-label={room.micEnabled ? "Mute microphone" : "Unmute microphone"}
              aria-pressed={!room.micEnabled}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition hover:bg-white/25"
            >
              {room.micEnabled ? <MicIcon /> : <MicOffIcon />}
            </button>
            <button
              type="button"
              onClick={room.toggleCamera}
              aria-label={room.cameraEnabled ? "Turn camera off" : "Turn camera on"}
              aria-pressed={!room.cameraEnabled}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition hover:bg-white/25"
            >
              {room.cameraEnabled ? <VideoIcon /> : <VideoOffIcon />}
            </button>
          </div>
        ) : null}

        <form
          onSubmit={submitChat}
          onFocus={() => setComposerPinned(true)}
          onBlur={() => setComposerPinned(false)}
          className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 backdrop-blur-md"
        >
          <input
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
            placeholder="Say something…"
            aria-label="Send a message to the live room"
            maxLength={140}
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-slate-300 outline-none"
          />
          <button
            type="button"
            aria-label="Send a gift"
            aria-expanded={giftTrayOpen}
            onClick={() => {
              setGiftTrayOpen((open) => !open);
              reveal();
            }}
            className="shrink-0 text-lg"
          >
            🎁
          </button>
        </form>
      </div>

      {/* Tap the empty stage to bring the chrome back. */}
      <button
        type="button"
        onClick={reveal}
        aria-label="Show live controls"
        className="absolute inset-0 z-10 cursor-default"
        tabIndex={-1}
      />
    </div>
  );
}

/**
 * One chat or gift line. Gifts get a larger emoji, a warm gradient chip and a
 * pop-in animation so a sent gift reads as an EVENT in the feed rather than as
 * another line of text — this is the standard live-room treatment and it is
 * what makes sending a gift feel rewarding.
 */
function FeedLine({ item }: { item: LiveFeedItem }) {
  if (item.kind === "gift") {
    return (
      <li className="cc-feed-line">
        <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/90 to-rose-500/90 px-3 py-1 text-sm font-semibold shadow-lg">
          <span aria-hidden className="text-lg">
            {item.emoji}
          </span>
          <span className="truncate">
            {item.authorName} {item.text}
          </span>
        </span>
      </li>
    );
  }
  return (
    <li className="cc-feed-line">
      <span className="inline-block max-w-full rounded-full bg-black/35 px-3 py-1 text-sm backdrop-blur-sm">
        <span className="font-semibold text-purple-200">{item.authorName}</span>{" "}
        <span className="text-white/90">{item.text}</span>
      </span>
    </li>
  );
}

/** A floating co-host / audience tile. Falls back to the avatar with no feed. */
function GuestBox({
  guest,
  stream,
}: {
  guest: { id: string; name: string; avatarUrl: string | null };
  stream?: MediaStream;
}) {
  const [element, setElement] = useState<HTMLVideoElement | null>(null);

  // Assign srcObject in an effect rather than during render: a ref callback
  // runs before the browser has finished creating the media element, and
  // assigning a stream to a half-initialised element is silently ignored.
  useEffect(() => {
    if (element && stream) {
      element.srcObject = stream;
      void element.play().catch(() => undefined);
    }
  }, [element, stream]);

  return (
    <div className="pointer-events-auto relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-slate-800 shadow-xl">
      {stream ? (
        <video ref={setElement} autoPlay playsInline muted className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Avatar src={guest.avatarUrl} name={guest.name} size="md" />
        </div>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-3 text-[11px]">
        {guest.name}
      </span>
    </div>
  );
}

