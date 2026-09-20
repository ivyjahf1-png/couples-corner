import Link from "next/link";
import type { ContentItem } from "@/lib/models/content";

/**
 * "Local Meetups & Events" board. Renders active admin announcements/events
 * fetched server-side via getPublishedForPlacement("events"). The landing page
 * is force-dynamic, so newly published items appear on the next request
 * without a rebuild.
 */
export function EventsBoard({ items }: { items: ContentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] border border-white/6 px-6 py-10 text-center">
        <p className="text-sm text-white/60">
          No upcoming meetups right now — new events are announced here as soon as our team posts them.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-orange-500/30 hover:bg-white/[0.05]"
        >
          {item.mediaUrl && item.mediaType === "image" ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.mediaUrl}
              alt={item.title}
              className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : null}
          <div className="flex flex-1 flex-col gap-2 p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
              {item.category === "announcement" ? "Announcement" : "Event"}
            </span>
            <h3 className="text-lg font-bold text-white">{item.title}</h3>
            {item.description ? (
              <p className="line-clamp-3 text-sm leading-relaxed text-white/60">{item.description}</p>
            ) : null}
            <div className="mt-auto flex items-center justify-between pt-3">
              {item.destinationUrl ? (
                <Link
                  href={item.destinationUrl}
                  className="text-sm font-semibold text-orange-400 transition hover:text-orange-300"
                >
                  View details →
                </Link>
              ) : <span />}
              <time className="text-xs text-white/40" dateTime={item.startAt}>
                Posted {new Date(item.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </time>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
