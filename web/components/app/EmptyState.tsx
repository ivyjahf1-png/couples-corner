import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/landing/Icon";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent empty state used across every authenticated-app surface. Each
 * usage pairs an honest explanation with the action that would populate the
 * area once the backend (Firebase) is connected.
 */
export function EmptyState({ icon = "sparkle", title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-200 bg-surface-muted px-6 py-14 text-center",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <div className="max-w-sm">
        <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink-600">{body}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
