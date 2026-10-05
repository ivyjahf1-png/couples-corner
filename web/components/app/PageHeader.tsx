import type { ReactNode } from "react";
import { Chip } from "@/components/ui/Chip";

interface PageHeaderProps {
  /**
   * Narrow, viewport-locked screens pass a smaller title so the heading cannot
   * eat the height the content below it needs.
   *
   * OPTIONAL and defaulting to the current size, so no existing page changes
   * appearance. It exists because `compact` already fixes the title at `text-lg`
   * and there is no way to go smaller from the call site without either editing
   * this shared component for everyone or wrapping the heading in a second,
   * competing `<h1>` — which would break the document outline.
   */
  titleClassName?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /**
   * Render a single compact row instead of the full heading block.
   *
   * For height-locked pages whose content must stay above the fold — the
   * `/discover` swipe deck is the only caller today. The full block costs
   * roughly 150px on a phone: an eyebrow chip, a 2rem title and a wrapped
   * subtitle, each on its own line. On a viewport-locked surface that is not
   * "some" chrome, it is the difference between the profile card's action dock
   * being visible and being below the fold.
   *
   * Opt-in rather than a breakpoint change, so no existing page silently loses
   * its subtitle — several rely on that copy.
   */
  compact?: boolean;
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
  style,
}: {
  /** The scrollable region. Everything here scrolls; nothing above it does. */
  children: ReactNode;
  /** Static, non-scrolling header/nav block. */
  head?: ReactNode;
  /** Take the full 100dvh (routes with no mobile back header). */
  flush?: boolean;
  className?: string;
  /**
   * Inline styles for the ROOT (the viewport-locked column).
   *
   * Separate from `bodyStyle` because those are two different problems: this one
   * paints the page CANVAS, which must not scroll, while `bodyStyle` styles the
   * scrolling region. A page that needs a fixed background gradient has to put it
   * here — on the body it would scroll away and leave a flat void above the
   * content once the member scrolled down.
   *
   * Tailwind arbitrary values cover most cases, but a multi-stop gradient with a
   * layered radial bloom is clearer and safer inline than as a
   * `bg-[linear-gradient(...)]` utility, where commas and nested parens have to be
   * escaped and are easy to get subtly wrong.
   */
  style?: React.CSSProperties;
  bodyClassName?: string;
  /** Escape hatch for pages that need extra bottom padding (e.g. fixed nav). */
  bodyStyle?: React.CSSProperties;
}) {
  return (
    <div
      className={["page-lock", flush ? "page-lock--flush" : "", className].filter(Boolean).join(" ")}
      style={style}
    >
      {head ? <div className="page-lock__head">{head}</div> : null}
      <div className={["page-lock__body", bodyClassName].filter(Boolean).join(" ")} style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}

/** Standard page heading block for authenticated-app pages. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  compact,
  titleClassName,
}: PageHeaderProps) {
  if (compact) {
    /* One row, one line, `min-w-0` + `truncate` so a long title ellipsizes
       instead of wrapping to a second line and stealing height back. The
       subtitle is dropped rather than shrunk: at this size a two-line subtitle
       costs more vertical space than the deck can spare, and the same copy is
       already on `/explore`. */
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h1
          className={[
            "min-w-0 truncate font-semibold tracking-display text-foreground",
            compact ? "text-lg" : "cc-fluid-title text-2xl sm:text-3xl",
            /* Caller's size wins LAST so it overrides the `compact` default
               instead of competing with it. */
            titleClassName ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {eyebrow ? `${eyebrow}: ` : ""}
          {title}
        </h1>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    );
  }

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
