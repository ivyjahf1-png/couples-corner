import "server-only";

import { getPublishedForPlacement } from "@/lib/server/content";
import { MediaCarousel, type CarouselMedia } from "./MediaCarousel";
import type { ContentItem } from "@/lib/models";

/**
 * Large, immersive media cards for the public landing page, fed directly from
 * admin-uploaded content assigned to the `homepage` placement.
 *
 * - Renders published items (images + videos) with the shared auto-advancing
 *   carousel (images dwell 7s, videos advance on `onEnded`).
 * - Layout is responsive and stable at any media aspect ratio (fixed-height
 *   slides with `object-cover` / `object-contain`), on mobile and desktop.
 * - Returns null when nothing is published or the content service fails, so
 *   the landing page falls back to its static feature cards.
 */
export async function LandingFeatureMedia() {
  let items: ContentItem[] = [];
  try {
    items = (await getPublishedForPlacement("homepage")).filter(
      (item) => item.mediaUrl || item.mediaUrls.length > 0
    );
  } catch {
    return null;
  }

  if (items.length === 0) return null;

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const urls = item.mediaUrls.length > 0 ? item.mediaUrls : item.mediaUrl ? [item.mediaUrl] : [];
        const carouselItems: CarouselMedia[] = urls.map((url) => ({
          url,
          kind:
            item.mediaType === "image" || /\.(jpg|jpeg|png|webp)$/i.test(url)
              ? "image"
              : "video",
        }));
        const isExternal = item.destinationUrl
          ? /^https?:\/\//i.test(item.destinationUrl)
          : false;
        const cta = item.destinationUrl && item.buttonText ? (
          isExternal ? (
            <a
              href={item.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-xl bg-[#FF5722] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#F4511E]"
            >
              {item.buttonText}
            </a>
          ) : (
            <a
              href={item.destinationUrl}
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-xl bg-[#FF5722] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#F4511E]"
            >
              {item.buttonText}
            </a>
          )
        ) : null;

        return (
          <article
            key={item.id}
            className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur-md transition hover:border-orange-500/30"
          >
            {carouselItems.length > 0 ? (
              <MediaCarousel
                items={carouselItems}
                poster={item.thumbnailUrl ?? undefined}
                title={item.title}
                slideClassName="h-80 sm:h-[26rem]"
              />
            ) : null}
            <div className="flex flex-1 flex-col gap-3 p-6">
              <h3 className="text-xl font-bold text-white">{item.title}</h3>
              {item.description ? (
                <p className="text-sm leading-relaxed text-white/70">{item.description}</p>
              ) : null}
              {cta}
            </div>
          </article>
        );
      })}
    </div>
  );
}
