import type { ReactNode } from "react";

export type LogoTag = "span" | "div" | "h1" | "h2" | "h3" | "p";

interface LogoProps {
  as?: LogoTag;
  mark?: boolean;
  children?: ReactNode;
  className?: string;
}

export function Logo({
  as = "span",
  mark = true,
  children,
  className,
}: LogoProps) {
  const Tag = as;
  return (
    <Tag
      className={[
        "inline-flex items-center gap-2.5",
        "tracking-display",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {mark && (
        <span aria-hidden className="flex items-center gap-x-1">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-900" />
        </span>
      )}
      <span className="whitespace-nowrap font-semibold text-ink-900">
        Couples <span className="text-brand-700">Corner</span>
      </span>
      {children}
    </Tag>
  );
}
