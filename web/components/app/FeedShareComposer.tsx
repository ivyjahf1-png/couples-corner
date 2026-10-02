"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { FeedUploadModal } from "@/components/app/FeedUploadModal";

/**
 * The "Share with the community" composer at the top of the feed.
 *
 * WHY A BUTTON-ONLY COMPOSER RATHER THAN A REAL TEXTAREA: writing a post runs
 * through `FeedUploadModal`, which already owns file selection, the media
 * preview, validation and the submit call. A second inline editor here would be a
 * parallel, weaker version of a screen that already exists — and two editors on one
 * screen is how the "which one do I type in?" problem starts.
 *
 * So the card advertises the action and opens the real composer. The whole card is
 * the tap target, not just the icon, because a 44px circle in the corner of a wide
 * glass panel is a poor target on a phone.
 *
 * The camera glyph is ARIA-HIDDEN and the button carries the label: a screen reader
 * should announce "Create a post", not "camera".
 */
export function FeedShareComposer({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Create a post"
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-left backdrop-blur-md transition hover:border-white/20 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
      >
        {/* Placeholder doubles as the affordance label. `truncate` keeps the copy
            on one line rather than wrapping and growing the card. */}
        <span className="min-w-0 flex-1 truncate text-sm text-ink-400">Share Your feed</span>
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-400"
        >
          <Camera className="h-5 w-5" />
        </span>
      </button>
      {open ? <FeedUploadModal userId={userId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}