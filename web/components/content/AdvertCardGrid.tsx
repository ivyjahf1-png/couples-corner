import "server-only";

import Link from "next/link";
import { getPublishedForPlacement } from "@/lib/server/content";
import type { ContentItem, ContentPlacement } from "@/lib/models";

/**
 * A responsive grid of advert cards pulled from the shared `content` table.
 * Renders nothing when no matching adverts exist.
 */
export async function AdvertCardGrid({
  placement,
  limit = 10,
  columns = 3,
}: {
  placement: ContentPlacement;
  limit?: number;
  columns?: 2 | 3 | 4;
}) {
  const items = (await getPublishedForPlacement(placement)).slice(0, limit);

  if (items.length === 0) return null;

  const gridCols =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-6 ${gridCols}`}>
      {items.map((item) => (
        <AdvertCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function AdvertCard({ item }: { item: ContentItem }) {
  const isExternal = item.destinationUrl?.startsWith("http");

  const cardContent = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-card transition hover:shadow-lifted">
      {/* Media */}
      <div className="relative aspect-video w-full overflow-hidden bg-ink-100">
        {item.mediaType === "video" ? (
          <video
            src={item.mediaUrl}
            poster={item.thumbnailUrl}
            className="h-full w-full object-cover transition group-hover:scale-105"
            preload="metadata"
            playsInline
            muted
          />
        ) : (
          /* eslint-disable @next/next/no-img-element */
          <img
            src={item.mediaUrl}
            alt={item.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        )}
        {/* "Sponsored" badge */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink-900/80 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-brand-300" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Sponsored
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-base font-semibold leading-6 text-ink-900 line-clamp-2">
          {item.title}
        </h3>
        {item.description ? (
          <p className="text-sm leading-5 text-ink-600 line-clamp-3">
            {item.description}
          </p>
        ) : null}
        {item.buttonText ? (
          <span className="mt-auto pt-2 text-sm font-medium text-brand-600 group-hover:text-brand-700">
            {item.buttonText}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!item.destinationUrl) return cardContent;

  if (isExternal) {
    return (
      <a
        href={item.destinationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded-2xl"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link
      href={item.destinationUrl}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded-2xl"
    >
      {cardContent}
    </Link>
  );
}
