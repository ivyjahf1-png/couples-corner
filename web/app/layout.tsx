import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "../styles/splash.css";
import "../styles/marquee.css";
import { AuthModalProvider } from "@/components/auth/AuthModals";
import RootLoading from "./root-loading";
import { MobileBackHeader } from "@/components/app/MobileBackHeader";
import { FailureToasts } from "@/components/ui/FailureToasts";
import { ThemeColorSync } from "@/components/ThemeColorSync";
import { THEME_COLORS } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Canonical origin for absolute metadata URLs (og:image, og:url, icons,
 * manifest) — ONLY when explicitly configured.
 *
 * WHY NOT A DERIVED FALLBACK: this used to fall back to
 * `process.env.VERCEL_URL` and then to a hardcoded production domain. That is
 * wrong on a custom domain. `VERCEL_URL` is the *deployment* URL
 * (`the-couples-corner.vercel.app`) and does NOT change when the project is
 * reached through a custom domain, so every absolute metadata URL was emitted
 * pointing at the default domain no matter which host the visitor arrived on —
 * Open Graph images, icons and the manifest all resolved to the wrong origin.
 *
 * Leaving `metadataBase` unset makes Next.js resolve relative metadata URLs
 * against the incoming request origin, which is correct on every domain by
 * construction and costs nothing at runtime (no `headers()` call, so the layout
 * stays statically renderable).
 *
 * Set `NEXT_PUBLIC_SITE_URL` only if you want to pin ONE canonical origin for
 * SEO. Note that pinning it deliberately re-introduces the cross-domain
 * problem for absolute URLs, so leave it unset while serving multiple domains.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  // Omitted entirely when unset — see the note above.
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  applicationName: "Couples Corner",
  title: {
    default: "Couples Corner",
    template: "%s | Couples Corner",
  },
  description:
    "Couples Corner — a warm, private space for the two of you to share moments, memories, and plans together.",
  // PWA manifest (app/manifest.ts) — navy theme + maskable brand icons.
  manifest: "/manifest.webmanifest",
  // iOS: use the standalone web app and paint the status bar to match the
  // navy splash instead of leaving a white strip above it.
  appleWebApp: {
    capable: true,
    title: "Couples Corner",
    statusBarStyle: "black-translucent",
  },
  icons: {
    // Browser tab + bookmarks: multi-size .ico (16/32/48) with PNG fallbacks.
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    // iOS home-screen icon (full-bleed navy; iOS applies its own rounding).
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  // Stop iOS Safari from auto-linking phone numbers in profile copy.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: THEME_COLORS.themeColor,
  // Dark theme: browsers apply a dark color scheme to native UI
  // (form controls, scrollbars, default backgrounds) so they match the
  // deep purple/navy canvas instead of flashing white.
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="app-canvas flex min-h-full flex-col overflow-x-hidden overscroll-y-none text-foreground">
        <ThemeColorSync />
        <FailureToasts />
        <AuthModalProvider />
        <MobileBackHeader />
        <Suspense fallback={<RootLoading />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
