/**
 * Skeleton for the private inbox.
 *
 * WHY THIS EXISTS. `/messages` is `force-dynamic`: every visit re-runs two
 * server reads, so there is always a window where the route has produced nothing
 * to render. Without a boundary, Next holds the previous screen (or a blank
 * frame) for that whole window, which reads on a phone as "the app froze".
 *
 * THE SHAPE MATCHES THE REAL SCREEN ON PURPOSE. This is a layout skeleton, not a
 * spinner: it mirrors the header block, the scam strip, the four quick-action
 * tiles and the chat rows at their true heights, so the transition to loaded
 * content shifts almost nothing. That also means no CLS - the single biggest
 * contributor to a slow-feeling page.
 *
 * THE PURPLE CANVAS, LIKE THE LOADED PAGE. These bars are decorative, so they are
 * `aria-hidden` and carry no semantics; a screen reader reaches the real heading
 * only once the data has resolved.
 */
export default function MessagesLoading() {
  return (
    <div
      aria-hidden
      className="mx-auto w-full max-w-md overflow-hidden bg-[#0F0C1B] sm:max-w-2xl lg:max-w-3xl"
    >
      {/* Header: title + Filters button, then the pill row that collapses away. */}
      <div className="border-b border-white/[0.08] px-3 pb-4 pt-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-40 flex-1 animate-pulse rounded-lg bg-white/[0.06] motion-reduce:animate-none" />
          <div className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
        </div>
        <div className="mt-3 flex gap-2">
          <div className="h-8 w-16 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
          <div className="h-8 w-20 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
          <div className="h-8 w-16 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
        </div>
      </div>

      <div className="px-3 pb-28 pt-4 sm:px-5">
        {/* Scam warning strip. */}
        <div className="h-[4.5rem] animate-pulse rounded-2xl bg-white/[0.06] motion-reduce:animate-none" />

        {/* Four quick-action tiles. */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-[4.5rem] animate-pulse rounded-2xl bg-white/[0.06] motion-reduce:animate-none"
            />
          ))}
        </div>

        {/* Chat rows. Eight is a deliberate cap: it fills a phone screen and
            beyond that the skeleton is taller than the data it replaces, which
            makes the page feel slower rather than faster. */}
        <ul className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <li
              key={i}
              className="flex h-[4.5rem] items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:gap-4"
            >
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/[0.10] motion-reduce:animate-none" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.10] motion-reduce:animate-none" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.10] motion-reduce:animate-none" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}