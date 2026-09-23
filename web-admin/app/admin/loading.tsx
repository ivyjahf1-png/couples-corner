/**
 * Route-level loading boundary for the admin panel.
 *
 * The admin layout awaits an authenticated admin session (and admin pages
 * await their own aggregates) before rendering, so this skeleton is what
 * visitors see during the session check + first paint instead of a frozen
 * previous page. Self-contained (no shared LoadingState component exists in
 * the admin app) — styled to the admin dark/orange theme.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6" role="status" aria-live="polite" aria-label="Loading admin panel">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-white/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-brand-500/20 bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-brand-500/20 bg-surface" />
    </div>
  );
}