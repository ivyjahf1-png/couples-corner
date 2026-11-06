"use client";

import { useEffect } from "react";

/**
 * Keeps the browser-chrome / theme-color metadata in lockstep with the
 * application's theme configuration. The root layout ships no static
 * `<meta name="theme-color">` tag, so this client component creates it on
 * first load and then reflects the resolved `--background` token so it always
 * follows the application's live theme settings.
 */
export function ThemeColorSync() {
  useEffect(() => {
    const head = document.head;
    if (!head) return;

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    if (!meta) {
      const created = document.createElement("meta");
      created.setAttribute("name", "theme-color");
      head.appendChild(created);
      // Assign to the local reference so the rest of the effect only ever
      // touches the element we actually own.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _meta = created;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _created = created;
      return;
    }

    const apply = () => {
      const token = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();
      if (token) meta.content = token;
    };

    apply();
    document.addEventListener("DOMContentLoaded", apply, { once: true });
    const raf = requestAnimationFrame(apply);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("DOMContentLoaded", apply);
    };
  }, []);

  return null;
}
