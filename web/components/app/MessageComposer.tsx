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
    <div className="relative border-t border-white/10 bg-slate-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-2xl items-center gap-2.5"
        aria-label="Send a message"
      >
        {/* Circular plus / attach action */}
        <button
          type="button"
          aria-label="More actions"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1E293B] text-ink-200 shadow-md transition hover:bg-white/10 hover:text-white"
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
          className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-[#1E293B] px-4 text-sm text-white placeholder:text-ink-400 outline-none transition-colors focus:border-purple-500/60 disabled:opacity-60"
          disabled={pending}
        />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" aria-label="Choose an image" />
        <button type="button" onClick={() => imageInputRef.current?.click()} aria-label="Choose image" className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-purple-200 transition hover:bg-white/10 sm:flex">▧</button>
        <button type="button" onClick={() => setShowEmoji((value) => !value)} aria-label="Select emoji" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-purple-200 transition hover:bg-white/10">☺</button>
        <button type="button" aria-label="Record voice note" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-400/20 bg-purple-400/10 text-purple-200 transition hover:bg-purple-400/20">🎙</button>
        {showEmoji ? <div className="absolute bottom-16 left-20 z-10 flex gap-1 rounded-xl border border-white/10 bg-[#1E293B] p-2 shadow-xl">{["❤️", "✨", "😂", "👍"].map((emoji) => <button key={emoji} type="button" onClick={() => { setValue((current) => `${current}${emoji}`); setShowEmoji(false); }} className="rounded-lg p-1 text-xl hover:bg-white/10" aria-label={`Insert ${emoji}`}>{emoji}</button>)}</div> : null}
        {/* Circular send button */}
        <button
          type="submit"
          aria-label="Send message"
          disabled={pending || !value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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