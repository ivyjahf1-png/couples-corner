import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/lib/theme";

/**
 * PWA web app manifest (Next.js App Router file convention → /manifest.webmanifest).
 *
 * Branding: dark navy canvas with the Couples Corner dot mark.
 * `background_color` and `theme_color` derive from the shared THEME_COLORS
 * constant (mirrors the `--background` CSS token), matching the splash screen
 * and the `viewport.themeColor` set in app/layout.tsx so the installed app, the
 * splash screen, and browser chrome stay in step on every platform.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Couples Corner",
    short_name: "Couples Corner",
    description:
      "A warm, private space for the two of you to share moments, memories, and plans together.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLORS.background,
    theme_color: THEME_COLORS.themeColor,
    categories: ["social", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
