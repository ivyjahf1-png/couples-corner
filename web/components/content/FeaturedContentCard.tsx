import { ContentCardBase } from "./ContentCardBase";
import type { ContentItem } from "@/lib/models";

/** Featured content card (couples pick / editorial highlight). */
export function FeaturedContentCard({
  item,
  className,
}: {
  item: ContentItem;
  className?: string;
}) {
  return <ContentCardBase item={item} className={className} featureMedia />;
}
