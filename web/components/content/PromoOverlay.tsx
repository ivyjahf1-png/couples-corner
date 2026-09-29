"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ContentItem } from "@/lib/models";

/**
 * A promoted, in-app placement rendered by `app/(app)/layout.tsx`.
 *
 * ── WHY THIS IS NOT A MODAL ────────────────────────────────────────────────
 * This used to render `fixed inset-0 z-[80] bg-black/65` — a full-viewport
 * backdrop with no `pointer-events-none`, no tap-outside handler and no Escape
 * handler. Because it fires from the ROOT LAYOUT, 1.2s after load, on every
 * page in the app, that blanket swallowed every touch and scroll gesture behind
 * it: the page underneath became completely unresponsive until the member found
 * the small "Close" button. It also declared `role="dialog" aria-modal="true"`
 * with no focus trap and no scroll lock, so it trapped input without managing
 * any of the responsibilities that make a modal modal.
 *
 * The reported symptom — "the screen stops being scrollable when an ad
 * appears" — is this, and it was NOT specific to the feed: it affected every
 * route, because the layout renders it.
 *
 * The fix is to stop pretending to be a modal. The wrapper is
 * `pointer-events-none` so it can never intercept a scroll or a tap meant for
 * the page, and only the card itself (plus a tap-outside catcher) takes pointer
 * events. The member keeps scrolling and using the app normally while the promo
 * sits in the corner, which is how mainstream apps present an in-app promotion.
 * ───────────────────────────────────────────────────────────────────────────
 */
export function PromoOverlay({ item }: { item: ContentItem }) {
  const [open, setOpen] = useState(false);
  // One timer ref, so the open timer is cancelled on unmount and cannot stack.
  const timerRef = useRef<number | null>(null);

  /**
   * @param remember also record the dismissal so this promo does not reappear.
   *   Navigating away (a CTA click) does NOT remember — the member chose to go
   *   somewhere, and the promo is still relevant when they come back.
   */
  const close = useCallback(
    (remember: boolean) => {
      setOpen(false);
      if (!remember) return;
      try {
        sessionStorage.setItem(`cc-promo-${item.id}`, "dismissed");
      } catch {
        // Private mode / storage disabled: the promo simply reappears later,
        // which is harmless. A storage failure must never break the page.
      }
    },
    [item.id]
  );

  useEffect(() => {
    const key = `cc-promo-${item.id}`;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(key) === "dismissed";
    } catch {
      // As above — treat an unreadable store as "not dismissed".
    }
    if (dismissed) return;
    timerRef.current = window.setTimeout(() => setOpen(true), 1200);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [item.id]);

  // Escape dismisses. Bound to the window rather than the card, because the
  // card will not reliably hold focus.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  if (!open) return null;

  const external = item.destinationUrl?.startsWith("http");
  const action = item.destinationUrl ?? "/";

  return (
    // `pointer-events-none` on the wrapper IS the scroll-lock fix: the element
    // covers the corner but cannot take a single pointer event, so the page
    // beneath scrolls normally wherever the promo sits.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-4 sm:justify-end">
      {/* Tap-outside catcher. Sits UNDER the card (no z-index, earlier in paint
          order) and is the only part of the overlay that takes pointer events
          away from the page, so a tap in the empty margin dismisses the promo
          instead of doing nothing at all. */}
      <button
        type="button"
        onClick={() => close(true)}
        aria-label="Dismiss advertisement"
        className="pointer-events-auto absolute inset-0 cursor-default"
      />
      <section
        aria-label={item.title}
        // `pointer-events-auto` puts the card back above that catcher. The card
        // is deliberately NOT aria-modal: it no longer blocks the page, and
        // claiming to be modal while the background stays interactive is what
        // made the original wrong for screen readers too.
        className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#0B1120] shadow-2xl shadow-black/60"
      >
        <div className="relative aspect-[16/9] bg-slate-800">
          {item.mediaType === "video" ? (
            <video
              src={item.mediaUrl}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={item.mediaUrl} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
          <button
            type="button"
            onClick={() => close(true)}
            aria-label="Close advertisement"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
            Sponsored
          </span>
          <h2 className="mt-1 text-base font-bold leading-snug text-white">{item.title}</h2>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/65">
              {item.description}
            </p>
          ) : null}
          {external ? (
            <a
              href={action}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close(false)}
              className="mt-3 block w-full rounded-xl bg-orange-500 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-orange-400"
            >
              {item.buttonText || "Explore now"}
            </a>
          ) : (
            <Link
              href={action}
              onClick={() => close(false)}
              className="mt-3 block w-full rounded-xl bg-orange-500 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-orange-400"
            >
              {item.buttonText || "Explore now"}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
