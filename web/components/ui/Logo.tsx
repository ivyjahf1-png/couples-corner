import type { ReactNode } from "react";

export type LogoTag = "span" | "div" | "h1" | "h2" | "h3" | "p";

interface LogoProps {
  /** Semantic tag; default `span`. Use `h1`/`h2` for headings. */
  as?: LogoTag;
  /** Show the two-dot "couple" mark. */
  mark?: boolean;
  /** Optional content after the wordmark (e.g. a tagline). */
  children?: ReactNode;
  className?: string;
}

/**
 * Couples Corner logo/wordmark. The mark is a pair of interlocking dots —
 * a tasteful nod to "two" rather than a heart. Text uses the display
 * tracking token. Semantic tag is configurable for hierarchy.
 */
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
        .join(" ")
        .trim()}
    >
      {mark ? (
        <span aria-hidden className="flex items-center gap-x-1">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-900" />
        </span>
      ) : null}
      <span className="whitespace-nowrap font-semibold text-ink-900">
        Couples <span className="text-brand-700">Corner</span>
      </span>
      {children}
    </Tag>
  );
}