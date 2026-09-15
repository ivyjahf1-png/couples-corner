import "server-only";

import Link from "next/link";
import { getPublishedForPlacement } from "@/lib/server/content";
import type { ContentItem } from "@/lib/models";

/**
 * Full-width hero banner that displays the highest-priority featured advert
 * from the shared `content` table. Renders nothing when no matching advert
 * exists, so it degrades gracefully.
 */
export async function AdvertBanner() {
  const items = await getPublishedForPlacement("hero");

  // Pick the highest-priority hero item (lowest priority number = most important)
  const hero = items.find((i) => i.category === "advertisement" || i.category === "featured") ?? items[0];

  if (!hero) return null;

  const isExternal = hero.destinationUrl?.startsWith("http");

  return (
    <section className="landing-section bg-surface-muted">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-card">
          {/* Media area */}
          <div className="relative aspect-[21/9] w-full overflow-hidden">
            {hero.mediaType === "video" ? (
              <video
                src={hero.mediaUrl}
                poster={hero.thumbnailUrl}
                className="h-full w-full object-cover"
                controls
                preload="metadata"
                playsInline
              />
            ) : (
              /* eslint-disable @next/next/no-img-element */
              <img
                src={hero.mediaUrl}
                alt={hero.title}
                className="h-full w-full object-cover"
                loading="eager"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* "Featured" badge */}
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-brand-600/90 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Featured
            </span>
          </div>

          {/* Content overlay */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 sm:p-8">
            <h2 className="max-w-xl text-2xl font-bold tracking-display text-white drop-shadow-md sm:text-3xl">
              {hero.title}
            </h2>
            {hero.description ? (
              <p className="max-w-lg text-sm leading-6 text-white/90 drop-shadow-sm">
                {hero.description}
              </p>
            ) : null}
            {hero.destinationUrl ? (
              isExternal ? (
                <a
                  href={hero.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
                >
                  {hero.buttonText ?? "Learn more"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M7 17L17 7" />
                    <path d="M8 7h9v9" />
                  </svg>
                </a>
              ) : (
                <Link
                  href={hero.destinationUrl}
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
                >
                  {hero.buttonText ?? "Learn more"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="M13 5l7 7-7 7" />
                  </svg>
                </Link>
              )
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
