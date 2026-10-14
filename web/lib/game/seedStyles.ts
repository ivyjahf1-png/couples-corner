/**
 * seedStyles — selectable pawn ("seed") visual themes for the pre-game lobby
 * and the in-game board (applied to the local player's pawns).
 *
 * Four 3D-flavoured models matching the commercial line-up: Warrior (brushed
 * steel + crimson), Royale Gold, Crystal, and Classic. Each style drives a
 * bold, high-gloss pawn rendering used by the lobby chips and the board.
 */

export type SeedStyleId = "warrior" | "royale" | "crystal" | "classic";

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
    id: "warrior",
    name: "Warrior",
    swatch: "linear-gradient(135deg,#e2e8f0,#64748b 45%,#991b1b)",
    gloss: "radial-gradient(120% 120% at 32% 26%, rgba(255,255,255,.95) 0%, rgba(203,213,225,.4) 30%, rgba(60,70,86,.6) 100%)",
    sheen: "linear-gradient(180deg, rgba(255,255,255,.95), rgba(226,232,240,0))",
    glow: "0 0 14px rgba(148,163,184,.7), 0 9px 16px rgba(0,0,0,.6)",
    shadow: "inset 0 -4px 8px rgba(15,23,42,.6), inset 0 4px 8px rgba(255,255,255,.55)",
  },
  {
    id: "royale",
    name: "Royale Gold",
    swatch: "linear-gradient(135deg,#fde68a,#b45309)",
    gloss: "radial-gradient(120% 120% at 32% 26%, rgba(255,255,255,.95) 0%, rgba(255,240,180,.4) 30%, rgba(120,72,0,.45) 100%)",
    sheen: "linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,244,214,0))",
    glow: "0 0 14px rgba(251,191,36,.75), 0 9px 16px rgba(0,0,0,.55)",
    shadow: "inset 0 -4px 8px rgba(90,54,0,.55), inset 0 4px 8px rgba(255,255,255,.6)",
  },
  {
    id: "crystal",
    name: "Crystal",
    swatch: "linear-gradient(135deg,#22d3ee,#a21caf)",
    gloss: "radial-gradient(120% 120% at 32% 26%, rgba(255,255,255,.9) 0%, rgba(34,211,238,.35) 32%, rgba(88,0,110,.5) 100%)",
    sheen: "linear-gradient(180deg, rgba(255,255,255,.95), rgba(230,255,255,0))",
    glow: "0 0 16px rgba(34,211,238,.85), 0 0 24px rgba(162,28,175,.5), 0 9px 16px rgba(0,0,0,.5)",
    shadow: "inset 0 -4px 8px rgba(60,0,80,.6), inset 0 4px 8px rgba(255,255,255,.55)",
  },
  {
    id: "classic",
    name: "Classic",
    swatch: "linear-gradient(135deg,#fef3c7,#d97706)",
    gloss: "radial-gradient(120% 120% at 32% 26%, rgba(255,255,255,.85) 0%, rgba(255,255,255,.15) 34%, rgba(0,0,0,.28) 100%)",
    sheen: "linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,0))",
    glow: "0 0 10px rgba(251,191,36,.55), 0 8px 14px rgba(0,0,0,.55)",
    shadow: "inset 0 -4px 8px rgba(146,64,14,.5), inset 0 4px 8px rgba(255,255,255,.5)",
  },
];

export function getSeedStyle(id: SeedStyleId | string | undefined | null): SeedStyle {
  return SEED_STYLES.find((s) => s.id === id) ?? SEED_STYLES[0]!;
}
