"use client";

import { useState } from "react";
import { Icon } from "@/components/landing/Icon";
import { Chip } from "@/components/ui/Chip";
import { saveUserLocationAction } from "@/lib/actions/location";

/**
 * Location detection widget (Profile page) — requests browser geolocation
 * and saves the coordinates so distance-based "Near me" sorting works
 * worldwide. Never throws: permission denial and unsupported browsers both
 * render a quiet, recoverable message.
 */
export function LocationSharing() {
  const [state, setState] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  function detect() {
    setMessage(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("error");
      setMessage("Your browser doesn't support location detection. You can still type your city in your profile.");
      return;
    }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position?.coords?.latitude;
        const longitude = position?.coords?.longitude;
        if (typeof latitude !== "number" || typeof longitude !== "number") {
          setState("error");
          setMessage("Couldn't read your coordinates. Please try again.");
          return;
        }
        setCoords({ latitude, longitude });
        const result = await saveUserLocationAction({ latitude, longitude });
        if (result?.ok) {
          setState("saved");
          setMessage("Location saved — your Near me suggestions now use real distance.");
        } else {
          setState("error");
          setMessage(result?.error || "Couldn't save your location right now.");
        }
      },
      (error) => {
        setState("error");
        setMessage(
          error?.code === error?.PERMISSION_DENIED
            ? "Location permission was denied. You can enable it anytime in your browser settings."
            : "Couldn't detect your location. Please try again."
        );
      },
      { timeout: 10_000, maximumAge: 600_000 }
    );
  }

  return (
    <div className="flex flex-col gap-3" aria-label="Location detection">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={detect}
          disabled={state === "loading"}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-400/30 bg-brand-500/15 px-4 py-2.5 text-sm font-medium text-brand-200 transition hover:bg-brand-500/25 disabled:opacity-50"
        >
          <Icon name="discover" className="h-4 w-4" />
          {state === "loading" ? "Detecting…" : coords ? "Update my location" : "Use my current location"}
        </button>
        {state === "saved" ? <Chip tone="success" leadingDot>Location saved</Chip> : null}
      </div>

      {message ? (
        <p role={state === "error" ? "alert" : undefined} className={["text-sm", state === "error" ? "text-danger-300" : "text-success-300"].join(" ")}>
          {message}
        </p>
      ) : null}

      {coords ? (
        <p className="text-xs text-ink-400">
          Coordinates: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)} · stored privately for distance sorting only.
        </p>
      ) : (
        <p className="text-xs text-ink-400">
          Works worldwide — we only store coordinates to sort people by distance, never your exact address.
        </p>
      )}
    </div>
  );
}
