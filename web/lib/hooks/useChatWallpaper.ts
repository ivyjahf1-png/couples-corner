"use client";

/**
 * useChatWallpaper — the custom chat background, persisted per device.
 *
 * WHY LOCAL STORAGE AND NOT THE DATABASE: a wallpaper is a purely personal
 * display preference on one surface. There is nothing about it another member
 * could ever see, nothing to share, and nothing to moderate. Putting it in a
 * table would mean a migration, an RLS policy, a delete path and a sync story
 * for a value that has exactly one reader — the browser painting this thread.
 *
 * This matches how `useChatTheme` already stores the theme id: same
 * per-device, no-account-needed model, and it survives a reload without a round
 * trip.
 *
 * STORED AS A PUBLIC URL, not the File. The image is uploaded once to the
 * `user-media` bucket and this hook keeps the resulting URL. Re-uploading on
 * every render would be absurd, and IndexedDB would only buy offline access to
 * a background that has to be fetched over the network to display anyway.
 *
 * `uploadFileDirect` is called WITHOUT `recordUserMediaAction` alongside it —
 * that action writes a `user_media` row, and a chat wallpaper is not a gallery
 * item. Adding one per wallpaper change would quietly grow the member's
 * profile gallery every time they picked a background.
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "couples_corner:chat-wallpaper";

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Guard the shape: a hand-edited or stale entry could be anything, and
    // feeding a non-string into `background-image` would render a broken image
    // with no way for the member to tell why.
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "string" || !parsed.startsWith("https://")) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * THE INBOX NEVER READS A WALLPAPER, AND THIS SAYS SO OUT LOUD.
 *
 * A stale `couples_corner:chat-wallpaper` entry written by an older build used to
 * paint a full-bleed photo behind the conversation list, which pushed the rows
 * and avatars out of the way of a picture nobody asked for on that screen. The
 * inbox has no wallpaper control at all - the feature belongs to the thread
 * view - so the correct value here is "off", not "whatever storage says".
 *
 * This clears the legacy key on mount rather than merely ignoring it: storage is
 * per-device, so leaving the value in place means the next build that does read
 * it (or an extension) resurrects the same picture. No-op on the server, and a
 * no-op in private mode where storage throws.
 */
export function purgeLegacyChatWallpaper(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked or unavailable - there is nothing to purge and nothing to
    // report. The inbox paints solid regardless.
  }
}

export function useChatWallpaper(): {
  wallpaper: string | null;
  setWallpaper: (url: string | null) => void;
} {
  const [wallpaper, setWallpaperState] = useState<string | null>(null);

  // Deliberately an effect, not a lazy useState initialiser: the server has no
  // localStorage, so reading during render would produce a markup mismatch —
  // the sheet renders on the server without a wallpaper and re-renders with one
  // on hydration.
  useEffect(() => {
    setWallpaperState(readStored());
  }, []);

  const setWallpaper = useCallback((url: string | null) => {
    setWallpaperState(url);
    try {
      if (url) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(url));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // A private-mode or quota-blocked storage failure must not stop the
      // wallpaper from being applied for this session; it just will not persist.
    }
  }, []);

  return { wallpaper, setWallpaper };
}

/**
 * How strongly a wallpaper is muted behind the message list.
 *
 * WHY THIS IS SEPARATE FROM THE WALLPAPER ITSELF. `useChatWallpaper` answers
 * "which image"; this answers "how loud". They are independent because the right
 * dimming depends on the photo, not on the member's taste — a bright beach shot
 * and a dark forest shot need different scrims for the same text to stay
 * readable. Storing them together would mean re-uploading the image to change its
 * dimming.
 *
 * `dim` is the combined opacity of the scrims (higher = the photo recedes),
 * `blur` is the backdrop blur in pixels (higher = the photo softens). Both are
 * clamped on read as well as on write: localStorage is user-writable and these
 * values land directly in a `style`, so a hand-edited "9999" would otherwise
 * produce a blur radius that costs the compositor real frame time.
 *
 * Same per-device, no-account model as the rest of the chat display settings.
 */

const TUNING_KEY = "couples_corner:wallpaper-tuning";

/** Below this the wallpaper is effectively invisible; above it, unreadable. */
export const DIM_MIN = 0;
export const DIM_MAX = 0.95;
export const BLUR_MIN = 0;
export const BLUR_MAX = 24;

export interface WallpaperTuning {
  dim: number;
  blur: number;
}

const DEFAULT_TUNING: WallpaperTuning = { dim: 0.62, blur: 0 };

/** Clamp one number into range, falling back for anything non-finite. */
function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function readTuning(): WallpaperTuning {
  if (typeof window === "undefined") return DEFAULT_TUNING;
  try {
    const raw = window.localStorage.getItem(TUNING_KEY);
    if (!raw) return DEFAULT_TUNING;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_TUNING;
    const { dim, blur } = parsed as Record<string, unknown>;
    return {
      dim: clamp(dim, DIM_MIN, DIM_MAX, DEFAULT_TUNING.dim),
      blur: clamp(blur, BLUR_MIN, BLUR_MAX, DEFAULT_TUNING.blur),
    };
  } catch {
    // Corrupt JSON, or storage blocked in private mode. The defaults are fine.
    return DEFAULT_TUNING;
  }
}

export function useWallpaperTuning(): {
  tuning: WallpaperTuning;
  setTuning: (next: Partial<WallpaperTuning>) => void;
} {
  // Seeded with the defaults and corrected in an EFFECT, exactly like
  // `useChatTheme`: reading localStorage during render would make the server's
  // markup disagree with the client's first render — a real hydration mismatch,
  // since these values go straight into inline styles.
  const [tuning, setTuningState] = useState<WallpaperTuning>(DEFAULT_TUNING);

  useEffect(() => {
    setTuningState(readTuning());
  }, []);

  const setTuning = useCallback((next: Partial<WallpaperTuning>) => {
    setTuningState((current) => {
      const merged: WallpaperTuning = {
        dim: clamp(next.dim ?? current.dim, DIM_MIN, DIM_MAX, DEFAULT_TUNING.dim),
        blur: clamp(next.blur ?? current.blur, BLUR_MIN, BLUR_MAX, DEFAULT_TUNING.blur),
      };
      try {
        window.localStorage.setItem(TUNING_KEY, JSON.stringify(merged));
      } catch {
        // Non-fatal: the tuning still applies for this session.
      }
      return merged;
    });
  }, []);

  return { tuning, setTuning };
}