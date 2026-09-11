"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/landing/Icon";
import { sendMessageAction } from "@/lib/actions/messaging";

interface MessageComposerProps {
  conversationId: string;
  onSent?: () => void;
}

/**
 * Interactive message composer that sends messages via server action.
 * New messages appear instantly through the realtime subscription.
 */
export function MessageComposer({ conversationId, onSent }: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;

    setBusy(true);
    setError(null);

    try {
      await sendMessageAction({ conversationId, body: text });
      setBody("");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      aria-label="Send a message"
      className="flex items-center gap-2 border-t border-ink-200 pt-4"
      onSubmit={handleSubmit}
    >
      <label htmlFor="message-input" className="sr-only">Message</label>
      <input
        id="message-input"
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a message…"
        disabled={busy}
        className="h-11 flex-1 rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={busy || !body.trim()}
        aria-label="Send message"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white transition hover:bg-brand-800 disabled:opacity-60"
      >
        <Icon name="send" className="h-4 w-4" />
      </button>
      {error && (
        <span role="alert" className="absolute -bottom-6 left-0 text-xs text-danger-700">
          {error}
        </span>
      )}
    </form>
  );
}
