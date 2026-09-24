"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import { GlassActionButton, LikeActionButton } from "@/components/app/GlassActions";

/**
 * Member row used by the Home page ("Suggested for you" and "Near you").
 *
 * A frosted glass tile with a hairline rim, the member identity, an optional
 * meta chip (shared interests / distance) and glass action controls: a like
 * toggle (honest UI-local state, same pattern the feed uses) and a View action
 * that honours the caller-supplied profile href.
 *
 * PRESERVATION CONSTRAINT: no query, route or Server Action is touched here —
 * the destination href is passed in from the server page exactly as before.
 */
export function HomeMemberRow({
  name,
  kind,
  location,
  avatarUrl,
  href,
  distanceKm,
  meta,
}: {
  id: string;
  name: string;
  kind: "person" | "couple";
  location?: string | null;
  avatarUrl?: string | null;
  href: string;
  distanceKm?: number | null;
  meta?: string | null;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const showPhoto = Boolean(avatarUrl) && failedPhoto !== avatarUrl;

  return (
    <div className="glass-panel flex items-center gap-3 rounded-2xl p-3 transition hover:border-white/20">
      <Link
        href={href as never}
        className="group flex min-w-0 flex-1 items-center gap-3"
        aria-label={`View ${name}'s profile`}
      >
        <span className="shrink-0">
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl as string}
              alt={name}
              onError={() => setFailedPhoto(avatarUrl ?? null)}
              className="h-11 w-11 rounded-full object-cover ring-1 ring-white/15"
            />
          ) : (
            <Avatar name={name} kind={kind} size="md" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white transition group-hover:text-orange-200">
            {name}
          </span>
          <span className="block truncate text-xs text-ink-400">
            {location?.trim() || "Location not shared"}
          </span>
        </span>
      </Link>

      {typeof distanceKm === "number" ? (
        <span className="glass-badge hidden px-2.5 py-1 text-[11px] font-semibold text-brand-200 sm:inline-flex">
          {formatDistance(distanceKm)}
        </span>
      ) : meta ? (
        <span className="glass-badge hidden px-2.5 py-1 text-[11px] font-semibold text-brand-200 sm:inline-flex">
          {meta}
        </span>
      ) : null}

      <div className="flex shrink-0 items-center gap-1.5">
        <LikeActionButton name={name} size="sm" showCount={false} />
        <GlassActionButton
          icon="eye"
          label=""
          variant="quiet"
          size="sm"
          href={href}
          ariaLabel={`View ${name}'s profile`}
          className="hidden sm:inline-flex"
        />
      </div>
    </div>
  );
}

function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return "<1 km";
  if (km < 100) return `${Math.round(km)} km`;
  return `${Math.round(km / 10) * 10}+ km`;
}
