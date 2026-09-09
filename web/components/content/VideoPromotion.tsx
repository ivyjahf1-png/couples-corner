import { ContentCardBase } from "./ContentCardBase";
import type { ContentItem } from "@/lib/models";

/** Video promotion — has a poster, is never set to autoplay, and never plays with sound. */
export function VideoPromotion({
  item,
  className,
}: {
  item: ContentItem;
  className?: string;
}) {
  return <ContentCardBase item={item} className={className} featureMedia />;
}
