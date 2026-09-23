import type { ReactNode } from "react";

export type ChipTone = "neutral" | "brand" | "success" | "danger";

const toneClasses: Record<ChipTone, string> = {
  neutral: "bg-slate-700/30 text-slate-300",
  brand: "bg-[#FF5722] text-white",
  success: "bg-emerald-900/40 text-emerald-300",
  danger: "bg-red-900/40 text-red-300",
};

interface ChipProps {
  tone?: ChipTone;
  leadingDot?: boolean;
  label?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Couples Corner Chip primitive — a compact pill used for tags, statuses,
 * and short labels.
 */
export function Chip({
  tone = "neutral",
  leadingDot = false,
  label,
  className,
  children,
}: ChipProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        toneClasses[tone],
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {leadingDot ? (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      ) : null}
      {children ?? label}
    </span>
  );
}

