import "server-only";
import { getPublishedForPlacement } from "@/lib/server/content";
import type { ContentItem, ContentPlacement } from "@/lib/models";
import { PromotionalBanner } from "./PromotionalBanner";
import { SponsoredContentCard } from "./SponsoredContentCard";
import { FeaturedContentCard } from "./FeaturedContentCard";
import { AnnouncementCard } from "./AnnouncementCard";
import { VideoPromotion } from "./VideoPromotion";

/**
 * Server component that renders the published, currently-in-window content for
 * a placement, ordered by priority (rotation). Only content that is published,
 * within its start/end window, and assigned to this placement is ever shown.
 *
 * If Firebase isn't configured yet (no Admin credentials / data), this safely
 * renders nothing rather than throwing — an intentional empty promotional slot.
 */
export async function ContentSlot({
  placement,
  limit = 1,
  className,
}: {
  placement: ContentPlacement;
  limit?: number;
  className?: string;
}) {
  let items: ContentItem[] = [];
  try {
    items = await getPublishedForPlacement(placement);
  } catch {
    return null;
  }

  if (items.length === 0) return null;

  const shown = items.slice(0, limit);
  return (
    <div className="flex flex-col gap-4">
      {shown.map((item) => (
        <ContentDisplay key={item.id} item={item} className={className} />
      ))}
    </div>
  );
}

function ContentDisplay({ item, className }: { item: ContentItem; className?: string }) {
  switch (item.category) {
    case "video":
      return <VideoPromotion item={item} className={className} />;
    case "announcement":
      return <AnnouncementCard item={item} className={className} />;
    case "featured":
      return <FeaturedContentCard item={item} className={className} />;
    case "photo":
      return <PromotionalBanner item={item} className={className} />;
    case "advertisement":
    default:
      return <SponsoredContentCard item={item} className={className} />;
  }
}
