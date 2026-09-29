"use client";

import { useState } from "react";
import { FeedUploadModal } from "@/components/app/FeedUploadModal";

/**
 * Floating "+" that opens the photo/moment composer.
 *
 * ── VERTICAL PLACEMENT ──────────────────────────────────────────────────────
 * `bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))]` is 108px. The bottom
 * tab bar is 5rem (80px), so 108px clears it by 28px — the button never sits
 * under the nav, whose links would otherwise win taps in the overlap. The
 * `env(safe-area-inset-bottom)` term keeps that clearance on an iPhone with a
 * home indicator, where the bar is taller than 5rem. The safe-area is ADDED
 * rather than swapped in: a plain `bottom-6.75rem` would push the button into
 * the bar on those devices.
 *
 * `md:` drops the lift, because the bottom bar is `md:hidden` and the sidebar
 * rail takes over — the same reason `AppMain` drops its `pb-20` there.
 *
 * The offset deliberately matches the Explore game button's `bottom-32` (128px)
 * so both floating controls in the app sit on one baseline. They never appear
 * on the same screen, but a shared number is one fewer magic value to keep in
 * step.
 */
export function FeedCreateLauncher({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Create a post"
        className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))] right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/60 bg-amber-300 text-4xl font-bold leading-none text-slate-950 shadow-[0_0_0_4px_rgba(252,211,77,0.18),0_14px_34px_rgba(252,211,77,0.45)] transition hover:bg-amber-200 hover:shadow-[0_0_0_5px_rgba(252,211,77,0.22),0_18px_40px_rgba(252,211,77,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-95 md:bottom-8 md:right-8"
      >
        +
      </button>
      {open ? <FeedUploadModal userId={userId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
