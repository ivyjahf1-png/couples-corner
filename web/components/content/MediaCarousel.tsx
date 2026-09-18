"use client";

import { useCallback, useEffect, useState } from "react";

/** Images display for this long before the carousel advances. */
const IMAGE_DISPLAY_MS = 7000;

export interface CarouselMedia {
  url: string;
  kind: "image" | "video";
}

/**
 * Auto-advancing media carousel for admin-uploaded content.
 *
 * Playback rules:
 * - Images are shown for 7 seconds, then the next slide appears.
 * - Videos play through completely; the carousel advances on `onEnded`.
 *
 * Only the active slide is mounted, so background videos never consume
 * bandwidth or play audio while hidden.
 */
export function MediaCarousel({
  items,
  poster,
  title,
  slideClassName = "h-72 sm:h-96",
  onIndexChange,
}: {
  items: CarouselMedia[];
  /** Poster/thumbnail shown for videos that lack their own. */
  poster?: string;
  title: string;
  /** Height classes applied to each slide. Taller than the old aspect-video. */
  slideClassName?: string;
  /** Optional callback fired whenever the active slide changes. */
  onIndexChange?: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const count = items.length;
  const current = items[Math.min(index, count - 1)];

  const goTo = useCallback(
    (next: number) => {
      setIndex(next);
      onIndexChange?.(next);
    },
    [onIndexChange],
  );

  const advance = useCallback(() => {
    goTo((index + 1) % count);
  }, [goTo, index, count]);

  // Images: fixed 7-second dwell. Videos advance via onEnded instead.
  useEffect(() => {
    if (!current || current.kind !== "image") return;
    const timer = window.setTimeout(advance, IMAGE_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [current, advance]);

  if (!current) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-ink-700 bg-ink-900"
      role="group"
      aria-roledescription="carousel"
      aria-label={`${title} media`}
    >
      <div className={["relative w-full", slideClassName].join(" ")}>
        {current.kind === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={current.url}
            src={current.url}
            alt={`${title} — media ${index + 1} of ${count}`}
            className="h-full w-full object-cover"
          />
        ) : (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video
            key={current.url}
            src={current.url}
            poster={poster ?? undefined}
            controls
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={advance}
            className="h-full w-full object-contain"
          />
        )}
      </div>

      {count > 1 ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5">
          {items.map((m, i) => (
            <button
              key={m.url}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show media ${i + 1} of ${count}`}
              aria-current={i === index}
              className={[
                "h-1.5 rounded-full transition-all",
                i === index
                  ? "w-5 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/80",
              ].join(" ")}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}