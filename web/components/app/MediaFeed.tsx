"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Send, Volume2, VolumeX } from "lucide-react";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
import { EmptyState } from "@/components/app/EmptyState";
import { Avatar } from "@/components/app/Avatar";
import type { MomentView } from "@/lib/moments";

/**
 * Immersive media feed.
 *
 * A full-bleed, single-card-at-a-time viewer (story/reel style) over the
 * public `moments` table, which is written by the Task Center upload form.
 * Because it reads the same table that flow writes to, anything a member
 * uploads is syndicated here immediately.
 *
 * LAYOUT CONTRACT - exactly one vertical scroll region:
 *   - The root is h-[100dvh] overflow-hidden: the page never scrolls, which
 *     is what stops rubber-banding and bounce on iOS Safari.
 *   - The top overlay (search + controls) and the bottom composer are
 *     absolutely positioned over the media, so neither can be pushed out of
 *     view by a tall caption.
 *   - Long captions are line-clamped rather than allowed to grow a second
 *     scroller.
 *
 * INTERACTION:
 *   - Arrow keys / wheel / edge buttons move between moments.
 *   - Videos autoplay muted, with a tap-to-mute control (browsers block
 *     unmuted autoplay, so muted is the only reliable default).
 *
 * KNOWN LIMITATION: the heart is a local optimistic toggle only. There is no
 * `moment_reactions` table yet, so reactions are not persisted or syndicated.
 * Wiring that up is a deliberate follow-up rather than a silent fake.
 */

const MAX_CAPTION = 2200;

interface MediaFeedProps {
  moments: MomentView[];
  /** Current viewer uid, or null when signed out. */
  viewerId: string | null;
  /** Search box rendered into the top overlay. */
  searchSlot?: ReactNode;
  /** Extra controls pinned to the top-right (location badge, games, ...). */
  topRightSlot?: ReactNode;
  /** Overlay message shown when there is nothing to play. */
  emptyTitle?: string;
  emptyBody?: string;
}

