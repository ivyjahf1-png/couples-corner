import type { ReactNode } from "react";

export type CardTone = "raised" | "flat" | "interactive" | "muted";
export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardTag = "div" | "section" | "article" | "li" | "aside";

const baseClasses = "rounded-2xl";

const toneClasses: Record<CardTone, string> = {
  raised: "border border-orange-500/30 bg-slate-900/90 shadow-lg shadow-orange-500/5",
  flat: "border border-orange-500/30 bg-slate-900/90",
  interactive:
    "border border-orange-500/30 bg-slate-900/90 shadow-lg shadow-orange-500/5 transition duration-150 hover:shadow-xl hover:border-orange-500/60",
  muted: "border border-orange-500/30 bg-slate-900",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

interface CardProps {
  tone?: CardTone;
  padding?: CardPadding;
  as?: CardTag;
  className?: string;
  children: ReactNode;
}

/**
 * Couples Corner Card primitive.
 */
export function Card({
  tone = "raised",
  padding = "md",
  as = "div",
  className,
  children,
}: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={[
        baseClasses,
        toneClasses[tone],
        paddingClasses[padding],
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {children}
    </Tag>
  );
}

