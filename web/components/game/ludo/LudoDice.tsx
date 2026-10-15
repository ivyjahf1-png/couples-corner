"use client";
import { motion } from "framer-motion";

/**
 * LudoDice — realistic 3D die with a multi-axis tumble.
 *
 * A CSS cube (perspective + preserve-3d) with six pip faces. Opposite faces
 * sum to 7: front 1 / back 6, right 3 / left 4, top 2 / bottom 5. While
 * `rolling`, framer-motion throws the cube through ~2.5 turns on both axes
 * plus a vertical bounce, then lands exactly on the face for `value`.
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

const FACE_STYLE: React.CSSProperties = {
  background: "linear-gradient(145deg,#ffffff 0%,#f4f1e8 55%,#dcd6c4 100%)",
  boxShadow: "inset 0 0 0.4rem rgba(0,0,0,.18), inset 0.12rem 0.12rem 0.3rem rgba(255,255,255,.9)",
};

function Face({ value, transform }: { value: number; transform: string }) {
  return (
    <div
      className="absolute grid h-full w-full grid-cols-3 grid-rows-3 gap-[8%] rounded-[14%] p-[12%]"
      style={{ ...FACE_STYLE, transform, backfaceVisibility: "hidden" }}
      aria-hidden
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {PIPS[value]!.includes(i) ? (
            <span
              className="h-[70%] w-[70%] rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 30%, #4b5563, #111827 70%)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,.35), 0 1px 1px rgba(255,255,255,.5)",
              }}
            />
          ) : null}
        </span>
      ))}
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
  // Land rotation = the face itself; during the roll add ~2.5 full turns so the
  // cube visibly tumbles before settling.
  const idle = { rotateX: face.x, rotateY: face.y };
  const animate = rolling
    ? { rotateX: [0, 900 + face.x, face.x], rotateY: [0, 1080 + face.y, face.y], y: [0, -16, 0] }
    : idle;

  return (
    <div
      className="relative grid place-items-center"
      style={{ perspective: 640, width: size, height: size }}
      aria-hidden
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={idle}
        animate={animate}
        transition={
          rolling
            ? { duration: 1, times: [0, 0.62, 1], ease: [0.22, 0.9, 0.3, 1] }
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
      {/* Soft contact shadow under the cube */}
      <span
        className="pointer-events-none absolute -bottom-[14%] left-1/2 h-[16%] w-[78%] -translate-x-1/2 rounded-[50%]"
        style={{
          background: `radial-gradient(ellipse at center, ${
            active ? "rgba(56,189,248,.55)" : "rgba(0,0,0,.55)"
          } , transparent 70%)`,
        }}
      />
    </div>
  );
}