export function MediaFeed({
  moments,
  viewerId,
  searchSlot,
  topRightSlot,
  emptyTitle = "No moments yet",
  emptyBody = "Share a photo or short video and it will appear here for everyone.",
}: MediaFeedProps) {
  const router = useRouter();
  const feed = useMemo(() => moments.filter((moment) => moment?.id && moment?.mediaUrl), [moments]);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [reactions, setReactions] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Never index out of range when the feed shrinks underneath us.
  const total = feed.length;
  const safeIndex = total > 0 ? Math.min(Math.max(index, 0), total - 1) : 0;
  const current = total > 0 ? feed[safeIndex] : null;

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIndex((prev) => {
        const from = Math.min(Math.max(prev, 0), total - 1);
        return Math.min(Math.max(from + delta, 0), total - 1);
      });
      setDraft("");
      setSendError(null);
    },
    [total]
  );

  // Vertical wheel paging, throttled by the index guard in `go`.
  useEffect(() => {
    let lock = 0;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowDown") go(1);
      if (event.key === "ArrowUp") go(-1);
    }
    function onWheel(event: WheelEvent) {
      const now = Date.now();
      if (now - lock < 450) return;
      if (Math.abs(event.deltaY) < 24) return;
      lock = now;
      go(event.deltaY > 0 ? 1 : -1);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [go]);

  function toggleReact(id: string) {
    setReactions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function sendQuickMessage() {
    if (!current || !draft.trim()) return;
    const body = draft.trim().slice(0, MAX_CAPTION);
    startTransition(async () => {
      const result = await sendFirstImpressionAction({ recipientId: current.userId, body });
      if (!result.ok) {
        setSendError(result.error ?? "Could not send your message");
        return;
      }
      setDraft("");
      setSendError(null);
      if (result.conversationId) router.push(`/messages/${result.conversationId}`);
    });
  }

  return (
    <section
      data-zone="app"
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-950"
    >
      {/* ---------------------------------------------------- top overlay */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 shrink-0">
        <div className="pointer-events-auto flex items-start gap-3 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5 sm:pt-4">
          {searchSlot ? <div className="min-w-0 flex-1">{searchSlot}</div> : null}
          {topRightSlot ? <div className="flex shrink-0 items-center gap-2">{topRightSlot}</div> : null}
        </div>

        {/* Progress bars - one segment per moment, filled up to the current. */}
        {total > 1 ? (
          <div className="pointer-events-none mt-3 flex gap-1 px-3 sm:px-5" aria-hidden>
            {feed.map((moment, i) => (
              <span
                key={moment.id}
                className={[
                  "h-0.5 flex-1 rounded-full transition-colors",
                  i <= safeIndex ? "bg-white" : "bg-white/30",
                ].join(" ")}
              />
            ))}
          </div>
        ) : null}
      </header>
      {/* -------------------------------------------------------- the media */}
      {!current ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <EmptyState icon="moments" title={emptyTitle} body={emptyBody} />
        </div>
      ) : (
        <article className="relative flex min-h-0 flex-1 items-center justify-center">
          <MediaSurface moment={current} muted={muted} />

          {/* Author + caption, bottom-left, above the composer. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 px-4 sm:bottom-28 sm:px-6">
            <div className="pointer-events-auto flex items-center gap-2.5">
              {current.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.authorAvatarUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/70"
                />
              ) : (
                <Avatar name={current.authorName ?? "Member"} size="sm" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white drop-shadow">
                  {current.authorName ?? "Member"}
                </p>
                <p className="text-[11px] text-white/70">{formatWhen(current.createdAt)}</p>
              </div>
            </div>
            {current.content ? (
              <p className="mt-2 line-clamp-3 max-w-xl text-sm leading-6 text-white/95 drop-shadow">
                {current.content}
              </p>
            ) : null}
          </div>

          {/* Vertical pager - right edge tappable zones. */}
          {total > 1 ? (
            <div className="absolute inset-y-0 right-0 z-20 flex w-12 flex-col justify-center gap-3">
              <PagerButton direction="up" onClick={() => go(-1)} disabled={safeIndex === 0} />
              <PagerButton direction="down" onClick={() => go(1)} disabled={safeIndex >= total - 1} />
            </div>
          ) : null}

          {/* Action rail - reactions + mute. */}
          <div className="absolute bottom-36 right-3 z-20 flex flex-col items-center gap-4 sm:bottom-40 sm:right-5">
            <ActionButton
              label={reactions[current.id] ? "Unlike" : "Like"}
              active={Boolean(reactions[current.id])}
              onClick={() => toggleReact(current.id)}
            >
              <Heart className="h-6 w-6" fill={reactions[current.id] ? "currentColor" : "none"} />
            </ActionButton>
            {current.mediaType === "video" ? (
              <ActionButton label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
                {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </ActionButton>
            ) : null}
          </div>
        </article>
      )}

      {/* ------------------------------------------- bottom composer pill */}
      {current ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 shrink-0 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5">
          {sendError ? (
            <p role="alert" className="mb-2 text-center text-xs text-rose-300">
              {sendError}
            </p>
          ) : null}
          <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-3 py-2 backdrop-blur-md">
            {viewerId ? (
              <>
                <label htmlFor="moment-reply" className="sr-only">
                  Send {current.authorName ?? "this member"} a message
                </label>
                <input
                  id="moment-reply"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendQuickMessage();
                  }}
                  maxLength={MAX_CAPTION}
                  placeholder={`Message ${current.authorName ?? "them"}…`}
                  className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={sendQuickMessage}
                  disabled={!draft.trim() || isPending}
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-400 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </>
            ) : (
              <p className="flex flex-1 items-center justify-center gap-2 px-2 py-1.5 text-sm text-white/80">
                <MessageCircle className="h-4 w-4" />
                Sign in to start a conversation
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The media surface. Images and videos share a full-bleed object-cover box, so
 * the viewer never letterboxes or shifts layout between media types.
 */
function MediaSurface({ moment, muted }: { moment: MomentView; muted: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Autoplay can be rejected (Low Power Mode, data saver). Swallow the rejection
  // rather than surfacing an error - the first frame is still visible.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    void video.play().catch(() => undefined);
  }, [muted, moment.id]);

  if (moment.mediaType === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        ref={videoRef}
        key={moment.id}
        src={moment.mediaUrl}
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="auto"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={moment.mediaUrl}
      alt={moment.content || "Shared moment"}
      className="h-full w-full object-cover"
    />
  );
}

function PagerButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "up" | "down";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "up" ? "Previous moment" : "Next moment"}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 disabled:opacity-20"
    >
      {direction === "up" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 15 6-6 6 6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
    </button>
  );
}

function ActionButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={[
        "flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/60 backdrop-blur-sm transition hover:scale-105",
        active ? "text-rose-400" : "text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Compact relative timestamp for the overlay. */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
