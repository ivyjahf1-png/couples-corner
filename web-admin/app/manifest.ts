import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/lib/theme";

/**
 * Admin PWA web app manifest (→ /manifest.webmanifest).
 *
 * Mirrors the public app's branding: dark navy canvas with the Couples
 * Corner dot mark. Colors derive from the shared THEME_COLORS constant
 * (mirrors the `--background` CSS token), so the installed admin app's
 * splash screen and browser chrome match the product instead of flashing
 * white.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Couples Corner Admin",
    short_name: "CC Admin",
    description: "Couples Corner — platform administration dashboard.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: THEME_COLORS.background,
    theme_color: THEME_COLORS.themeColor,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
