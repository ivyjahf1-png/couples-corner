"use client";

import { useEffect } from "react";

/**
 * Keeps the browser-chrome / splash theme color in lockstep with the app's
 * live CSS color tokens. The static `<meta name="theme-color">` comes from
 * THEME_COLORS (lib/theme.ts); this component re-reads the resolved
 * `--background` custom property at runtime so the splash/launch chrome
 * follows the current theme configuration instead of a hardcoded hex value.
 */
export function ThemeColorSync() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (!meta) return;

    const apply = () => {
      const token = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();
      if (token) meta.content = token;
    };

    apply();

    // Re-apply when the stylesheet (and thus the tokens) finishes loading,
    // and whenever tokens are hot-reloaded in development.
    document.addEventListener("DOMContentLoaded", apply, { once: true });
    const raf = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}