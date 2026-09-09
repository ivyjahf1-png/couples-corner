import { ContentCardBase } from "./ContentCardBase";
import type { ContentItem } from "@/lib/models";

/** Sponsored / advertisement card, clearly disclosed as such. */
export function SponsoredContentCard({
  item,
  className,
}: {
  item: ContentItem;
  className?: string;
}) {
  return <ContentCardBase item={item} className={className} />;
}
