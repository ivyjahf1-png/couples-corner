import { Chip } from "@/components/ui/Chip";
import type { ContentItem } from "@/lib/models";

/** Prominent disclosure labels so promotional content is never mistaken for a normal post or profile. */
const LABEL: Record<ContentItem["category"], string> = {
  advertisement: "Sponsored",
  photo: "Advertisement",
  video: "Advertisement",
  announcement: "Couples Corner Official",
  featured: "Featured",
};

/**
 * A single presentational promotional card used across placements.
 * - Media never autoplays (videos use a poster and manual controls).
 * - Images lazy-load to respect bandwidth.
 * - CTA links to external destinations open in a new tab with rel="noopener";
 *   in-app "/..." destinations render as plain internal anchors.
 */
export function ContentCardBase({
  item,
  className,
  featureMedia = false,
}: {
  item: ContentItem;
  className?: string;
  featureMedia?: boolean;
}) {
  const href = item.destinationUrl;
  const isExternal = href ? /^https?:\/\//i.test(href) : false;

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-card",
        className ?? "",
      ].join(" ").trim()}
    >
      <div className="flex flex-col gap-3 p-5">
        <Chip tone="brand">{LABEL[item.category]}</Chip>
        <h3 className="text-lg font-semibold text-ink-900">{item.title}</h3>
        {item.description ? (
          <p className="text-sm leading-6 text-ink-600">{item.description}</p>
        ) : null}

        {item.mediaUrl && item.mediaType === "image" ? (
          /* eslint-disable @next/next/no-img-element */
          <img
            src={item.mediaUrl}
            alt=""
            loading="lazy"
            className={[
              "w-full rounded-xl border border-ink-200 bg-surface-muted object-cover",
              featureMedia ? "aspect-[16/9]" : "aspect-video",
            ].join(" ")}
          />
        ) : null}

        {item.mediaUrl && item.mediaType === "video" ? (
          <video
            src={item.mediaUrl}
            poster={item.thumbnailUrl ?? undefined}
            controls
            preload="metadata"
            playsInline
            className="w-full rounded-xl border border-ink-200 bg-ink-900 object-contain"
          />
        ) : null}

        {href && item.buttonText ? (
          <a
            href={href}
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="inline-flex h-10 w-fit items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-medium text-white transition hover:bg-brand-800"
          >
            {item.buttonText}
          </a>
        ) : null}
      </div>
    </article>
  );
}