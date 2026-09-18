import type { ReactNode } from "react";

export type LogoTag = "span" | "div" | "h1" | "h2" | "h3" | "p";

interface LogoProps {
  /** Semantic tag; default `span`. Use `h1`/`h2` for headings. */
  as?: LogoTag;
  /** Show the official brand mark image. */
  mark?: boolean;
  /** Optional content after the wordmark (e.g. a tagline). */
  children?: ReactNode;
  className?: string;
}

/**
 * Couples Corner logo/wordmark. Renders the official brand mark asset
 * (/icons/icon-192.png) followed by the wordmark. Semantic tag is
 * configurable for hierarchy.
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
        <img
          src="/icons/icon-192.png"
          alt=""
          aria-hidden
          className="h-8 w-8 shrink-0 rounded-full"
        />
      ) : null}
      <span className="whitespace-nowrap font-semibold text-white">
        Couples <span className="text-orange-400">Corner</span>
      </span>
      {children}
    </Tag>
  );
}