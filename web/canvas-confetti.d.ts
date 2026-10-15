/**
 * Minimal ambient typing for canvas-confetti (the package ships no types and
 * @types/canvas-confetti is not installed). Covers the options this app uses
 * — extend here if a call site needs more of the upstream surface.
 */
declare module "canvas-confetti" {
  export interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    ticks?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
    colors?: string[];
    scalar?: number;
    shapes?: Array<"square" | "circle" | "star">;
    origin?: { x?: number; y?: number };
  }

  export default function confetti(options?: ConfettiOptions): Promise<void>;
}