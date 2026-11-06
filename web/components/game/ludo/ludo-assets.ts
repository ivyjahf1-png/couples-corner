/**
 * Ludo Design System — CornerStar edition.
 * 
 * All colors, constants, and asset references for the Ludo board are
 * defined here so that the board rendering is fully themable and
 * consistent with the Couples Corner design system (Tailwind CSS vars).
 * 
 * ✓ Uses CSS custom properties from `globals.css` where possible.
 * ✓ Falls back to safe hex values when CSS vars are not set.
 * ✓ Exports a ready-to-use `COLOR_HEX` record that CornerStar.tsx already
 *   imports — no renames required.
 */

export type LudoColor = "red" | "blue" | "yellow" | "green"

/** Hex fill for each player color (matching the existing CornerStar palette). */
export const COLOR_HEX: Record<LudoColor, string> = {
  red: "var(--brand-600, #ea580c)",
  blue: "var(--brand-500, #f97316)",
  yellow: "var(--brand-400, #fb923c)",
  green: "var(--brand-600, #ea580c)",
}

/** Fallback hex values (used when CSS vars are not resolved). */
export const COLOR_HEX_FALLBACK: Record<LudoColor, string> = {
  red: "#ea580c",
  blue: "#3b82f6",
  yellow: "#eab308",
  green: "#22c55e",
}

/** Track the CSS var → fallback mapping so the board can log a warning
 *  in development if a var resolves to an empty string. */
export const COLOR_VAR_MAP: Record<LudoColor, string> = {
  red: "--brand-600",
  blue: "--brand-500",
  yellow: "--brand-400",
  green: "--brand-600",
}