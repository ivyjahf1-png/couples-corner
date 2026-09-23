/**
 * Single source of truth for the admin panel's PWA / browser-chrome theme
 * colors. Must stay in sync with the CSS custom properties at the top of
 * app/globals.css. The manifest and viewport export import this constant,
 * and <ThemeColorSync /> re-reads the live CSS token at runtime.
 */
export const THEME_COLORS = {
  background: "#0F172A",
  themeColor: "#0F172A",
} as const;