import type { ReactNode } from "react";

interface ErrorStateProps {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Shared error state for when a server fetch or action fails. Mirrors the
 * EmptyState layout but uses the danger palette so failures are visually
 * distinct from "nothing to show yet."
 */
export function ErrorState({ title, body, action, className }: ErrorStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-200 bg-surface-muted px-6 py-14 text-center",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-100 text-danger-700">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </span>
      <div className="max-w-sm">
        <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink-600">{body}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
