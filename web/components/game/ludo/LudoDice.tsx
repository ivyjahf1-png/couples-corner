"use client";
import React from "react";
import { motion } from "framer-motion";

const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 }, 2: { x: -90, y: 0 }, 3: { x: 0, y: -90 },
  4: { x: 0, y: 90 }, 5: { x: 90, y: 0 }, 6: { x: 0, y: 180 },
};

const PIPS: Record<number, readonly number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

const GLASS_FACE: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(255,255,255,.98) 0%, rgba(236,245,255,.82) 44%, rgba(178,206,238,.65) 100%)",
  boxShadow: [
    "inset 0 0 0 1px rgba(255,255,255,.95)",
    "inset .1rem .1rem .32rem rgba(255,255,255,.95)",
    "inset -.12rem -.14rem .34rem rgba(23,53,99,.4)",
    "inset 0 0 .85rem rgba(126,175,232,.35)",
    "0 0 .45rem rgba(158,205,255,.3)",
  ].join(", "),
};

const PIP_STYLE: React.CSSProperties = {
  background: "radial-gradient(circle at 32% 28%, #7b8494 0%, #232a36 52%, #05070c 100%)",
  boxShadow: [
    "inset 0 .07rem .09rem rgba(0,0,0,.95)",
    "inset 0 -.05rem .07rem rgba(255,255,255,.28)",
    "0 .05rem .06rem rgba(255,255,255,.8)",
  ].join(", "),
};

const SPECULAR: React.CSSProperties = {
  background: "linear-gradient(128deg, rgba(255,255,255,.85) 0%, rgba(255,255,255,.15) 30%, transparent 48%)",
};

function Face({ value, transform }: { value: number; transform: string }) {
  return (
    <div
      className="absolute grid h-full w-full grid-cols-3 grid-rows-3 gap-[8%] rounded-[15%] p-[12%]"
      style={{ ...GLASS_FACE, transform, backfaceVisibility: "hidden" }}
      aria-hidden
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {PIPS[value]!.includes(i) ? (
            <span className="h-[70%] w-[70%] rounded-full" style={PIP_STYLE} />
          ) : null}
        </span>
      ))}
      <span className="pointer-events-none absolute inset-0 rounded-[15%]" style={SPECULAR} />
    </div>
  );
}

interface LudoDiceProps {
  value: number;
  rolling: boolean;
  active?: boolean;
  size?: number;
  onRoll?: () => void;
}

export function LudoDice({ value, rolling, active = false, size = 48, onRoll }: LudoDiceProps) {
  const face = FACE_ROT[Math.min(6, Math.max(1, value))] ?? FACE_ROT[1]!;
  const idle = { rotateX: face.x, rotateY: face.y };
  const animate = rolling
    ? {
        rotateX: [0, 900 + face.x, face.x],
        rotateY: [0, 1080 + face.y, face.y],
        y: [0, -20, 0, -8, 0],
        scaleY: [1, 1, 0.92, 1, 1],
      }
    : idle;

  return (
    <div 
      className="relative grid place-items-center cursor-pointer select-none" 
      style={{ perspective: 640, width: size, height: size }}
      onTouchEnd={(e) => { e.preventDefault(); if (onRoll) onRoll(); }}
      onClick={() => { if (onRoll) onRoll(); }}
    >
      <span
        className="pointer-events-none absolute -inset-[16%] rounded-[28%] blur-[4px]"
        style={{
          background: active
            ? "radial-gradient(circle, rgba(96,165,250,.55), transparent 70%)"
            : "radial-gradient(circle, rgba(255,255,255,.15), transparent 70%)",
        }}
      />
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={idle}
        animate={animate}
        transition={
          rolling
            ? { duration: 0.9, times: [0, 0.6, 0.8, 0.92, 1], ease: [0.22, 0.9, 0.3, 1] }
            : { type: "spring", stiffness: 140, damping: 15 }
        }
      >
        <Face value={1} transform={"translateZ(" + (size / 2) + "px)"} />
        <Face value={6} transform={"rotateY(180deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={3} transform={"rotateY(90deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={4} transform={"rotateY(-90deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={2} transform={"rotateX(90deg) translateZ(" + (size / 2) + "px)"} />
        <Face value={5} transform={"rotateX(-90deg) translateZ(" + (size / 2) + "px)"} />
      </motion.div>
      <span
        className={"pointer-events-none absolute -bottom-[18%] left-1/2 h-[15%] w-[82%] -translate-x-1/2 rounded-[50%] " + (rolling ? "animate-[cc-ludo-die-shadow_520ms_ease-in-out_infinite]" : "")}
        style={{
          background: "radial-gradient(ellipse at center, " + (active ? "rgba(56,189,248,.7)" : "rgba(0,0,0,.65)") + " , transparent 70%)",
        }}
      />
    </div>
  );
}