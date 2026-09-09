import type { ReactNode } from "react";

export type ChipTone = "neutral" | "brand" | "success" | "danger";

const toneClasses: Record<ChipTone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-700",
  success: "bg-success-100 text-success-700",
  danger: "bg-danger-100 text-danger-700",
};

interface ChipProps {
  tone?: ChipTone;
  /** Small leading dot — useful for status indicators. */
  leadingDot?: boolean;
  label?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Couples Corner Chip primitive — a compact pill used for tags, statuses,
 * and short labels. Optional leading dot for status semantics.
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