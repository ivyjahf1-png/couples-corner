"use client";

import {
  Compass,
  Flame,
  Images,
  LayoutGrid,
  MessageCircle,
  User,
  type LucideIcon,
} from "lucide-react";

/**
 * LINE-ART NAVIGATION ICONS for the mobile bottom bar.
 *
 * ── WHY THIS EXISTS INSTEAD OF REUSING `components/landing/Icon` ───────────────
 * That set is hand-drawn 24×24 geometry authored for the marketing and empty
 * states. Several of its glyphs are filled or double-stroked shapes — the
 * `moments` mark is two rectangles plus a disc, `flame` is a closed silhouette
 * — so at 20px inside a 52px tab they read as blobs rather than as icons, and
 * several of them visually collide with the body-copy glyphs used one screen
 * away. This set is stroke-only, single-weight and geometrically consistent.
 *
 * ICON SIZING AND WHY IT IS NOT BLURRY.
 *   • `size` is passed through to the SVG box, so the glyph scales with the tab
 *     rather than being scaled by a CSS transform.
 *   • The active state applies NO `scale` transform. Scaling an SVG rasterises
 *     it at the scaled size on some engines, and a 1.75px stroke resampled to
 *     1.5× lands on half-pixels and renders visibly soft — the exact artefact
 *     "crisp borders" rules out. The active state instead changes COLOUR and
 *     font weight, which are free and never touch the geometry.
 *   • `vectorEffect="non-scaling-stroke"` keeps the stroke width in USER units,
 *     so it cannot thin out if a future caller does scale the box.
 *   • `shapeRendering="geometricPrecision"` asks for exact path tessellation
 *     rather than the speed-biased hinting some engines default to.
 *
 * `strokeWidth` is 2.25, up from the original 1.75. The line-art set is meant to
 * read as BOLD rather than hairline: at 20px a 1.75 stroke renders at roughly one
 * device pixel on a 2x screen, and a 1px-per-pixel line flickers and looks thinner
 * than the weight of the bold label sitting under it. 2.25 lands the stroke
 * solidly between device pixels at that size and holds a consistent weight across
 * the bar.
 *
 * The icons that got heavier are the ones that needed it most: `Flame` and
 * `Images` are the busiest glyphs in the set, and at the old weight their inner
 * detail closed up. `User` and `MessageCircle` are simple enough that the change
 * reads as emphasis rather than clutter.
 *
 * COLOUR INHERITS from `currentColor`, so a tab's active state is a colour
 * change on the parent and never a second icon definition.
 */

export type NavIconName = "explore" | "moment" | "feed" | "likes" | "messages" | "me";

const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  explore: Compass,
  moment: Images,
  feed: LayoutGrid,
  likes: Flame,
  messages: MessageCircle,
  me: User,
};

/** One line-art navigation glyph. Inherits `currentColor` from its parent. */
export function NavIcon({
  name,
  size = 20,
  className,
}: {
  name: NavIconName;
  /** Rendered size in px. Keeps the SVG box and the glyph in step. */
  size?: number;
  className?: string;
}) {
  const Icon = NAV_ICONS[name];
  return (
    <Icon
      aria-hidden
      width={size}
      height={size}
      strokeWidth={2.25}
      vectorEffect="non-scaling-stroke"
      shapeRendering="geometricPrecision"
      className={className}
    />
  );
}