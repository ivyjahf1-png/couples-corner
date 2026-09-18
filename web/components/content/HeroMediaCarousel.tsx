"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroSlide } from "@/lib/utils/hero-slides";

const IMAGE_DISPLAY_MS = 5000;

/**
 * Fully-autonomous hero media carousel. Only the active slide is mounted so
 * background videos never consume bandwidth or play audio while hidden.
 *
 * Images rotate on a fixed 5s timer; videos autoplay and advance to the next
 * slide automatically when playback completes (`onEnded`). No pause/overlay
 * controls are rendered so the media view stays completely clean.
 */
export function HeroMediaCarousel({ slides }: { slides: HeroSlide[] }) {
  const [position, setPosition] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const count = slides.length;
  const index = count ? position % count : 0;
  const current = slides[index];
  const advance = useCallback(() => setPosition((value) => value + 1), []);

  // Auto-advance for images on a fixed 5s timer. Videos are excluded here —
  // they advance on their own `onEnded` event instead.
  useEffect(() => {
    if (!current || current.kind !== "image" || count < 2) return;
    const timer = window.setTimeout(advance, IMAGE_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [current, position, count, advance]);

  // Keep the active video playing. Autoplay is best-effort: if the browser
  // blocks it, native controls remain available as a fallback.
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    void player.play().catch(() => {});
  }, [position, current]);

  if (!current) return null;
  const external = /^https?:\/\//i.test(current.destinationUrl ?? "");
  const ctaClass = "pointer-events-auto inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:to-orange-500";

  return (
    <div
      className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 shadow-2xl shadow-purple-950/50 ring-1 ring-white/5 backdrop-blur-sm transition-shadow duration-700 hover:shadow-orange-900/20"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured hero media"
    >
      <div className="relative aspect-[21/9] w-full overflow-hidden" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${count}: ${current.title}`}>
        {current.kind === "video" ? (
          <video
            key={`${current.id}:${position}`}
            ref={video}
            src={current.url}
            poster={current.poster}
            className="h-full w-full transform object-cover transition-transform duration-700 group-hover:scale-105"
            controls
            autoPlay
            muted
            playsInline
            preload="metadata"
            onEnded={advance}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${current.id}:${position}`} src={current.url} alt={current.title} className="h-full w-full transform object-cover transition-transform duration-700 group-hover:scale-105" loading="eager" />
        )}
        {/* Soft gradient overlay at the bottom for depth + text legibility. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-purple-950/90 via-purple-950/30 to-transparent" />
        {/* Floating glassmorphism badge (top-left). */}
        <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white shadow-lg backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" aria-hidden="true" />
          Featured
        </span>
        {/* Floating glassmorphism slide-position card (top-right). */}
        {count > 1 ? (
          <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
            {index + 1} / {count}
          </span>
        ) : null}
      </div>

      <div className={`pointer-events-none absolute inset-x-0 flex flex-col gap-3 p-6 sm:p-8 ${current.kind === "video" ? "bottom-12" : "bottom-0"}`}>
        <h2 className="max-w-xl text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl">{current.title}</h2>
        {current.description ? <p className="max-w-lg text-sm leading-6 text-white/90 drop-shadow-sm">{current.description}</p> : null}
        {current.destinationUrl ? external ? (
          <a href={current.destinationUrl} target="_blank" rel="noopener noreferrer" className={ctaClass}>{current.buttonText ?? "Learn more"}</a>
        ) : (
          <Link href={current.destinationUrl} className={ctaClass}>{current.buttonText ?? "Learn more"}</Link>
                ) : null}
      </div>
    </div>
  );
}
