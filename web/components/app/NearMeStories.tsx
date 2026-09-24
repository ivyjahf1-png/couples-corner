"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import {
  getNearbyProfilesAction,
  saveUserLocationAction,
} from "@/lib/actions/location";
import type { NearbyProfileView } from "@/lib/server/nearby";

/**
 * "Near me" stories row — horizontal, scrollable circular avatars of people
 * near the viewer's detected location.
 *
 * On mount we silently request browser geolocation; with permission granted
 * we save the coordinates (worldwide support) and sort suggestions by real
 * distance. If geolocation is denied or unavailable we fall back to the
 * server's last-known location, then to a worldwide list — the row is never
 * empty and never throws.
 */
export function NearMeStories() {
  const [people, setPeople] = useState<NearbyProfileView[]>([]);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    async function load(coords?: { latitude: number; longitude: number }) {
      try {
        const list = await getNearbyProfilesAction(coords ?? null);
        setPeople(Array.isArray(list) ? list.filter((p) => p?.id) : []);
      } catch {
        setPeople([]);
      } finally {
        setState("ready");
      }
    }

    // Geolocation is optional — every failure path still loads the row.
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position?.coords?.latitude ?? 0,
            longitude: position?.coords?.longitude ?? 0,
          };
          // Persist coordinates for distance sorting (best-effort).
          if (!requested.current || (coords.latitude !== 0 || coords.longitude !== 0)) {
            void saveUserLocationAction(coords).catch(() => undefined);
          }
          await load(coords);
        },
        () => void load(),
        { timeout: 8000, maximumAge: 600_000 }
      );
    } else {
      void load();
    }
  }, []);

  return (
    <section aria-labelledby="near-me-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="near-me-heading" className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          Near me
        </h2>
        <span className="text-xs text-ink-500">Sorted by distance</span>
      </div>

      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {state === "loading" ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex shrink-0 flex-col items-center gap-1.5" aria-hidden>
              <span className="sk sk--avatar block h-16 w-16" />
              <span className="sk sk--line block h-3 w-12" />
            </div>
          ))
        ) : people.length === 0 ? (
          <p className="py-4 text-sm text-ink-400">
            No nearby members yet — allow location access to find people around you.
          </p>
        ) : (
          people.map((person) => (
            <Link
              key={person.id}
              href={`/profile/${encodeURIComponent(person.id)}`}
              className="group flex w-16 shrink-0 flex-col items-center gap-1.5"
              title={`${person.name}${person.distanceKm != null ? ` · ${formatDistance(person.distanceKm)}` : ""}`}
            >
              <span className="rounded-full bg-gradient-to-br from-orange-500 to-[#FF5722] p-[2px] transition group-hover:brightness-110">
                <span className="block rounded-full bg-[#0F172A] p-[2px]">
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt={person.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <Avatar name={person.name} kind={person.kind} size="lg" className="bg-gradient-to-br from-brand-500/25 via-brand-600/10 to-ink-700/40" />
                  )}
                </span>
              </span>
              <span className="w-16 truncate text-center text-[11px] font-medium text-ink-300 group-hover:text-white">
                {person.name?.split(" ")[0] || "Member"}
              </span>
              {person.distanceKm != null ? (
                <span className="-mt-1 text-[10px] text-ink-500">{formatDistance(person.distanceKm)}</span>
              ) : null}
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return "<1 km";
  if (km < 100) return `${Math.round(km)} km`;
  return `${Math.round(km / 10) * 10}+ km`;
}
