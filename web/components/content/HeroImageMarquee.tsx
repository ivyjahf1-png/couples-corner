"use client";

import type { HeroSlide } from "@/lib/utils/hero-slides";

/**
 * Seamless auto-scrolling hero image marquee.
 *
 * HOW THE INFINITE LOOP WORKS: the slide list is rendered twice inside one
 * flex track. The track animates translateX from 0 to exactly -50% of its own
 * width (i.e. the width of one full copy of the list) on a linear, infinite
 * timing function. When the first copy has fully scrolled out, the second copy
 * occupies precisely where the first started — so the loop restarts with zero
 * visual jump or reset.
 *
 * The animation never pauses: no hover-pause, no slide timers. Reduced-motion
 * users get a statically rendered, horizontally scrollable strip instead.
 */
export function HeroImageMarquee({ slides }: { slides: HeroSlide[] }) {
  if (slides.length < 2) return null;

  // Duration scales with content length so the scroll speed stays constant
  // regardless of how many slides the admin has published.
  const durationSeconds = Math.max(30, slides.length * 7);

  return (
    <div
      className="hero-marquee relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2.5rem] shadow-2xl shadow-black/50"
      role="region"
      aria-roledescription="marquee"
      aria-label="Featured couples moments gallery"
    >
      {/* Atmospheric blend masks — dissolve the card edges into the hero
          background instead of hard-clipping at the rounded border. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent sm:w-24" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-slate-950/90 via-slate-950/40 to-transparent sm:w-24" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-slate-950/60 to-transparent sm:h-12" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-slate-950/80 to-transparent sm:h-20" aria-hidden="true" />

      <ul
        className="hero-marquee-track flex w-max gap-4 py-4 sm:gap-6"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {/* Two identical copies → -50% translate = exactly one full loop. */}
        {[...slides, ...slides].map((slide, i) => (
          <li
            key={`${slide.id}:${i}`}
            aria-hidden={i >= slides.length}
            className="hero-marquee-card relative w-56 shrink-0 overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50 ring-1 ring-orange-400/20 transition-shadow duration-500 hover:shadow-orange-500/30 sm:w-72"
          >
            <div className="aspect-[4/5] w-full sm:aspect-[3/4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.url}
                alt={i < slides.length ? slide.title : ""}
                className="h-full w-full object-cover"
                loading={i < slides.length ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
            {/* Bottom gradient overlay for depth + caption legibility. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1120]/85 via-[#1E293B]/10 to-transparent" aria-hidden="true" />
            {/* Floating glassmorphism caption badge. */}
            <div className="pointer-events-none absolute inset-x-3 bottom-3">
              <p className="inline-flex max-w-full items-center gap-1.5 truncate rounded-2xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" aria-hidden="true" />
                <span className="truncate">{slide.title}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}