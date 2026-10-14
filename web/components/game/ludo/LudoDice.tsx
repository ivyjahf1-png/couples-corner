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
        background: "linear-gradient(145deg,#ffffff 0%,#f1f5f9 45%,#cbd5e1 100%)",
        boxShadow:
          "inset 0 0 0 2px rgba(255,255,255,.9), inset 0 -6px 12px rgba(100,116,139,.35), inset 0 6px 12px rgba(255,255,255,.6)",
        backfaceVisibility: "hidden",
      }}
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 place-items-center p-[18%]">
        {PIPS[n]!.map(([c, r], i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              gridColumn: c + 1,
              gridRow: r + 1,
              width: 5,
              height: 5,
              background: "radial-gradient(circle at 35% 30%, #64748b, #0f172a 70%)",
              boxShadow: "inset 0 -1px 2px rgba(255,255,255,.35), 0 1px 1px rgba(255,255,255,.6)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function LudoDice({ value, rolling }: { value: number; rolling: boolean }) {
  const face = FACE_ROT[Math.min(6, Math.max(1, value))] ?? FACE_ROT[1]!;
  // Add full spins while rolling so it tumbles, then settle on the face.
  const spin = rolling ? 3 : 0;
  const target = {
    rotateX: face.x + spin * 360,
    rotateY: face.y + spin * 270,
  };
  return (
    <div className="relative h-16 w-16" style={{ perspective: "600px" }}>
      {/* shadow on the table */}
      <div className="absolute -bottom-1 left-1/2 h-3 w-12 -translate-x-1/2 rounded-full bg-black/50 blur-md" />
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
