"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { normalizeInviteCode } from "@/lib/utils/invite";

/**
 * Glass search field for the media feed overlay.
 *
 * Accepts either the 6-character public user code (NNXXXX, migration 032) or a
 * username. Codes are normalized before submit so a lowercase paste still
 * resolves. Submits via GET so the destination stays a real, shareable URL.
 */
export function MediaFeedSearch({ action = "/" }: { action?: string }) {
  const [value, setValue] = useState("");

  // Prefill when the user lands back with ?q= in the URL.
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
    window.location.assign(`${action}?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="flex items-center gap-2">
      <label htmlFor="media-feed-search" className="sr-only">
        Search members by user ID or username
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/15 bg-slate-950/60 px-3 py-2 backdrop-blur-md focus-within:border-orange-400/60">
        <Search className="h-4 w-4 shrink-0 text-white/60" aria-hidden />
        <input
          id="media-feed-search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={40}
          placeholder="Search user ID or username"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={!value.trim()}
        className="shrink-0 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-40"
      >
        Search
      </button>
    </form>
  );
}