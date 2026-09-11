import "server-only";
import { getPublishedForPlacement } from "@/lib/server/content";

/**
 * Landing-page hero slot — admin-managed.
 *
 * Pulls published, currently-in-window content assigned to the `hero`
 * placement (highest priority first) and renders it as the hero photograph,
 * or an autoplay-muted background video when the top item is a video.
 *
 * If no hero content is configured yet, this renders nothing and the
 * page's own gradient fallback shows instead (see the marketing hero).
 */
export async function HeroSlot({ className }: { className?: string }) {
  let items;
  try {
    items = await getPublishedForPlacement("hero");
  } catch {
    return null;
  }

  if (!items || items.length === 0) return null;
  const hero = items[0];

  return (
    <div className={className}>
      {hero.mediaType === "video" && hero.mediaUrl ? (
        <video
          src={hero.mediaUrl}
          poster={hero.thumbnailUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={hero.title}
          className="h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero.mediaUrl}
          alt={hero.title}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}