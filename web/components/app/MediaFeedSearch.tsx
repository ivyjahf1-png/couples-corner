"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { normalizeInviteCode } from "@/lib/utils/invite";

/**
 * Glass search field for the media feed overlay.
 *
 * Accepts either the 6-character public user code (NNXXXX, migration 032) or a
 * username. Codes are normalized before submit so a lowercase paste still
 * resolves, and the result is a client-side navigation so the app shell and
 * feed keep their state instead of tearing the page down on every search.
 *
 * The field fills the space the overlay gives it (`w-full` + `flex-1`) rather
 * than hugging its placeholder, and the submit button is always rendered so the
 * control reads as one professional search unit instead of a bare input.
 */
export function MediaFeedSearch({ action = "/" }: { action?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  // Prefill when the user lands back with ?q= in the URL. Read from
  // window.location rather than useSearchParams so this stays out of a
  // Suspense boundary at the root of the app.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setValue(q);
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    const params = new URLSearchParams();
    params.set("q", normalizeInviteCode(trimmed) ?? trimmed);
    router.push(`${action}?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="flex w-full items-center gap-2 sm:gap-2.5">
      <label htmlFor="media-feed-search" className="sr-only">
        Search members by 6-letter ID or username
      </label>
      <div className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/70 px-4 shadow-lg shadow-black/30 backdrop-blur-md transition-colors focus-within:border-orange-400/70 focus-within:bg-slate-950/90">
        <Search className="h-4.5 w-4.5 shrink-0 text-white/60" aria-hidden />
        {/* Focus styling: this bar opts OUT of the app-wide focus ring.

            globals.css sets a global `:focus-visible { outline: 2px solid
            var(--focus-ring) }` (an orange ring). `focus:outline-none` alone
            does NOT cancel it: that utility only targets `:focus`, whereas a
            text input also matches `:focus-visible` once the user types, so
            the ring kept reappearing on top of the input.
            `focus-visible:outline-none` is what actually suppresses it.

            `ring-0` neutralises any box-shadow ring the preflight/global layer
            could add, and `focus:border-transparent` stops the browser's own
            border repaint. The remaining visual focus affordance is the
            wrapper's `focus-within` treatment, which stays on. */}
        <input
          id="media-feed-search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={40}
          placeholder="Search by 6-letter ID or username..."
          aria-label="Search by 6-letter ID or username"
          autoComplete="off"
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-white placeholder:text-white/50 focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:text-[15px]"
        />
        {/* Clear affordance, only once there is something to clear. */}
        {value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Clear search"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={!value.trim()}
        className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-orange-500 to-[#FF5722] px-4 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
      >
        <Search className="h-4 w-4 sm:hidden" aria-hidden />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}