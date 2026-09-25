"use client";

import { useCallback, useState } from "react";
import { MediaCarousel, type CarouselMedia } from "@/components/content/MediaCarousel";

export interface TestimonialShowcaseProps {
  items: CarouselMedia[];
  /** Caption shown under the active slide, keyed by media URL. */
  captions: Record<string, string>;
  /** Optional per-slide story link, keyed by media URL. */
  links?: Record<string, string>;
}

/**
 * Wide testimonial slideshow for success stories of couples who met on
 * Couple's Corner. Media, captions, and links are managed by admins through
 * the content system (placement "testimonials"). Auto-scrolls: images dwell
 * for a set duration, videos advance on onEnded via MediaCarousel.
 */
export function TestimonialShowcase({ items, captions, links }: TestimonialShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const handleIndexChange = useCallback((index: number) => setActiveIndex(index), []);

  if (items.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <p className="px-6 text-center text-sm text-white/50">
          Success stories coming soon — check back after our next featured couples are announced.
        </p>
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, items.length - 1);
  const active = items[safeIndex];
  const activeLink = links?.[active.url];

  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl">
      <MediaCarousel
        items={items}
        title="Couples' success stories"
        slideClassName="h-72 sm:h-[26rem]"
        onIndexChange={handleIndexChange}
      />
      <figcaption className="min-h-[3.5rem] px-5 py-4 text-center text-sm leading-relaxed text-white/75">
        {captions[active.url] ?? "Real couples. Real stories."}
      </figcaption>
      {activeLink ? (
        <div className="flex justify-center pb-5">
          <a
            href={activeLink}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            Read their story →
          </a>
        </div>
      ) : null}
    </figure>
  );
}
