import { Icon } from "@/components/landing/Icon";

/**
 * Instant glass skeleton used across app surfaces.
 *
 * Replaces the old `animate-pulse` grey boxes: the shapes mirror real content
 * (avatar + two text lines), the sheen comes from the shared `.sk` token, and
 * the label is screen-reader-only — no visible "Loading…" box anywhere.
 */
export function LoadingState({
  label = "Loading",
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={["flex flex-col gap-3", className ?? ""].join(" ").trim()}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="sk sk--glass flex items-center gap-4 rounded-2xl p-4"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <span className="sk sk--avatar block h-11 w-11" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="sk sk--line block w-2/5" />
            <span className="sk sk--line block h-2.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Compact dot-loader for buttons/composers. */
export function DotLoader({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={["dot-loader", className ?? ""].join(" ").trim()}
    >
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </span>
  );
}

export function LoadingIcon() {
  return <Icon name="sparkle" className="h-4 w-4" />;
}

