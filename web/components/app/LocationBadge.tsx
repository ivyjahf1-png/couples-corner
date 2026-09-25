"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getNearbyProfilesAction } from "@/lib/actions/location";

/**
 * Top location badge for the home discovery screen.
 *
 * Requests browser geolocation once, stores the coordinates through the
 * existing location Server Action, and displays a human-readable label
 * ("Near you" until a city/region is resolved). Never throws: any failure
 * simply leaves the generic label in place.
 */
export function LocationBadge({ fallbackLabel = "Discover nearby" }: { fallbackLabel?: string }) {
  const [label, setLabel] = useState(fallbackLabel);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position?.coords?.latitude ?? 0;
        const longitude = position?.coords?.longitude ?? 0;
        if (latitude === 0 && longitude === 0) {
          setReady(true);
          return;
        }
        try {
          const nearby = await getNearbyProfilesAction({ latitude, longitude });
          const first = Array.isArray(nearby) ? nearby.find((person) => person?.location) : null;
          if (first?.location) setLabel(first.location);
        } catch {
          /* keep the generic label */
        } finally {
          setReady(true);
        }
      },
      () => setReady(true),
      { timeout: 8000, maximumAge: 600_000 }
    );
  }, []);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0F172A]/80 px-3.5 py-1.5 text-xs font-semibold text-ink-100 backdrop-blur"
      aria-label={`Location: ${label}`}
    >
      <MapPin className="h-3.5 w-3.5 text-orange-400" aria-hidden />
      {ready ? label : "Locating..."}
    </span>
  );
}