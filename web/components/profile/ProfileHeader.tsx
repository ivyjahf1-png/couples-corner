"use client";

import { CheckCircle2 } from "lucide-react";
import { CopyIdButton } from "@/components/profile/CopyIdButton";

/**
 * Public profile identity header — name + verified tick + glowing Online pill,
 * stat pills (gender/age, distance, country) and the copyable User ID row.
 *
 * Pure presentation: presence verdict and derived labels are computed by the
 * page and passed in, so first paint and re-renders always agree.
 */
export function ProfileHeader({
  name,
  verified = true,
  online,
  gender,
  age,
  distanceLabel,
  country,
  uid,
  statusBadge,
}: {
  name: string;
  verified?: boolean;
  online: boolean;
  gender: string | null;
  age: number | null;
  distanceLabel: string | null;
  country: string | null;
  uid: string;
  statusBadge: string | null;
}) {
  return (
    <div className="px-5 pt-4 sm:px-6">
      <div className="flex items-center gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-extrabold tracking-tight text-white">
          {name}
        </h1>
        {verified ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-400" aria-label="Verified" />
        ) : null}
        {statusBadge ? (
          <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/90">
            {statusBadge}
          </span>
        ) : null}
        <span
          className={
            online
              ? "shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-[0_0_14px_rgba(16,185,129,0.8)]"
              : "shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300"
          }
        >
          {online ? "Online" : "Offline"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {gender || age !== null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
            <span aria-hidden>{genderSymbol(gender)}</span>
            {age !== null ? <span className="tabular-nums">{age}</span> : null}
          </span>
        ) : null}
        {distanceLabel ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
            <span aria-hidden>📍</span>
            {distanceLabel}
          </span>
        ) : null}
        {country ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
            <span aria-hidden>🌍</span>
            {country}
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        <CopyIdButton value={uid} label={`ID:${uid}`} />
      </div>
    </div>
  );
}

function genderSymbol(gender: string | null): string {
  const g = (gender ?? "").toLowerCase();
  if (g.startsWith("f") || g.includes("woman") || g.includes("female")) return "♀️";
  if (g.startsWith("m") || g.includes("man") || g.includes("male")) return "♂️";
  return "⚧️";
}
