/**
 * Single source of truth for PWA / browser-chrome theme colors.
 *
 * These MUST stay in sync with the CSS custom properties at the top of
 * app/globals.css (`--background`, `--foreground`). The manifest and the
 * static viewport export import this constant instead of hardcoding hex
 * values, and <ThemeColorSync /> re-reads the live CSS token at runtime so
 * the splash screen and browser chrome always follow the theme configuration.
 */
export const THEME_COLORS = {
  background: "#0F172A",
  themeColor: "#0F172A",
} as const;