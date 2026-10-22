/**
 * Skeleton for the private inbox.
 *
 * WHY THIS EXISTS. `/messages` is `force-dynamic`: every visit re-runs two
 * server reads, so there is always a window where the route has produced nothing
 * to render. Without a boundary, Next holds the previous screen (or a blank
 * frame) for that whole window, which reads on a phone as "the app froze".
 *
 * THE SHAPE MATCHES THE REAL SCREEN ON PURPOSE. This is a layout skeleton, not a
 * spinner: it mirrors the header block, the stories rail, the Best Matches rail,
 * the segmented tabs and the chat rows at their true heights, so the transition
 * to loaded content shifts almost nothing. That also means no CLS - the single
 * biggest contributor to a slow-feeling page.
 *
 * THE DIMENSIONS ARE THE REAL ONES. The conversation rows use `Avatar` at
 * `size="lg"`, which is a 64px (`h-16 w-16`) circle - the previous skeleton drew
 * a 44px one, so every row changed size when the data landed. The Best Matches
 * cards are `h-44 w-32`, the story cells are `w-16`, and the tab strip is a
 * `p-1` rounded bar with two equal halves.
 *
 * THE SHIMMER COMES FROM THE GLOBAL `.sk` CLASS, not from `animate-pulse`. A
 * pulse fades the whole block in and out, which reads as a blinking placeholder;
 * the `.sk` sweep slides a highlight across the block, which reads as a surface
 * waiting for its content. `.sk` is also already wired into the global
 * `prefers-reduced-motion` block, so the sweep stops for members who asked for
 * no motion - `animate-pulse` needed a `motion-reduce:` twin on every element.
 *
 * RESPONSIVE BY CONSTRUCTION. The rows and the header scale with the viewport
 * (fluid widths, `sm:` breakpoints); the two horizontal rails keep their own
 * width and scroll, exactly like the real screen, so nothing overflows sideways
 * on a narrow phone.
 *
 * THE PURPLE CANVAS, LIKE THE LOADED PAGE. These bars are decorative, so they are
 * `aria-hidden` and carry no semantics; a screen reader reaches the real heading
 * only once the data has resolved.
 */
export default function MessagesLoading() {
  return (
    <div
      aria-hidden
      /* THE ROOT MIRRORS THE PAGE'S OWN WRAPPER EXACTLY.

         `page.tsx` renders `flex h-full min-h-0 w-full flex-col overflow-hidden`
         around `MessagesInbox`, and `MessagesInbox`'s own root is
         `flex h-full min-h-0 flex-col`. The skeleton has to reproduce that chain
         or the sections it draws get heights from the wrong box: `loading.tsx`
         replaces the PAGE, so it must supply the same wrapper the page would
         have supplied. With it, the stories rail, the matches rail and the tab
         strip are `shrink-0` and the list below them is the only flexible
         region — exactly like the loaded screen, so nothing reflows when the
         data lands.

         `overflow-hidden` (not `overflow-y-auto`) because the skeleton is a
         fixed set of placeholders: it should never scroll, and it must not
         paint a scrollbar the loaded page does not have. */
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0F0C1B]"
    >
      {/* ── A. APP BAR ───────────────────────────────────────────────────────
          "Chat" title on the left, the two square icon buttons on the right.
          The real header is `border-b border-white/10 bg-slate-950/40`; the
          skeleton keeps the same border so the rule sits at the same pixel. */}
      <header className="shrink-0 border-b border-white/10 bg-slate-950/40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="sk sk--title w-24" />
          <div className="flex items-center gap-2">
            <div className="sk h-9 w-9" />
            <div className="sk h-9 w-9" />
          </div>
        </div>
      </header>

      {/* The search field appears here when it is opened. It is not drawn in the
          skeleton because it is closed by default — showing it would imply a
          state the loaded screen does not have. */}

      {/* ── B. STORIES RAIL ─────────────────────────────────────────────────
          Circular cells, `w-16` apart, each with a ring and a caption. */}
      <section className="shrink-0 pt-3">
        <div className="flex gap-4 overflow-hidden px-4 pb-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <div className="sk sk--avatar h-16 w-16" />
              <div className="sk sk--pill h-3 w-12" />
            </div>
          ))}
        </div>
      </section>

      {/* ── C. BEST MATCHES RAIL ───────────────────────────────────────────
          Real cards are `h-44 w-32` with a photo and a bottom scrim. */}
      <section className="shrink-0 pt-1">
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="sk sk--pill h-4 w-28" />
          <div className="sk sk--pill h-3 w-16" />
        </div>
        <div className="flex gap-3 overflow-hidden px-4 pb-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="sk h-44 w-32 shrink-0" />
          ))}
        </div>
      </section>

      {/* ── D. SEGMENTED TABS ───────────────────────────────────────────────
          Two equal halves inside a `p-1` rounded bar. */}
      <div className="shrink-0 px-4 pb-2">
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
          <div className="sk sk--pill h-9 flex-1" />
          <div className="sk sk--pill h-9 flex-1" />
        </div>
      </div>

      {/* ── E. MAIN LIST ────────────────────────────────────────────────────
          The ONLY scroll region on the real screen. Here it is a static column
          of placeholder rows; `pb-28` reserves the space the fixed bottom
          dock occupies on the loaded page, so the last row does not slide up
          under it when the data lands.

          Six rows, not eight: with a 64px avatar the row is taller than the
          old skeleton's 44px one, and eight of them pushed the skeleton past
          a phone screen. */}
      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-28">
        <ul className="flex flex-col">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-3">
              <div className="sk sk--avatar h-16 w-16 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="sk sk--pill h-3 w-1/3" />
                <div className="sk sk--pill h-3 w-2/3" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="sk sk--pill h-3 w-10" />
                <div className="sk sk--pill h-4 w-14" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}