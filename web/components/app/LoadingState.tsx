import { Icon } from "@/components/landing/Icon";

/** Consistent loading placeholder used across app surfaces. */
export function LoadingState({
  label = "Loading…",
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
      className={["flex flex-col gap-3", className ?? ""].join(" ").trim()}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="h-20 animate-pulse rounded-2xl border border-ink-200 bg-surface-muted"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

/** Compact inline spinner for buttons/composers. */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={[
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className ?? "",
      ].join(" ").trim()}
    />
  );
}

export function LoadingIcon() {
  return <Icon name="sparkle" className="h-4 w-4" />;
}
