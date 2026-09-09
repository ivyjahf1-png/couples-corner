import { ContentCardBase } from "./ContentCardBase";
import type { ContentItem } from "@/lib/models";

/** Announcement card, labelled "Couples Corner Official". */
export function AnnouncementCard({
  item,
  className,
}: {
  item: ContentItem;
  className?: string;
}) {
  return <ContentCardBase item={item} className={className} />;
}
