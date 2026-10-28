import React from "react";
import { motion } from "framer-motion";

interface DiceButtonProps {
  roll: number;
  rolling: boolean;
  onClick: () => void;
  color?: string;
}

export function DiceButton({ roll, rolling, onClick, color = "#FF5722" }: DiceButtonProps) {
  // Generate dice dot positions based on the current roll value (1-6)
  const renderDots = (value: number) => {
    const dots: { x: string; y: string }[] = [];
    if (value === 1 || value === 3 || value === 5) dots.push({ x: "50%", y: "50%" });
    if (value >= 2) { dots.push({ x: "20%", y: "20%" }, { x: "80%", y: "80%" }); }
    if (value >= 4) { dots.push({ x: "80%", y: "20%" }, { x: "20%", y: "80%" }); }
    if (value === 6) { dots.push({ x: "20%", y: "50%" }, { x: "80%", y: "50%" }); }

    return dots.map((dot, index) => (
      <div
        key={index}
        className="absolute w-2 h-2 rounded-full bg-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
        style={{ left: dot.x, top: dot.y, transform: "translate(-50%, -50%)" }}
      />
    ));
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={rolling}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className="relative flex items-center justify-center focus:outline-none cursor-pointer group"
      style={{ width: "54px", height: "54px" }}
    >
      {/* 3D Outer Glow / Shadow Pod */}
      <div className="absolute inset-0 rounded-2xl bg-black/40 blur-md translate-y-2 group-hover:translate-y-3 transition-all" />

      {/* 5D Sculpted Dice Cube */}
      <motion.div
        animate={
          rolling
            ? { rotateX: [0, 360, 720], rotateY: [0, 360, 720], scale: [1, 1.15, 1] }
            : { rotateX: 0, rotateY: 0, scale: 1 }
        }
        transition={rolling ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" } : { type: "spring", stiffness: 300, damping: 20 }}
        className="relative w-full h-full rounded-2xl bg-gradient-to-br from-white via-slate-100 to-slate-300 border-2 border-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-4px_8px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden"
      >
        {/* Specular Highlight Gloss Overlay */}
        <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-2xl" />

        {/* Dice Pips */}
        <div className="relative w-full h-full">
          {renderDots(roll || 1)}
        </div>
      </motion.div>
    </motion.button>
  );
}