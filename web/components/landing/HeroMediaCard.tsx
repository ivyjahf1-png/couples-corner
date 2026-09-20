"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/landing/Icon";
import type { HeroSlide } from "@/lib/utils/hero-slides";

/** Idle dwell time before an image (admin ad) slide auto-advances. */
const IMAGE_DISPLAY_MS = 7000;

/** Glassmorphism border shared by the media frame and the preview dialog. */
const GLASS_BORDER = "border border-slate-700/80";

export interface HeroMediaCardProps {
  /** Published, in-window hero media from the admin-managed `hero` placement. */
  slides: HeroSlide[];
  /** Copy for the panel shown when the admin has not published hero media yet. */
  fallbackTitle?: string;
  fallbackDescription?: string;
  fallbackHref?: string;
  fallbackLabel?: string;
}

/**
 * Featured hero media card — the right-hand column of the landing hero.
 *
 * - Tall portrait frame (`min-h-[520px]` / `lg:min-h-[600px]`) with no visible
 *   border: the card blends seamlessly into the dark page background via a
 *   subtle backdrop blur and outer glow, giving uploaded promotional images
 *   plenty of vertical room.
 * - Interactive, centred play button overlay: on a video slide it starts/pauses
 *   inline playback (with audio); on an image/ad slide it opens the full-screen
 *   preview dialog. The top-right control always opens the preview dialog.
 * - Image slides rotate on a fixed dwell timer; videos advance on `onEnded`
 *   (mirroring the existing hero carousel behaviour).
 * - Falls back to a branded panel when no hero content is published.
 */
