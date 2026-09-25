"use client";

import { useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import type { MomentView } from "@/lib/moments";

/**
 * Recent moments rail.
 *
 * Moments uploaded through the Task Center are public and syndicated here on
 * the home discovery screen. The rail is scrollable horizontally on phones and
 * a stacked grid on larger screens.
 */
export function MomentRail({ moments }: { moments: MomentView[] }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  if (moments.length === 0) return null;

  return (
    <section aria-label="Recent moments" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Recent moments</h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] lg:grid lg:grid-cols-3 lg:overflow-visible">
        {moments.map((moment) => (
          <article
            key={moment.id}
            className="w-56 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-card lg:w-auto"
          >
            <div className="relative flex h-40 items-center justify-center bg-[#0F172A]">
              {moment.mediaType === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={moment.mediaUrl}
                  muted
                  playsInline
                  onError={() => setFailed((prev) => ({ ...prev, [moment.id]: true }))}
                  className="h-full w-full object-cover"
                />
              ) : failed[moment.id] ? (
                <span className="text-sm text-ink-400">Media unavailable</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={moment.mediaUrl}
                  alt={moment.content || "Shared moment"}
                  onError={() => setFailed((prev) => ({ ...prev, [moment.id]: true }))}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex items-start gap-2 p-3">
              {moment.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={moment.authorAvatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <Avatar name={moment.authorName ?? "Member"} size="sm" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{moment.authorName ?? "Member"}</p>
                {moment.content ? (
                  <p className="line-clamp-2 text-[11px] leading-5 text-ink-300">{moment.content}</p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}