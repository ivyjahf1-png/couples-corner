"use client";

import { ErrorFallback } from "@/components/error/ErrorBoundary";
import { Icon } from "@/components/landing/Icon";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">
          Admin
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-300">
          This section failed to load, but the rest of the admin panel is still
          available. Use the sidebar to switch sections, or try again.
        </p>
      </div>
      <ErrorFallback
        feature="This section"
        error={process.env.NODE_ENV === "development" ? error : null}
        onRetry={reset}
      />
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Icon name="lock" className="h-4 w-4" />
        Your admin session is intact — this error is scoped to the failing
        section, not the whole panel.
      </p>
    </div>
  );
}