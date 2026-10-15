"use client";
import { memo } from "react";
import { SHAPE_COLOR, SHAPE_LABEL, type WhotCard } from "@/lib/whot/engine";

/**
 * WhotCardView — one physical card, drawn as pure CSS/SVG.
 *
 * Faces use the reference palette: high-contrast large-type value corners
 * (top-left + rotated bottom-right), a big centre shape, and the rainbow
 * crown WHOT wild. The back is deep navy with a gold rosette lattice.
 * Sizes: sm (opponent fans) · md (deck/discard) · lg (your hand).
 */

const SIZES = {
  sm: { w: 30, h: 44, r: 5, value: 13, shape: 13 },
  md: { w: 54, h: 78, r: 8, value: 22, shape: 26 },
  lg: { w: 62, h: 92, r: 9, value: 27, shape: 32 },
} as const;

export type CardSize = keyof typeof SIZES;

function ShapeGlyph({ shape, size, color }: { shape: WhotCard["shape"]; size: number; color: string }) {
  const s = size;
  const h = s / 2;
  switch (shape) {
    case "circle":
      return <circle cx={h} cy={h} r={h * 0.88} fill={color} />;
    case "triangle":
      return <polygon points={`${h},${s * 0.08} ${s * 0.94},${s * 0.9} ${s * 0.06},${s * 0.9}`} fill={color} />;
    case "square":
      return <rect x={s * 0.1} y={s * 0.1} width={s * 0.8} height={s * 0.8} rx={s * 0.1} fill={color} />;
    case "cross":
      return (
        <path
          d={`M ${s * 0.16} ${s * 0.08} L ${h} ${s * 0.36} L ${s * 0.84} ${s * 0.08} L ${s * 0.92} ${s * 0.16}
              L ${s * 0.64} ${h} L ${s * 0.92} ${s * 0.84} L ${s * 0.84} ${s * 0.92} L ${h} ${s * 0.64}
              L ${s * 0.16} ${s * 0.92} L ${s * 0.08} ${s * 0.84} L ${s * 0.36} ${h} L ${s * 0.08} ${s * 0.16} Z`}
          fill={color}
        />
      );
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? h * 0.95 : h * 0.42;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${h + r * Math.cos(a)},${h + r * Math.sin(a)}`);
      }
      return <polygon points={pts.join(" ")} fill={color} />;
    }
    case "whot":
      return (
        <g>
          <path
            d={`M ${s * 0.14} ${s * 0.78} Q ${h} ${s * 0.3} ${s * 0.86} ${s * 0.78}`}
            fill="none"
            stroke="url(#whot-rainbow)"
            strokeWidth={s * 0.14}
            strokeLinecap="round"
          />
          <polygon
            points={`${s * 0.2},${s * 0.74} ${s * 0.26},${s * 0.34} ${h},${s * 0.56} ${s * 0.74},${s * 0.34} ${s * 0.8},${s * 0.74}`}
            fill="#F59E0B"
            stroke="#B45309"
            strokeWidth={s * 0.03}
          />
          <circle cx={s * 0.26} cy={s * 0.3} r={s * 0.06} fill="#EF4444" />
          <circle cx={h} cy={s * 0.5} r={s * 0.06} fill={color} />
          <circle cx={s * 0.74} cy={s * 0.3} r={s * 0.06} fill="#2563EB" />
        </g>
      );
  }
}

export const WhotCardFace = memo(function WhotCardFace({
  card,
  size = "md",
  dimmed = false,
  glow = false,
}: {
  card: WhotCard;
  size?: CardSize;
  dimmed?: boolean;
  glow?: boolean;
}) {
  const dim = SIZES[size];
  const color = SHAPE_COLOR[card.shape];
  const isWhot = card.shape === "whot";
  const label = isWhot ? "WHOT" : `${card.value} ${SHAPE_LABEL[card.shape]}`;
  return (
    <div
      aria-label={label}
      className={`relative grid place-items-center overflow-hidden border transition-shadow ${
        dimmed ? "opacity-45 grayscale-[.45]" : ""
      } ${glow ? "shadow-[0_0_18px_rgba(245,158,11,.85)]" : "shadow-[0_4px_10px_rgba(0,0,0,.5)]"}`}
      style={{
        width: dim.w,
        height: dim.h,
        borderRadius: dim.r,
        background: isWhot
          ? "linear-gradient(135deg,#FCA5A5,#FDE68A,#A7F3D0,#BFDBFE,#DDD6FE,#FBCFE8)"
          : "linear-gradient(160deg,#FFFDF6 0%,#F5EFE0 100%)",
        borderColor: isWhot ? "#B45309" : "rgba(0,0,0,.28)",
        borderWidth: size === "sm" ? 1 : 1.5,
      }}
    >
      {isWhot ? (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-45">
          <defs>
            <linearGradient id="whot-rainbow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#EF4444" />
              <stop offset="0.33" stopColor="#F59E0B" />
              <stop offset="0.66" stopColor="#16A34A" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
          </defs>
        </svg>
      ) : null}

      {/* Corner value chips */}
      <span
        className="absolute font-black leading-none"
        style={{ top: size === "sm" ? 2 : 4, left: size === "sm" ? 3 : 5, fontSize: dim.value, color }}
      >
        {isWhot ? "20" : card.value}
      </span>
      <span
        className="absolute rotate-180 font-black leading-none"
        style={{ bottom: size === "sm" ? 2 : 4, right: size === "sm" ? 3 : 5, fontSize: dim.value, color }}
      >
        {isWhot ? "20" : card.value}
      </span>

      {/* Centre shape */}
      <svg viewBox={`0 0 ${dim.shape} ${dim.shape}`} width={dim.shape} height={dim.shape} className="relative">
        <ShapeGlyph shape={card.shape} size={dim.shape} color={color} />
      </svg>

      {isWhot ? (
        <span
          className="absolute bottom-[6%] left-1/2 -translate-x-1/2 font-black uppercase tracking-wider text-amber-800"
          style={{ fontSize: Math.max(6, dim.value * 0.52) }}
        >
          WHOT
        </span>
      ) : null}
    </div>
  );
});

/** Card back — navy + gold rosette lattice used by the deck stack & hand fans. */
export const WhotCardBack = memo(function WhotCardBack({ size = "sm" }: { size?: CardSize }) {
  const dim = SIZES[size];
  return (
    <div
      aria-hidden
      className="relative overflow-hidden border border-amber-500/50 shadow-[0_4px_10px_rgba(0,0,0,.55)]"
      style={{
        width: dim.w,
        height: dim.h,
        borderRadius: dim.r,
        background: "linear-gradient(150deg,#1E293B 0%,#0F172A 55%,#1E3A5F 100%)",
      }}
    >
      <div
        className="absolute inset-[12%] rounded-[18%] border border-amber-400/45"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 30%, rgba(245,158,11,.35) 0 22%, transparent 23%), radial-gradient(circle at 70% 70%, rgba(245,158,11,.3) 0 22%, transparent 23%)",
        }}
      />
      <span
        className="absolute inset-0 grid place-items-center font-black text-amber-400/90"
        style={{ fontSize: dim.value * 0.85 }}
      >
        W
      </span>
    </div>
  );
});
