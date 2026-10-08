import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "../styles/splash.css";
import "../styles/marquee.css";
import { AuthModalProvider } from "@/components/auth/AuthModals";
import { ProfileViewProvider } from "@/components/profile/ProfileViewModal";
import RootLoading from "./root-loading";
import { MobileBackHeader } from "@/components/app/MobileBackHeader";
import { FailureToasts } from "@/components/ui/FailureToasts";
import { ThemeColorSync } from "@/components/ThemeColorSync";
import { AdSenseScript } from "@/components/ads/AdSenseScript";
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

  /* ── `viewport-fit=cover` IS WHAT MAKES `env(safe-area-inset-*)` NON-ZERO ────
     This is missing across the app and it is the root cause of the mobile
     safe-area symptoms on the Moment/feed screen.

     Without it, iOS Safari constrains the layout viewport to the SAFE area only:
     the page cannot draw into the notch/home-indicator strip, and every
     `env(safe-area-inset-*)` in the codebase silently resolves to 0px. The
     consequence is that all of these become decorative no-ops:
       • `MobileBackHeader`      `pt-[env(safe-area-inset-top)]`      (:147)
       • `.app-bottom-nav`       `padding-bottom: env(safe-area-inset-bottom)` (globals.css:569)
       • `MediaFeed`             `bottom-[calc(5rem_+_env(safe-area-inset-bottom))]` etc.

     So the feed's bottom bar, the caption, the action rail and the upload FAB are
     all positioned against 0px, while the OS draws the home indicator OVER them
     — content ends up underneath the system chrome and the screen reads as
     crowded/overlapping even though the flex maths is correct.

     `viewport-fit=cover` opts the page into drawing edge-to-edge, which is the
     precondition for the insets resolving to their real values. It is safe to
     add here: the elements that must clear the notch (`MobileBackHeader`) and
     the home indicator (`.app-bottom-nav`) ALREADY carry the matching inset
     classes, so nothing moves under the bars once the values become real.

     Next.js emits this as `viewport-fit=cover` on the generated `<meta
     name="viewport">`. Without an explicit `width`/`initialScale` here, Next's
     defaults (`width=device-width, initial-scale=1`) still apply. */
  viewportFit: "cover",
};

/**
 * Critical, render-blocking styles inlined into <head>.
 *
 * WHY THIS IS INLINE: the dark canvas on <body> is defined in globals.css, and
 * <html> has no background of its own. Until that stylesheet is fetched and
 * parsed, the browser paints the root canvas WHITE and renders unstyled text —
 * a flash of unstyled content, most visible on the public invite landing page
 * where a visitor is on a cold cache and on a slow connection.
 *
 * Inlining a handful of bytes removes the flash entirely, because the first
 * paint is already dark. This is deliberately NOT a JS "hide until mounted"
 * trick: a gate that starts at opacity-0 leaves the page blank for any visitor
 * whose JS fails, is slow, or has it disabled, and hides content from crawlers.
 * These rules are unconditional and need no hydration.
 *
 * The values mirror :root/body in globals.css. If the palette there changes,
 * update the fallbacks below too — they are a pre-paint approximation, not a
 * source of truth.
 */
const CRITICAL_CSS = `
  html { background-color: #080b18; color-scheme: dark; }
  body { background-color: #080b18; color: #f8fafc; margin: 0; }
  @media (prefers-color-scheme: light) {
    html, body { background-color: #080b18; }
  }
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
      </head>
      <body className="app-canvas flex h-dvh flex-col overflow-hidden text-foreground">
        <ThemeColorSync />
        <FailureToasts />
        <AuthModalProvider />
        {/* THE GLOBAL PROFILE VIEW MODAL. Mounted in the root layout, beside the
            auth overlays, so EVERY surface (Explore, Moment, Chat, Feed,
            Messages) can open the reference-design profile view via
            `openProfileView(userId)` without threading props through server
            component boundaries. Renders null until an open event fires. */}
        <ProfileViewProvider />
        <MobileBackHeader />
        {/* AdSense loader. In the ROOT layout so every route gets it - a page
            added later cannot forget to include it. `afterInteractive` keeps it
            off the critical path; see AdSenseScript for the full reasoning. */}
        <AdSenseScript />
        <Suspense fallback={<RootLoading />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
