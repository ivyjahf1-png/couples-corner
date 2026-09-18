import "server-only";

import { getPublishedForPlacement } from "@/lib/server/content";
import { buildHeroSlides } from "@/lib/utils/hero-slides";
import { HeroImageMarquee } from "./HeroImageMarquee";
import { HeroMediaCarousel } from "./HeroMediaCarousel";

/**
 * All published, in-window hero uploads, isolated from the landing layout.
 *
 * Rendering strategy:
 * - Multiple image slides → seamless auto-scrolling image marquee.
 * - Single slide, or video content (which needs playback controls) → the
 *   existing full-bleed carousel.
 */
export async function AdvertBanner() {
  const items = await getPublishedForPlacement("hero");
  const slides = buildHeroSlides(items);
  if (!slides.length) return null;

  // Remount playback only when the actual playlist changes, not on parent renders.
  const playlistKey = JSON.stringify(slides.map(({ id, url, kind }) => [id, url, kind]));

  const imageSlides = slides.filter((slide) => slide.kind === "image");
  if (imageSlides.length > 1) {
    return <HeroImageMarquee key={playlistKey} slides={imageSlides} />;
  }

  return <HeroMediaCarousel key={playlistKey} slides={slides} />;
}
