// MessageComposer.tsx — messenger-style bottom bar: plus button, dark pill
// input ("Write a message"), circular send button. Sends via the existing
// sendMessageAction server action; no Supabase linkage changes.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, reportError] = useActionError();
  const [showEmoji, setShowEmoji] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    // Pinned to the bottom of the page's 100dvh column: the bar itself is
    // `shrink-0` (the page wrapper enforces it) and owns the safe-area inset,
    // because the bottom tab nav is hidden inside an active conversation and
    // nothing below this composer applies the iPhone home-indicator clearance.
    // The control row never wraps: every button is `shrink-0` and sized down
    // (not hidden) at the smallest breakpoint, so +, camera, input, emoji and
    // mic all fit side by side on a 320px-wide phone.
    <div className="relative w-full shrink-0 border-t border-white/10 bg-slate-950/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:px-3">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-2xl items-center gap-1 sm:gap-1.5 lg:gap-2.5"
        aria-label="Send a message"
      >
        {/* Circular plus / attach action */}
        <button
          type="button"
          aria-label="More actions"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1E293B] text-ink-200 shadow-md transition hover:bg-white/10 hover:text-white sm:h-11 sm:w-11"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Write a message"
          aria-label="Write a message"
          className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-[#1E293B] px-3 text-sm text-white placeholder:text-ink-400 outline-none transition-colors focus:border-purple-500/60 disabled:opacity-60 sm:h-11 sm:px-4"
          disabled={pending}
        />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" aria-label="Choose an image" />
        {/* Camera/attach. Visible at every breakpoint: with the tab bar hidden
            inside a chat there is room for all five controls on a phone, and
            `shrink-0` guarantees they never compress or wrap. */}
        <button type="button" onClick={() => imageInputRef.current?.click()} aria-label="Choose image" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none text-purple-200 transition hover:bg-white/10 sm:h-11 sm:w-11 sm:text-xl">▧</button>
        <button type="button" onClick={() => setShowEmoji((value) => !value)} aria-label="Select emoji" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none text-purple-200 transition hover:bg-white/10 sm:h-11 sm:w-11 sm:text-xl">☺</button>
        <button type="button" aria-label="Record voice note" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-400/20 bg-purple-400/10 text-base leading-none text-purple-200 transition hover:bg-purple-400/20 sm:h-11 sm:w-11 sm:text-lg">🎙</button>
        {showEmoji ? <div className="absolute bottom-16 left-20 z-10 flex gap-1 rounded-xl border border-white/10 bg-[#1E293B] p-2 shadow-xl">{["❤️", "✨", "😂", "👍"].map((emoji) => <button key={emoji} type="button" onClick={() => { setValue((current) => `${current}${emoji}`); setShowEmoji(false); }} className="rounded-lg p-1 text-xl hover:bg-white/10" aria-label={`Insert ${emoji}`}>{emoji}</button>)}</div> : null}
        {/* Circular send button */}
        <button
          type="submit"
          aria-label="Send message"
          disabled={pending || !value.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </button>
        {error ? (
          <p role="alert" className="absolute -top-7 left-0 rounded bg-slate-900 px-2 py-1 text-xs text-red-400">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}