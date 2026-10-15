"use client";
import { motion } from "framer-motion";

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

// Rotation that brings each face to the front (facing viewer).
const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: 0, y: 180 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 90, y: 0 },
};

function Face({ n }: { n: number }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center rounded-[18%]"
      style={{
        // Crisp, high-contrast face: bright near-white with a soft warm
        // highlight so the cube never reads as dark/black.
        background: "radial-gradient(120% 120% at 30% 25%, #ffffff 0%, #fdfdfd 40%, #eef2f7 78%, #dfe6ef 100%)",
        boxShadow:
          "inset 0 0 0 2px rgba(255,255,255,1), inset 0 -6px 12px rgba(120,132,150,.28), inset 0 6px 12px rgba(255,255,255,.75)",
        backfaceVisibility: "hidden",
      }}
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 place-items-center p-[16%]">
        {PIPS[n]!.map(([c, r], i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              gridColumn: c + 1,
              gridRow: r + 1,
              width: 8,
              height: 8,
              // Bold, clearly-visible pips: solid ink-black with a subtle
              // top sheen and a light halo so they pop on the bright face.
              background: "radial-gradient(circle at 34% 30%, #3a4252 0%, #0b1220 70%)",
              boxShadow: "inset 0 -1px 2px rgba(255,255,255,.35), 0 1px 2px rgba(0,0,0,.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function LudoDice({ value, rolling, active = false }: { value: number; rolling: boolean; active?: boolean }) {
  const face = FACE_ROT[Math.min(6, Math.max(1, value))] ?? FACE_ROT[1]!;
  // High-polish 3D tumble: multi-axis spins + vertical bounce while rolling,
  // then spring-settle on the result face with a landing squash.
  const spin = rolling ? 4 : 0;
  const target = {
    rotateX: face.x + spin * 360 + (rolling ? 0 : 360 * 2),
    rotateY: face.y + spin * 360,
  };
  return (
    <div className="relative h-20 w-20" style={{ perspective: "800px" }}>
      {/* Prominent turn glow rings — unmissable active-player signal */}
      {active ? (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-2 rounded-3xl border-[3px] border-amber-300"
            style={{ boxShadow: "0 0 24px rgba(251,191,36,.8), inset 0 0 12px rgba(251,191,36,.35)" }}
            animate={{ scale: [1, 1.12, 1], opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-[28px] border-2 border-amber-200/60"
            style={{ boxShadow: "0 0 32px rgba(251,191,36,.45)" }}
            animate={{ scale: [1, 1.22, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.25 }}
          />
        </>
      ) : null}
      {/* physics bounce shadow on the table */}
      <motion.div
        aria-hidden
        className="absolute -bottom-3 left-1/2 h-3.5 w-14 -translate-x-1/2 rounded-full bg-black/70 blur-md"
        animate={rolling ? { scale: [1, 0.6, 1.1, 0.75, 1], opacity: [0.7, 0.3, 0.65, 0.35, 0.7], y: [0, -2, 0, -1, 0] } : { scale: 1, opacity: 0.7, y: 0 }}
        transition={rolling ? { duration: 0.7, repeat: Infinity, ease: "easeOut" } : { duration: 0.25 }}
      />
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.55))" }}
        animate={rolling ? { ...target, y: [0, -22, 0, -12, 0], scale: [1, 1.06, 0.98, 1.03, 1] } : { ...target, y: 0, scale: 1 }}
        transition={
          rolling
            ? { duration: 0.7, repeat: Infinity, ease: "easeOut" }
            : { type: "spring", stiffness: 140, damping: 11, mass: 1.1 }
        }
      >
        {/* six faces of a cube, half = 32px */}
        <div style={{ transform: "translateZ(32px)" }}><Face n={1} /></div>
        <div style={{ transform: "rotateY(90deg) translateZ(32px)" }}><Face n={2} /></div>
        <div style={{ transform: "rotateY(180deg) translateZ(32px)" }}><Face n={3} /></div>
        <div style={{ transform: "rotateY(-90deg) translateZ(32px)" }}><Face n={4} /></div>
        <div style={{ transform: "rotateX(90deg) translateZ(32px)" }}><Face n={5} /></div>
        <div style={{ transform: "rotateX(-90deg) translateZ(32px)" }}><Face n={6} /></div>
      </motion.div>
      {/* Clear numeric overlay so the roll value is never ambiguous */}
      {!rolling ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-rose-400 to-red-600 text-sm font-black text-white shadow-[0_2px_8px_rgba(244,63,94,.7)] ring-2 ring-white/70"
        >
          {value}
        </span>
      ) : null}
    </div>
  );
}
