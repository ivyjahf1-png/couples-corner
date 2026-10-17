"use client";
import { motion } from "framer-motion";

/**
 * LudoDice — AAA 5D photorealistic glass die.
 *
 * A CSS cube (perspective + preserve-3d) built from six TRANSLUCENT glass
 * slabs: subsurface tint, a bevelled specular rim, an inner cool glow and a
 * diagonal specular sweep that sells the material. Pips are deep-embossed
 * dark metal (inset shadow bowl + light catching the lower lip). Opposite
 * faces sum to 7: front 1 / back 6, right 3 / left 4, top 2 / bottom 5.
 * While `rolling`, framer-motion throws the cube through ~2.5 turns on both
 * axes plus a multi-bounce arc with a landing squash; the contact shadow
 * underneath tracks the bounce via the cc-ludo-die-shadow keyframes, and an
 * inner glow halo lights the cube when it is the local player's to roll.
 */
const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 },
};

/** Pip layout per face on a 3×3 grid (0 = top-left … 8 = bottom-right). */
const PIPS: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Translucent glass slab: subsurface tint + bevelled specular rim + inner glow. */
const GLASS_FACE: React.CSSProperties = {
  background:
    "linear-gradient(145deg, rgba(255,255,255,.95) 0%, rgba(236,245,255,.74) 44%, rgba(178,206,238,.58) 100%)",
  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,.9)",
    "inset .1rem .1rem .32rem rgba(255,255,255,.95)",
    "inset -.12rem -.14rem .34rem rgba(23,53,99,.4)",
    "inset 0 0 .85rem rgba(126,175,232,.3)",
    "0 0 .45rem rgba(158,205,255,.28)",
  ].join(", "),
};

/** Deep-embossed dark metallic pip (inset bowl + light on the lower lip). */
const PIP_STYLE: React.CSSProperties = {
  background: "radial-gradient(circle at 32% 28%, #7b8494 0%, #232a36 52%, #05070c 100%)",
  boxShadow: [
    "inset 0 .07rem .09rem rgba(0,0,0,.95)",
    "inset 0 -.05rem .07rem rgba(255,255,255,.28)",
    "0 .05rem .06rem rgba(255,255,255,.8)",
  ].join(", "),
};

/** Diagonal specular sweep — the highlight that reads as polished glass. */
const SPECULAR: React.CSSProperties = {
  background:
    "linear-gradient(128deg, rgba(255,255,255,.8) 0%, rgba(255,255,255,.12) 30%, transparent 48%)",
};

function Face({ value, transform }: { value: number; transform: string }) {
  return (
    <div
      className="absolute grid h-full w-full grid-cols-3 grid-rows-3 gap-[8%] rounded-[13%] p-[12%]"
      style={{ ...GLASS_FACE, transform, backfaceVisibility: "hidden" }}
      aria-hidden
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {PIPS[value]!.includes(i) ? (
            <span className="h-[68%] w-[68%] rounded-full" style={PIP_STYLE} />
          ) : null}
        </span>
      ))}
      <span className="pointer-events-none absolute inset-0 rounded-[13%]" style={SPECULAR} />
    </div>
  );
}

export function LudoDice({
  value,
  rolling,
  active = false,
  size = 46,
}: {
  value: number;
  rolling: boolean;
  active?: boolean;
  /** Cube edge length in px. */
  size?: number;
}) {
  const face = FACE_ROT[Math.min(6, Math.max(1, value))] ?? FACE_ROT[1]!;
  // Land rotation = the face itself; during the roll add ~2.5 full turns plus a
  // multi-bounce arc (two hops + a landing squash) so the toss feels tactile.
  const idle = { rotateX: face.x, rotateY: face.y };
  const animate = rolling
    ? {
        rotateX: [0, 900 + face.x, face.x],
        rotateY: [0, 1080 + face.y, face.y],
        y: [0, -22, 0, -9, 0],
        scaleY: [1, 1, 0.93, 1, 1],
      }
    : idle;

  return (
    <div
      className="relative grid place-items-center"
      style={{ perspective: 640, width: size, height: size }}
      aria-hidden
    >
      {/* Inner glow halo — cool cyan when the local player may roll */}
      <span
        className="pointer-events-none absolute -inset-[14%] rounded-[26%] blur-[3px]"
        style={{
          background: active
            ? "radial-gradient(circle, rgba(96,165,250,.45), transparent 68%)"
            : "radial-gradient(circle, rgba(255,255,255,.14), transparent 70%)",
        }}
      />
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={idle}
        animate={animate}
        transition={
          rolling
            ? { duration: 1.05, times: [0, 0.6, 0.8, 0.92, 1], ease: [0.22, 0.9, 0.3, 1] }
            : { type: "spring", stiffness: 130, damping: 14 }
        }
      >
        <Face value={1} transform={`translateZ(${size / 2}px)`} />
        <Face value={6} transform={`rotateY(180deg) translateZ(${size / 2}px)`} />
        <Face value={3} transform={`rotateY(90deg) translateZ(${size / 2}px)`} />
        <Face value={4} transform={`rotateY(-90deg) translateZ(${size / 2}px)`} />
        <Face value={2} transform={`rotateX(90deg) translateZ(${size / 2}px)`} />
        <Face value={5} transform={`rotateX(-90deg) translateZ(${size / 2}px)`} />
      </motion.div>
      {/* Dynamic contact shadow — squashes and fades in sync with the bounce */}
      <span
        className={`pointer-events-none absolute -bottom-[16%] left-1/2 h-[15%] w-[80%] -translate-x-1/2 rounded-[50%] ${
          rolling ? "animate-[cc-ludo-die-shadow_520ms_ease-in-out_infinite]" : ""
        }`}
        style={{
          background: `radial-gradient(ellipse at center, ${
            active ? "rgba(56,189,248,.6)" : "rgba(0,0,0,.6)"
          } , transparent 70%)`,
        }}
      />
    </div>
  );
}