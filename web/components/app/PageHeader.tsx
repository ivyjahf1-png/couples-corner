import type { ReactNode } from "react";
import { Chip } from "@/components/ui/Chip";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Global layout lock.
 *
 * Guarantees, on phone, tablet and desktop alike:
 *   • The page itself NEVER scrolls - only `.page-lock__body` does.
 *   • `header` is `shrink-0`, so the page heading and any nav stay pinned.
 *   • The body is `flex-1 min-h-0 overflow-y-auto`, the single scroll region.
 *
 * This removes the class of bugs where the whole page bounced under a fixed
 * bottom nav, and where side-to-side rubber-banding appeared on phones.
 *
 * Height math lives in app/globals.css (`.page-lock`), which subtracts the
 * mobile back header on small screens and the shell padding on md and up.
 * Pass `flush` for routes rendered without that mobile header.
 */
export function PageLock({
  children,
  head,
  flush = false,
  className = "",
  bodyClassName = "",
  bodyStyle,
}: {
  /** The scrollable region. Everything here scrolls; nothing above it does. */
  children: ReactNode;
  /** Static, non-scrolling header/nav block. */
  head?: ReactNode;
  /** Take the full 100dvh (routes with no mobile back header). */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  /** Escape hatch for pages that need extra bottom padding (e.g. fixed nav). */
  bodyStyle?: React.CSSProperties;
}) {
  return (
    <div className={["page-lock", flush ? "page-lock--flush" : "", className].filter(Boolean).join(" ")}>
      {head ? <div className="page-lock__head">{head}</div> : null}
      <div className={["page-lock__body", bodyClassName].filter(Boolean).join(" ")} style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}

/** Standard page heading block for authenticated-app pages. */
export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-2">
        {eyebrow ? <Chip tone="brand">{eyebrow}</Chip> : null}
        <h1 className="cc-fluid-title text-2xl font-semibold tracking-display text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="cc-fluid-subtitle text-sm text-ink-300 sm:text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
