/**
 * seedStyles — selectable pawn (seed) visual themes for the pre-game lobby.
 *
 * Each style drives a bold, high-gloss pawn rendering used by the board. The
 * lobby exposes these as a "Seed Style" selector (Classic Gem / Gold Royale /
 * Neon Crystal) so players can personalise how their pawns look.
 */

export type SeedStyleId = "classic" | "gold" | "neon";

export interface SeedStyle {
  id: SeedStyleId;
  name: string;
  /** CSS swatch preview shown on the lobby chip. */
  swatch: string;
  /** Base gloss gradient applied to the pawn body. */
  gloss: string;
  /** Top sheen highlight for the pawn crown. */
  sheen: string;
  /** Outer glow / rim light. */
  glow: string;
  /** Rim shadow to sell 3D depth. */
  shadow: string;
}

export const SEED_STYLES: readonly SeedStyle[] = [
  {
    id: "classic",
    name: "Classic Gem",
    swatch: "linear-gradient(135deg,#60a5fa,#1e3a8a)",
    gloss: "radial-gradient(120% 120% at 32% 26%, rgba(255,255,255,.85) 0%, rgba(255,255,255,.15) 34%, rgba(0,0,0,.28) 100%)",
    sheen: "linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,0))",
    glow: "0 0 10px rgba(96,165,250,.55), 0 8px 14px rgba(0,0,0,.55)",
    shadow: "inset 0 -4px 8px rgba(0,0,0,.5), inset 0 4px 8px rgba(255,255,255,.4)",
  },
  {
    id: "gold",
    name: "Gold Royale",
    swatch: "linear-gradient(135deg,#fde68a,#b45309)",
    gloss: "radial-gradient(120% 120% at 32% 26%, rgba(255,255,255,.95) 0%, rgba(255,240,180,.4) 30%, rgba(120,72,0,.45) 100%)",
    sheen: "linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,244,214,0))",
    glow: "0 0 14px rgba(251,191,36,.75), 0 9px 16px rgba(0,0,0,.55)",
    shadow: "inset 0 -4px 8px rgba(90,54,0,.55), inset 0 4px 8px rgba(255,255,255,.6)",
  },
  {
    id: "neon",
    name: "Neon Crystal",
    swatch: "linear-gradient(135deg,#22d3ee,#a21caf)",
    gloss: "radial-gradient(120% 120% at 32% 26%, rgba(255,255,255,.9) 0%, rgba(34,211,238,.35) 32%, rgba(88,0,110,.5) 100%)",
    sheen: "linear-gradient(180deg, rgba(255,255,255,.95), rgba(230,255,255,0))",
    glow: "0 0 16px rgba(34,211,238,.85), 0 0 24px rgba(162,28,175,.5), 0 9px 16px rgba(0,0,0,.5)",
    shadow: "inset 0 -4px 8px rgba(60,0,80,.6), inset 0 4px 8px rgba(255,255,255,.55)",
  },
];

export function getSeedStyle(id: SeedStyleId | string | undefined | null): SeedStyle {
  return SEED_STYLES.find((s) => s.id === id) ?? SEED_STYLES[0]!;
}
