"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send } from "lucide-react";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
import { notifyFailure } from "@/components/ui/FailureToasts";

/**
 * "Message" action for another member's profile.
 *
 * WHY A COMPOSER AND NOT A BLANK THREAD: there is no route that opens an empty
 * direct conversation - a conversation is only ever created by sending into it
 * (`sendFirstImpressionAction` find-or-creates, then returns the id). So the
 * button opens a small sheet, the member writes a first line, and we route them
 * straight into the resulting thread. An empty thread would be a dead end.
 *
 * Reuses the EXISTING send path rather than adding a second one, so a message
 * started here is the same row as one started from Discover, and both members
 * see it in the inbox.
 */
export function MessageProfileButton({
  recipientId,
  recipientName,
}: {
  recipientId: string;
  /** Used for the sheet heading; falls back to a neutral label. */
  recipientName?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const name = recipientName?.trim() || "this member";

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const result = await sendFirstImpressionAction({ recipientId, body: text });
      if (!result.ok) {
        notifyFailure(result.error ?? "Couldn't send your message. Please try again.");
        return;
      }
      setOpen(false);
      setBody("");
      // Straight into the thread so the message is visibly delivered rather than
      // silently filed. Falls back to the inbox if no id came back.
      if (result.conversationId) {
        router.push(`/messages/${result.conversationId}` as never);
      } else {
        router.push("/messages" as never);
      }
      router.refresh();
    } catch {
      notifyFailure("Couldn't send your message. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Message ${name}`}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Message
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Message ${name}`}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0F172A] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">Message {name}</h2>
                <p className="truncate text-xs text-ink-300">Start the conversation</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <label htmlFor="profile-message-input" className="sr-only">
                Your message
              </label>
              <textarea
                id="profile-message-input"
                rows={3}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={`Say hello to ${name}` + String.fromCharCode(8230)}
                maxLength={500}
                className="w-full resize-none rounded-2xl border border-ink-700 bg-white/[0.04] py-2.5 pl-3.5 pr-14 text-sm leading-6 text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!body.trim() || busy}
                aria-label="Send message"
                title="Send"
                className={[
                  "absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full transition",
                  // Solid shape when disabled, for the same reason as the Discover
                  // composer: a faded control reads as "missing", not "not ready".
                  body.trim() && !busy
                    ? "bg-gradient-to-br from-orange-500 to-[#FF5722] text-white hover:brightness-110"
                    : "border border-white/15 bg-white/[0.06] text-ink-400",
                ].join(" ")}
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[11px] text-ink-400">
                {busy ? "Sending" + String.fromCharCode(8230) : "Enter to send " + String.fromCharCode(183) + " Shift+Enter for a new line"}
              </span>
              <span className="text-[11px] tabular-nums text-ink-400">{body.length}/500</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
