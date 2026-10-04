"use client";

import { useEffect, useRef, useState } from "react";
import { ProfileIcon } from "@/components/profile/ProfileIcon";

/**
 * Unique-ID chip with copy-to-clipboard — the row under the name on the profile
 * header ("ID:382906839" plus the copy glyph).
 *
 * WHY THE 2s TIMER IS CLEARED ON UNMOUNT: the original implementation called
 * `window.setTimeout(...)` and never kept the handle, so navigating away during
 * the "Copied" window fired `setCopied` on an unmounted component. React 19 no
 * longer warns about that, but the stale update is still a real leak, and this
 * component is inside the scrollable profile body where route changes are
 * frequent (member taps a stat, then taps Back).
 */
export function CopyIdButton({
  value,
  label,
}: {
  /** The raw ID written to the clipboard. */
  value: string;
  /** Display text; defaults to `ID:<value>`. */
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is denied in some in-app browsers and on http origins.
      // Failing silently is correct here: the ID is already visible on screen,
      // so the member can still read it out longhand.
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy profile ID ${value}`}
      title="Copy ID"
      className="inline-flex max-w-full items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-[#A09AB0] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <span className="truncate tabular-nums">{label ?? `ID:${value}`}</span>
      {copied ? (
        <ProfileIcon name="badge" className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <ProfileIcon name="copy" className="h-3.5 w-3.5 shrink-0 text-[#A09AB0]" />
      )}
      {/* Announced to screen readers only — the tick is a colour/shape cue and
          the visible label does not change. */}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
