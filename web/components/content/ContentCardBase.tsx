import { Chip } from "@/components/ui/Chip";
import { MediaCarousel, type CarouselMedia } from "./MediaCarousel";
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
 * - Media renders in an auto-advancing carousel: images dwell for 7 seconds,
 *   videos play fully through (advance on `onEnded`).
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

  const urls = item.mediaUrls.length > 0 ? item.mediaUrls : (item.mediaUrl ? [item.mediaUrl] : []);
  const carouselItems: CarouselMedia[] = urls.map((url) => ({
    url,
    kind: item.mediaType === "image" || /\.(jpg|jpeg|png|webp)$/i.test(url) ? "image" : "video",
  }));

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border border-ink-700 bg-surface shadow-card",
        className ?? "",
      ].join(" ").trim()}
    >
      <div className="flex flex-col gap-3 p-5">
        <Chip tone="brand">{LABEL[item.category]}</Chip>
        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
        {item.description ? (
          <p className="text-sm leading-6 text-ink-300">{item.description}</p>
        ) : null}

        {carouselItems.length > 0 ? (
          <MediaCarousel
            items={carouselItems}
            poster={item.thumbnailUrl ?? undefined}
            title={item.title}
            slideClassName={featureMedia ? "h-80 sm:h-[28rem]" : "h-72 sm:h-96"}
          />
        ) : null}

        {href && item.buttonText ? (
          <a
            href={href}
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="inline-flex h-10 w-fit items-center justify-center rounded-xl bg-orange-600 px-4 text-sm font-medium text-white transition hover:bg-orange-500"
          >
            {item.buttonText}
          </a>
        ) : null}
      </div>
    </article>
  );
}