export function HeroMediaCard({
  slides,
  fallbackTitle = "Real couples, real milestones",
  fallbackDescription = "Relationship insights, a supportive community, and local meetups — everything you need to grow together.",
  fallbackHref = "/about",
  fallbackLabel = "See how it works",
}: HeroMediaCardProps) {
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const playButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  const count = slides.length;
  const index = count ? position % count : 0;
  const current = slides[index];

  const advance = useCallback(() => {
    setPlaying(false);
    setPosition((value) => value + 1);
  }, []);

  // Portals require the DOM, so the preview only mounts after hydration.
  useEffect(() => setMounted(true), []);

  // Image slides (admin ads) rotate on a fixed dwell timer. Videos advance on
  // their own `onEnded` event, and rotation pauses while a preview is open.
  useEffect(() => {
    if (!current || current.kind !== "image" || count < 2 || previewOpen) return;
    const timer = window.setTimeout(advance, IMAGE_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [current, position, count, previewOpen, advance]);

  // Leaving a slide always returns it to its poster/starting state.
  useEffect(() => {
    setPlaying(false);
    const player = video.current;
    if (!player) return;
    player.pause();
    player.currentTime = 0;
  }, [index]);

  // Preview dialog lifecycle: lock page scroll, focus the close control, and
  // close on Escape (which also restores focus to the play button).
  useEffect(() => {
    if (!previewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
        playButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [previewOpen]);

  /** Play/pause the featured video inline (unmuted — the click is the gesture). */
  const togglePlayback = useCallback(() => {
    const player = video.current;
    if (!player) return;
    if (player.paused) {
      setMuted(false);
      player
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      player.pause();
      setPlaying(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    playButton.current?.focus();
  }, []);

  const frameClass = `group relative min-h-[520px] lg:min-h-[600px] w-full overflow-hidden rounded-3xl border-none bg-slate-950/20 shadow-2xl shadow-black/40 backdrop-blur-md transition duration-500 hover:shadow-orange-900/20`;
  if (!current) {
    return (
      <div className={frameClass} role="img" aria-label={fallbackTitle}>
        <div className="hero-photo absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-3xl bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start justify-end gap-4 p-6 pb-16 sm:p-8 sm:pb-16">
          <h2 className="max-w-sm text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
            {fallbackTitle}
          </h2>
          <p className="max-w-sm text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
            {fallbackDescription}
          </p>
          <Link
            href={fallbackHref}
            className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#FF5722] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#F4511E] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-purple-950"
          >
            {fallbackLabel}
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  const isVideo = current.kind === "video";
  const isExternal = /^https?:\/\//i.test(current.destinationUrl ?? "");
  const captionCtaClass =
    "pointer-events-auto inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-600/70 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:border-orange-400/60 hover:bg-slate-900/80 hover:text-orange-200";
  const ctaNode = current.destinationUrl ? (
    isExternal ? (
      <a
        href={current.destinationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={captionCtaClass}
      >
        {current.buttonText ?? "Learn more"}
      </a>
    ) : (
      <Link href={current.destinationUrl} className={captionCtaClass}>
        {current.buttonText ?? "Learn more"}
      </Link>
    )
  ) : null;

  return (
    <>
      <div
        className={frameClass}
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured media from Couple's Corner"
      >
        {isVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={current.id}
            ref={video}
            src={current.url}
            poster={current.poster}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            controls={playing}
            muted={muted}
            loop={count === 1}
            playsInline
            preload="metadata"
            onEnded={count > 1 ? advance : undefined}
            onPause={() => setPlaying(false)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.url}
            alt={current.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            loading="eager"
          />
        )}

        {/* Depth gradient so the caption stays legible over any media. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"
          aria-hidden="true"
        />

        {/* Glass badge (top-left). */}
        <span className="pointer-events-none absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-slate-600/70 bg-slate-900/40 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white shadow-lg backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" aria-hidden="true" />
          {isVideo ? "Featured video" : "Featured ad"}
        </span>

        {/* Slide counter + full-screen preview control (top-right). */}
        <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
          {count > 1 ? (
            <span className="pointer-events-none inline-flex items-center rounded-2xl border border-slate-600/70 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
              {index + 1} / {count}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label={`Open full-screen preview of ${current.title}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900/40 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:border-orange-400/60 hover:bg-slate-900/70 hover:text-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
            </svg>
          </button>
        </div>

        {/* Centered interactive play / pause overlay. */}
        <button
          ref={playButton}
          type="button"
          onClick={isVideo ? togglePlayback : () => setPreviewOpen(true)}
          aria-label={
            isVideo ? (playing ? `Pause ${current.title}` : `Play ${current.title}`) : `Preview ${current.title}`
          }
          className={[
            "absolute left-1/2 top-1/2 inline-flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-2xl backdrop-blur-md transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
            GLASS_BORDER,
            playing
              ? "bg-slate-900/30 opacity-60 hover:opacity-100"
              : "bg-slate-900/40 hover:scale-105 hover:border-orange-400/70 hover:bg-slate-900/60",
          ].join(" ")}
        >
          {playing ? (
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="7" y="5" width="3.5" height="14" rx="1.25" />
              <rect x="13.5" y="5" width="3.5" height="14" rx="1.25" />
            </svg>
          ) : (
            <svg className="h-7 w-7 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 6.5v11a1 1 0 0 0 1.53.85l8.5-5.5a1 1 0 0 0 0-1.7l-8.5-5.5A1 1 0 0 0 9 6.5Z" />
            </svg>
          )}
        </button>

        {/* Caption: admin title, description and optional CTA — cinematic
            bottom-fade overlay pinned to the card's lower edge. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 rounded-b-3xl bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-6 pb-16 sm:p-8 sm:pb-16">
          <h3 className="max-w-md text-lg font-bold leading-snug tracking-tight text-white drop-shadow-md sm:text-xl">
            {current.title}
          </h3>
          {current.description ? (
            <p className="max-w-md text-sm leading-6 text-white/80 drop-shadow-sm">{current.description}</p>
          ) : null}
          {ctaNode}
        </div>

        {/* Slide navigation (glass pill, centered). */}
        {count > 1 ? (
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-600/70 bg-slate-900/50 px-3 py-1.5 backdrop-blur-md">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setPosition(i)}
                aria-label={`Show featured media ${i + 1} of ${count}`}
                aria-current={i === index}
                className={[
                  "h-1.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400",
                  i === index ? "w-5 bg-orange-400" : "w-1.5 bg-white/50 hover:bg-white/80",
                ].join(" ")}
              />
            ))}
          </div>
        ) : null}
      </div>

      {mounted && previewOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-label={`${current.title} — full-screen preview`}
              onClick={closePreview}
            >
              <div
                className={`relative w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-900/70 shadow-2xl shadow-black/50 ${GLASS_BORDER}`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  ref={closeButton}
                  type="button"
                  onClick={closePreview}
                  aria-label="Close preview"
                  className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600/70 bg-slate-950/60 text-white backdrop-blur-md transition hover:border-orange-400/60 hover:text-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
                {isVideo ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    key={`preview:${current.id}`}
                    src={current.url}
                    poster={current.poster}
                    className="max-h-[70vh] w-full bg-black object-contain"
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.url}
                    alt={current.title}
                    className="max-h-[70vh] w-full object-contain"
                  />
                )}
                <div className="flex flex-col items-start gap-3 p-5 sm:p-6">
                  <h3 className="text-lg font-bold leading-snug text-white sm:text-xl">{current.title}</h3>
                  {current.description ? (
                    <p className="text-sm leading-6 text-white/70">{current.description}</p>
                  ) : null}
                  {ctaNode}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

