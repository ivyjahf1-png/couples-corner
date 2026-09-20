// MessageComposer.tsx
"use client";

import { useState, useRef } from "react";
import { useTransition } from "react";
import { sendMessageAction } from "@/lib/actions/messaging";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";

interface MessageComposerProps {
  conversationId: string;
}

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, reportError] = useActionError();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = value.trim();
    if (!body || pending) return;

    startTransition(async () => {
      reportError(null);
      const result = await sendMessageAction({ conversationId, body });
      if (!result.ok) {
        reportError(failureMessage(
          result.error ?? "Couldn't send your message",
          result.error ?? "Your message didn't go through. Please try again.",
        ));
        return;
      }
      setValue("");
      inputRef.current?.focus();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-end gap-2 rounded-2xl border border-ink-700/70 bg-slate-900/95 p-2 pb-3 backdrop-blur-sm"
      aria-label="Send a message"
    >
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          aria-label="Attach a photo"
          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-white/10 hover:text-ink-200 disabled:opacity-40"
          disabled={pending}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
            <path d="M21.44 11.05L12.33 1.92a1.52 1.52 0 00-1.51-.63A12.5 12.5 0 003 7.8v8.4c0 2.76 2.22 5 5 5a9.74 9.74 0 005.14-2.54l4.61-4.25a1.52 1.52 0 00.37-1.88 1.5 1.5 0 00-1.13-.85L12 15.55l-3.06-4.02a1.5 1.5 0 01.6-2.7l.36-.17" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Add a sticker"
          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-white/10 hover:text-ink-200 disabled:opacity-40"
          disabled={pending}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none rounded-xl border-0 bg-transparent px-3 py-2 text-sm text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ minHeight: 28, maxHeight: 120 }}
          disabled={pending}
          autoFocus
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Open emoji picker"
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-white/10 hover:text-ink-200 disabled:opacity-40"
            disabled={pending}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <circle cx="9" cy="9" r="1" />
              <circle cx="15" cy="9" r="1" />
            </svg>
          </button>
          <button
            type="submit"
            aria-label="Send message"
            disabled={pending || !value.trim()}
            className="rounded-xl bg-[#FF5722] px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition disabled:cursor-not-allowed disabled:opacity-60 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
            onClick={handleSubmit}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger-300">
          {error}
        </p>
      ) : null}
    </form>
  );
}
