import type { ContentItem } from "@/lib/models/content";

export interface HeroSlide {
  id: string;
  url: string;
  kind: "image" | "video";
  title: string;
  description?: string;
  poster?: string;
  destinationUrl?: string;
  buttonText?: string;
}

/** Flatten all files, preserving the server's priority order and each upload's order. */
export function buildHeroSlides(items: ContentItem[]): HeroSlide[] {
  return items.flatMap((item) => {
    const urls = [...new Set([item.mediaUrl, ...(item.mediaUrls ?? [])].filter(
      (url): url is string => typeof url === "string" && url.trim().length > 0
    ))];
    return urls.map((url, index) => {
      // Mixed uploads share a content-level mediaType. Prefer each file's extension,
      // ignoring signed URL query strings; use the declared type for opaque URLs.
      const pathname = url.split(/[?#]/)[0];
      const kind = /\.(mp4|webm|mov|m4v|ogv)$/i.test(pathname) ? "video"
        : /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(pathname) ? "image"
        : item.mediaType;
      return {
        id: `${item.id}:${index}`,
        url,
        kind,
        title: item.title,
        description: item.description,
        poster: item.thumbnailUrl,
        destinationUrl: item.destinationUrl,
        buttonText: item.buttonText,
      };
    });
  });
}
