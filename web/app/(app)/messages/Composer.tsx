"use client";

import { Icon } from "@/components/landing/Icon";

/** Message composer — client component so the form can be interactive later. */
export function MessageComposer() {
  return (
    <form
      aria-label="Send a message"
      className="flex items-center gap-2 border-t border-ink-200 pt-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <label htmlFor="message-input" className="sr-only">Message</label>
      <input
        id="message-input"
        type="text"
        placeholder="Write a message…"
        className="h-11 flex-1 rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Send message"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white transition hover:bg-brand-800"
      >
        <Icon name="send" className="h-4 w-4" />
      </button>
    </form>
  );
}