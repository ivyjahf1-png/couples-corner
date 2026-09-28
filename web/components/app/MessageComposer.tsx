// MessageComposer.tsx — messenger-style bottom bar: plus button, dark pill
// input ("Write a message"), circular send button. Sends via the existing
// sendMessageAction server action; no Supabase linkage changes.
"use client";

import { useState, useRef } from "react";
import { useTransition } from "react";
import { sendMessageAction } from "@/lib/actions/messaging";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";
import { Camera, Mic, Paperclip, Send, Smile } from "lucide-react";

/** The quick-emoji strip, matching the four reactions the app already uses. */
const QUICK_EMOJI = ["❤️", "✨", "😂", "👍"] as const;

interface MessageComposerProps {
  conversationId: string;
}

/**
 * Bottom message toolbar.
 *
 * FLUSH CONTROL ROW: every control is a square `h-11 w-11` with `shrink-0`, so
 * the attach, image, emoji and mic buttons all sit on one optical line and the
 * input is the only element that flexes. The previous row mixed a bordered
 * `h-10 w-10` plus button, a `h-9 w-9` text button, a `h-9 w-9` emoji button, a
 * bordered `h-9 w-9` mic and an `h-10 w-10` send — five different sizes and
 * three different surface treatments, which is what made the bar look assembled
 * rather than designed. One size, one treatment, one baseline.
 *
 * The glyphs were emoji (▧, ☺, 🎙), which render at different intrinsic sizes
 * and baselines per platform; Lucide line icons share one 24px grid, so the row
 * stays square on every OS.
 *
 * The send button now uses the same orange brand accent as the sent bubbles, so
 * "what I send" and "what I press to send" are the same colour.
 */
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
    //
    // The control row never wraps: every button is `shrink-0` and sized down
    // (not hidden) at the smallest breakpoint, so +, camera, input, emoji and
    // mic all fit side by side on a 320px-wide phone.
    <div className="relative w-full shrink-0 border-t border-white/10 bg-slate-950/90 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:px-3">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-2xl items-center gap-1 sm:gap-1.5 lg:gap-2"
        aria-label="Send a message"
      >
        {/* Shared treatment for every secondary control. One class string for
            all four so they cannot drift apart again. */}
        <button
          type="button"
          aria-label="More actions"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-300 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Paperclip className="h-5 w-5" aria-hidden />
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
          // `h-11` matches the controls, and the focus ring uses the same orange
          // accent as the send button so focus and action read as one system.
          className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white placeholder:text-ink-400 outline-none transition-colors focus:border-orange-400/60 focus:bg-white/[0.09] disabled:opacity-60"
          disabled={pending}
        />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" aria-label="Choose an image" />
        {/* Camera/attach. Visible at every breakpoint: with the tab bar hidden
            inside a chat there is room for all five controls on a phone, and
            `shrink-0` guarantees they never compress or wrap. */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          aria-label="Choose image"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-300 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Camera className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setShowEmoji((current) => !current)}
          aria-label="Select emoji"
          aria-expanded={showEmoji}
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95",
            showEmoji ? "bg-white/15 text-white" : "text-ink-300 hover:bg-white/10 hover:text-white",
          ].join(" ")}
        >
          <Smile className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Record voice note"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-300 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Mic className="h-5 w-5" aria-hidden />
        </button>
        {showEmoji ? (
          <div className="absolute bottom-16 left-20 z-10 flex gap-1 rounded-xl border border-white/10 bg-[#1E293B] p-2 shadow-xl">
            {QUICK_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setValue((current) => `${current}${emoji}`);
                  setShowEmoji(false);
                  inputRef.current?.focus();
                }}
                className="rounded-lg p-1 text-xl hover:bg-white/10"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
        {/* Circular send button. Shares the sent-bubble orange so the action and
            its result are unmistakably the same colour. */}
        <button
          type="submit"
          aria-label="Send message"
          disabled={pending || !value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-950/40 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-5 w-5" aria-hidden />
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