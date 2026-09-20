// ConversationSummaryCard.tsx

"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

interface ConversationSummaryCardProps {
  summary: ConversationParticipantSummary | null;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function ConversationSummaryCard({
  summary,
  expanded = false,
  onToggleExpand,
}: ConversationSummaryCardProps) {
  const [activePhoto, setActivePhoto] = useState(0);

  if (!summary) return null;

  const photos = summary.photos.length > 0 ? summary.photos : [];

  return (
    <div className="rounded-t-2xl border-x border-b border-ink-700/70 bg-slate-900/95 p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start gap-3">
          <Avatar
            src={photos[0]?.publicUrl ?? summary.avatarUrl}
            name={summary.name}
            kind={summary.kind}
            size="lg"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-semibold text-white">
                {summary.name}
              </h2>
              {summary.verified ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-success-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-success-200">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                    <path d="M9 12 L11 14 L15 10" />
                  </svg>
                  Real Person
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white shadow-inner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-amber-200" aria-hidden>
                  <path d="M12 2 L15 9 L22 9 L17 14 L19 22 L12 17 L5 22 L7 14 L2 9 L9 9 Z" />
                </svg>
                {summary.personalitySimilarity}% match
              </span>
            </div>
            {summary.location ? (
              <p className="mt-1 truncate text-xs text-ink-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="inline h-3.5 w-3.5 -mt-0.5 mr-1 text-orange-300" aria-hidden>
                  <path d="M12 2 C8 2 4 5 4 9 C4 13 8 16 12 16 C16 16 20 13 20 9 C20 5 16 2 12 2 Z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                {summary.location}
              </p>
            ) : null}
          </div>
          {onToggleExpand ? (
            <button
              type="button"
              aria-label={expanded ? "Collapse profile summary" : "Expand profile summary"}
              className="rounded-full p-1.5 text-ink-300 transition hover:bg-white/10 hover:text-white"
              onClick={onToggleExpand}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transform transition-transform ${expanded ? "-rotate-90" : "rotate-90"}`}
                aria-hidden
              >
                <path d="M15 18L9 12L15 6" />
              </svg>
            </button>
          ) : null}
        </div>

        {expanded ? (
          <div className="flex flex-col gap-3">
            {summary.lifestyleTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {summary.lifestyleTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-orange-300 shrink-0" aria-hidden>
                      <path d="M12 3 L12 21 M3 12 L21 12 M7 7 L17 17 M7 17 L17 7" />
                      <circle cx="12" cy="12" r="1.4" />
                    </svg>
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-400">No lifestyle tags shared yet</p>
            )}

            {photos.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {photos.map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    aria-label={`View photo ${i + 1}`}
                    className={[
                      "h-9 w-9 shrink-0 overflow-hidden rounded-xl border transition",
                      i === activePhoto
                        ? "border-orange-500/60 bg-ink-900/40 ring-1 ring-orange-500/30"
                        : "border-white/10 bg-ink-900/40 hover:border-white/30",
                    ].join(" ")}
                  >
                    {photo.publicUrl ? (
                      <img src={photo.publicUrl} alt={`Photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Avatar name={`Photo ${i + 1}`} size="sm" />
                      </div>
                    )}
                    {i === activePhoto ? (
                      <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-[#FF5722] ring-2 ring-slate-900/60" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
