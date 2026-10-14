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
  // Add full spins while rolling so it tumbles, then settle on the face.
  const spin = rolling ? 3 : 0;
  const target = {
    rotateX: face.x + spin * 360,
    rotateY: face.y + spin * 270,
  };
  return (
    <div className="relative h-16 w-16" style={{ perspective: "600px" }}>
      {/* Pulsing turn glow rings — only while it's the active player's turn */}
      {active ? (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-2 rounded-3xl border-2 border-amber-300/80"
            animate={{ scale: [1, 1.15, 1], opacity: [0.9, 0.25, 0.9] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-3 rounded-[26px] border border-amber-200/50"
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
        </>
      ) : null}
      {/* shadow on the table */}
      <motion.div
        aria-hidden
        className="absolute -bottom-2 left-1/2 h-3 w-12 -translate-x-1/2 rounded-full bg-black/60 blur-md"
        animate={rolling ? { scale: [1, 0.7, 1], opacity: [0.6, 0.3, 0.6] } : { scale: 1, opacity: 0.6 }}
        transition={rolling ? { duration: 0.5, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
      />
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={target}
        transition={
          rolling
            ? { duration: 0.5, repeat: Infinity, ease: "linear" }
            : { type: "spring", stiffness: 120, damping: 12, mass: 0.9 }
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
    </div>
  );
}
