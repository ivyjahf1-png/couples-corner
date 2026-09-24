import { SkeletonBar, SkeletonStatus } from "@/components/app/Skeleton";

/**
 * Layout-level stream fallback.
 *
 * This used to be a full-viewport blocking splash (fixed overlay + "Loading
 * your corner…" text + a spinner). It is now an instant, non-overlapping
 * skeleton that mirrors the page geometry: nothing is hidden, nothing is
 * blocked, and the real content simply streams into place underneath it.
 */
export default function RootLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <SkeletonStatus label="Loading your corner" />
      <div className="glass-panel flex flex-col gap-3 p-6" aria-hidden>
        <SkeletonBar className="w-40" />
        <SkeletonBar className="sk--title w-64" />
        <SkeletonBar className="h-3 w-full max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sk sk--glass flex flex-col gap-3 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span className="sk sk--avatar block h-11 w-11" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <SkeletonBar className="w-3/5" />
                <SkeletonBar className="h-2.5 w-2/5" />
              </div>
            </div>
            <SkeletonBar className="h-2.5 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
