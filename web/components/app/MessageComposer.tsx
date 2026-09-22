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
  const inputRef = useRef<HTMLInputElement>(null);
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl">
      <form
        onSubmit={handleSubmit}
        className="max-w-md mx-auto flex items-center gap-3 relative"
        aria-label="Send a message"
      >
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
          placeholder="Type your message..."
          className="flex-1 bg-slate-900 text-white placeholder-slate-400 border border-slate-700 rounded-full px-4 py-3 text-sm outline-none focus:border-[#2563EB] transition-colors disabled:opacity-60"
          disabled={pending}
          autoFocus
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={pending || !value.trim()}
          className="bg-[#2563EB] text-white w-11 h-11 rounded-full flex items-center justify-center shadow-md hover:bg-blue-600 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Upward Arrow Icon */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-5 h-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
        {error ? (
          <p role="alert" className="absolute -top-7 left-0 text-xs text-red-400 bg-slate-900 px-2 py-1 rounded">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}