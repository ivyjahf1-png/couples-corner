"use client";

import { useEffect, useRef, useState } from "react";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string | null;
  created_at: string;
}

interface LiveConversationThreadProps {
  conversationId: string;
  currentUserId: string;
  initialMessages?: Message[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

/**
 * Live chat thread with Supabase Realtime subscription.
 *
 * Merges initial (server-fetched) messages with realtime INSERT/UPDATE
 * events so new messages appear instantly without a page refresh.
 *
 * UI: centered date-separator pills, dark incoming cards on the left,
 * vibrant purple outgoing bubbles on the right with timestamps.
 */
export function LiveConversationThread({
  conversationId,
  currentUserId,
  initialMessages = [],
}: LiveConversationThreadProps) {
  const { messages: realtimeMessages, isConnected } = useRealtimeMessages({
    conversationId,
    enabled: true,
  });

  const [renderTick, setRenderTick] = useState(0);

  // Merge initial messages with realtime ones, deduplicating by id
  const merged = useRef<Map<string, Message>>(new Map());

  // Seed with initial messages
  useEffect(() => {
    merged.current.clear();
    for (const m of initialMessages) {
      merged.current.set(m.id, m);
    }
    setRenderTick((t) => t + 1);
  }, [initialMessages]);

  // Merge realtime inserts
  useEffect(() => {
    let changed = false;
    for (const m of realtimeMessages) {
      if (!merged.current.has(m.id)) {
        merged.current.set(m.id, m);
        changed = true;
      }
    }
    if (changed) setRenderTick((t) => t + 1);
  }, [realtimeMessages]);

  void renderTick;

  const messages = Array.from(merged.current.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const listRef = useRef<HTMLUListElement>(null);

  // Auto-scroll to bottom on new message.
  //
  // This <ul> is NOT the scroll container - the page-level wrapper is. So we
  // resolve the nearest scrolling ancestor and scroll that; falling back to the
  // element itself keeps this working if the structure ever changes back.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const scroller = el.closest("[data-chat-scroll]") as HTMLElement | null;
    const target = scroller ?? el;
    target.scrollTop = target.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-lg font-semibold text-white">No messages yet</p>
        <p className="text-sm text-ink-400">Send the first message to start the chat.</p>
        {!isConnected && (
          <p className="text-xs text-ink-400">Connecting to realtime…</p>
        )}
      </div>
    );
  }

  let lastDay = "";

  return (
    <div className="flex flex-col">
      {/* Message list. Padding lives on the page-level scroll wrapper, so it is
          omitted here to avoid doubling it. This <ul> is intentionally NOT a
          scroll container: two nested overflow-y-auto regions cause scroll
          chaining, which is the erratic bouncing this page used to have. */}
      <ul
        ref={listRef}
        className="flex flex-col gap-2 overflow-x-hidden"
        aria-label="Messages"
        role="log"
      >
        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId;
          const day = dayLabel(message.created_at);
          const showDayPill = day !== lastDay;
          lastDay = day;
          return (
            <li key={message.id} className="flex flex-col">
              {showDayPill ? (
                <div className="mb-2 mt-1 flex justify-center">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-ink-300">
                    {day}
                  </span>
                </div>
              ) : null}
              <div className={isMine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[80%] px-4 py-2.5 text-sm leading-6 sm:max-w-[70%]",
                    isMine
                      ? "rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-950/40"
                      : "rounded-2xl rounded-bl-md border border-white/10 bg-[#1E293B] text-white shadow-md shadow-black/30",
                  ].join(" ")}
                >
                  {message.body}
                  <span
                    aria-hidden
                    className={[
                      "mt-1 block text-right text-[11px]",
                      isMine ? "text-white/70" : "text-ink-400",
                    ].join(" ")}
                  >
                    {formatTime(message.created_at)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
