/**
 * Shared overlay layers and bottom-sheet geometry.
 *
 * WHY THIS EXISTS: the app has a `fixed` bottom tab bar at z-50 (AppNav's
 * BottomNavRegion) and several `fixed inset-0` modal sheets. Those two used to
 * carry their z-index and their safe-area padding inline, written out by hand
 * at each call site, and they drifted — a sheet pinned to `inset-0` with
 * `items-end` puts its bottom edge flush with the viewport, which is exactly
 * where the nav bar lives, so the sheet's own padding ended up underneath the
 * tab icons.
 *
 * Centralising the values means a sheet is either correct by construction or
 * obviously wrong, and there is exactly one place to change when the nav grows.
 */

/**
 * Stacking scale. Keep these spaced so a new layer has an obvious slot.
 *
 * `nav` is the fixed bottom tab bar and MUST stay below `sheet`: a modal that
 * paints over the nav still lets the nav's links win taps in the region where
 * the two overlap, which is what made the sheet look like it had a dead strip
 * along its bottom edge.
 */
export const Z = {
  /** Fixed bottom tab bar. */
  nav: 50,
  /** Modal sheet: backdrop + panel. Above the nav by design. */
  sheet: 200,
  /** Confirmation / alert dialog raised from inside a sheet. */
  dialog: 300,
  /** Toasts and transient system UI. Always last. */
  toast: 400,
} as const;

/**
 * Height of the fixed bottom tab bar, in rem.
 *
 * This mirrors the `pb-20` compensating padding AppMain carries for it — the
 * two MUST agree. If the bar grows, both change together or page content
 * re-hides behind it.
 */
export const NAV_BAR_REM = 5;

/**
 * The fixed-position shell every bottom sheet shares.
 *
 * `items-end` on phones so the sheet rises from the bottom edge, centred from
 * `sm` up where there is room for a dialog. The `pb` is the important part: it
 * pushes the sheet's bottom edge ABOVE the nav bar, so the sheet floats clear
 * of the tab icons instead of sitting on top of them, while the backdrop
 * (which covers the full `inset-0`) still dims the nav behind it.
 *
 * THE Z-INDEX LIVES IN HERE, written as a literal class string, and that is not
 * incidental. Tailwind extracts classes by scanning source TEXT for literal
 * class names, so a composed `z-[${Z.sheet}]` produces a class that never
 * appears anywhere in the source and is silently dropped from the build — the
 * sheet would render with no z-index at all and slide under the nav. Constants
 * built by concatenation are fine ONLY because the pieces appear verbatim in
 * this file; the scanner sees them here, not at the call site.
 *
 * `Z.sheet` and `NAV_BAR_REM` above are therefore documentation of intent and
 * the single place to edit those two numbers, not something the class strings
 * are generated from. Changing one means changing the literal below too — that
 * coupling is the price of Tailwind's text-scanning extractor, and it is
 * cheaper than a sheet that silently loses its z-index.
 *
 * Expressed as a class string rather than a component so the existing sheets
 * keep their own markup — this is the one property they all shared, and
 * nothing else about their layout needed to change.
 */
export const SHEET_SHELL =
  // z-[200] is Z.sheet; the 5rem is NAV_BAR_REM, matching AppMain's `pb-20`.
  "fixed inset-0 z-[200] flex items-end justify-center " +
  "pb-[calc(5rem+env(safe-area-inset-bottom))] " +
  "sm:items-center sm:pb-0";

/** The backdrop behind a sheet. Covers the nav too, so it reads as modal. */
export const SHEET_BACKDROP =
  "absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm";

/** The panel itself, above its own backdrop. */
export const SHEET_PANEL_RELATIVE = "relative z-10";
