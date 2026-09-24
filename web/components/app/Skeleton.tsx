import type { ReactNode } from "react";

/**
 * Instant skeletons — the replacement for blocking "Loading…" boxes.
 *
 * Every placeholder mirrors the real content it stands in for (same radii,
 * same row heights, same grid), so the swap from skeleton → data causes zero
 * layout shift. The sheen comes from `.sk` in `app/globals.css`; there are no
 * spinners, no full-screen overlays and no decorative text.
 *
 * These are plain (non-hook) components, so they render in both Server and
 * Client Components.
 */

function cx(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ").trim();
}

/** Screen-reader-only status so assistive tech knows content is arriving. */
export function SkeletonStatus({ label }: { label: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}

export function SkeletonBar({ className }: { className?: string }) {
  return <span aria-hidden className={cx("sk sk--line block", className)} />;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <span aria-hidden className={cx("sk block", className)} />;
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <span aria-hidden className={cx("sk sk--avatar block h-11 w-11", className)} />;
}

/** Skeleton row matching a member/conversation list entry. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cx("flex items-center gap-4 px-3 py-3", className)} aria-hidden>
      <SkeletonAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SkeletonBar className="w-2/5" />
        <SkeletonBar className="h-2.5 w-3/5" />
      </div>
      <span className="sk sk--pill h-8 w-16" />
    </div>
  );
}

/** A short stack of member/row skeletons. */
export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <ul className={cx("flex flex-col gap-2", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <li key={index}>
          <SkeletonRow />
        </li>
      ))}
    </ul>
  );
}

/** Skeleton matching one glass member card in a 1–2 column grid. */
export function SkeletonCardGrid({ items = 4, className }: { items?: number; className?: string }) {
  return (
    <ul className={cx("grid gap-3 sm:grid-cols-2", className)} aria-hidden>
      {Array.from({ length: items }).map((_, index) => (
        <li key={index} className="sk sk--glass flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <SkeletonAvatar />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <SkeletonBar className="w-3/5" />
              <SkeletonBar className="h-2.5 w-2/5" />
            </div>
          </div>
          <SkeletonBar className="h-2.5 w-full" />
          <SkeletonBar className="h-2.5 w-4/5" />
        </li>
      ))}
    </ul>
  );
}

/**
 * App-zone skeleton: mirrors the Home hero + list rhythm inside the
 * authenticated shell (sidebar/top bar keep rendering normally).
 */
export function AppZoneSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <SkeletonStatus label="Preparing your corner" />
      <section className="glass-panel flex flex-col gap-4 p-6 sm:p-8" aria-hidden>
        <span className="sk sk--pill h-6 w-28" />
        <SkeletonBar className="sk--title w-56" />
        <SkeletonBar className="h-3 w-full max-w-xl" />
        <SkeletonBar className="h-3 w-3/4 max-w-lg" />
        <div className="mt-1 flex gap-3">
          <span className="sk sk--pill h-11 w-32" />
          <span className="sk sk--pill h-11 w-24" />
        </div>
      </section>
      <section className="flex flex-col gap-4" aria-hidden>
        <SkeletonBar className="w-40" />
        <SkeletonCardGrid items={4} />
      </section>
      <section className="flex flex-col gap-4" aria-hidden>
        <SkeletonBar className="w-28" />
        <SkeletonList rows={3} />
      </section>
    </div>
  );
}

/** Public-page skeleton: a hero block plus two content rows. */
export function PageSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6" aria-busy="true">
      <SkeletonStatus label="Loading Couple's Corner" />
      <div className="flex flex-col gap-3" aria-hidden>
        <SkeletonBar className="sk--title w-64" />
        <SkeletonBar className="h-3 w-full max-w-2xl" />
        <SkeletonBar className="h-3 w-4/5 max-w-xl" />
      </div>
      <SkeletonCardGrid items={4} />
      {children}
    </div>
  );
}

/** Chat/thread skeleton — mirrors alternating message bubbles. */
export function BubbleSkeleton({ bubbles = 4 }: { bubbles?: number }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4" aria-busy="true">
      <SkeletonStatus label="Opening conversation" />
      {Array.from({ length: bubbles }).map((_, index) => (
        <div
          key={index}
          aria-hidden
          className={cx("flex", index % 3 === 1 ? "justify-end" : "justify-start")}
        >
          <span
            className={cx(
              "sk sk--card h-14",
              index % 3 === 1 ? "w-2/5" : index % 3 === 0 ? "w-1/2" : "w-3/5"
            )}
          />
        </div>
      ))}
    </div>
  );
}
