import { ContentCardBase } from "./ContentCardBase";
import type { ContentItem } from "@/lib/models";

/** Horizontal promotional banner for photo / banner placements. */
export function PromotionalBanner({
  item,
  className,
}: {
  item: ContentItem;
  className?: string;
}) {
  return <ContentCardBase item={item} className={className} featureMedia />;
}
