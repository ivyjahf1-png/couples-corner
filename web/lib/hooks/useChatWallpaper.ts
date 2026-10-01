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