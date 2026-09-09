import type { ReactNode } from "react";

export type CardTone = "raised" | "flat" | "interactive" | "muted";
export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardTag = "div" | "section" | "article" | "li" | "aside";

const baseClasses = "rounded-2xl";

const toneClasses: Record<CardTone, string> = {
  raised: "border border-ink-200 bg-surface shadow-card",
  flat: "border border-ink-200 bg-surface",
  interactive:
    "border border-ink-200 bg-surface shadow-card transition duration-150 hover:shadow-lifted hover:border-ink-300",
  muted: "border border-ink-200 bg-surface-muted",
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
 * Couples Corner Card primitive — an elegant surface for profiles, posts,
 * settings, and rich content. Radii/shadow/padding come from design tokens.
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