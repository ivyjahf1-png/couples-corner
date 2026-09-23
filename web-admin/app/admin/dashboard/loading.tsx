/**
 * Route-level loading boundary for the admin dashboard. The page awaits the
 * admin session plus aggregate metrics (user counts, content stats) before it
 * can render, so this skeleton covers that window with real visual feedback.
 * Self-contained (no shared LoadingState component exists in the admin app).
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6" role="status" aria-live="polite" aria-label="Loading dashboard">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-white/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-brand-500/20 bg-surface" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl border border-brand-500/20 bg-surface lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-xl border border-brand-500/20 bg-surface" />
      </div>
    </div>
  );
}