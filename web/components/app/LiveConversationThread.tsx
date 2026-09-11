"use client";

import { useEffect, useRef, useState } from "react";
import { useRealtimeMessages, type RealtimeMessage } from "@/lib/hooks/useRealtimeMessages";
import { getSupabaseClient } from "@/lib/supabase/client";

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

/**
 * Live conversation thread with Supabase Realtime subscription.
 *
 * Merges initial (server-fetched) messages with realtime INSERT/UPDATE
 * events so new messages appear instantly without a page refresh.
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

  // Merge initial messages with realtime ones, deduplicating by id
  const merged = useRef<Map<string, Message>>(new Map());

  // Seed with initial messages
  useEffect(() => {
    merged.current.clear();
    for (const m of initialMessages) {
      merged.current.set(m.id, m);
    }
  }, [initialMessages]);

  // Merge realtime inserts
  useEffect(() => {
    for (const m of realtimeMessages) {
      merged.current.set(m.id, m);
    }
  }, [realtimeMessages]);

  const messages = Array.from(merged.current.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const listRef = useRef<HTMLUListElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-lg font-semibold text-ink-900">No messages yet</p>
        <p className="text-sm text-ink-500">Send the first message to start the conversation.</p>
        {!isConnected && (
          <p className="text-xs text-ink-400">Connecting to realtime…</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Connection indicator */}
      <div className="flex items-center justify-between border-b border-ink-200 px-1 pb-2">
        <span className="text-xs text-ink-500">
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-success-500" : "bg-ink-300"
            }`}
          />
          <span className={isConnected ? "text-success-700" : "text-ink-400"}>
            {isConnected ? "Live" : "Connecting…"}
          </span>
        </span>
      </div>

      {/* Message list */}
      <ul
        ref={listRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto py-3"
        aria-label="Messages"
        role="log"
      >
        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId;
          return (
            <li
              key={message.id}
              className={isMine ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={[
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 sm:max-w-[70%]",
                  isMine
                    ? "rounded-br-md bg-brand-700 text-white"
                    : "rounded-bl-md border border-ink-200 bg-surface text-ink-900",
                ].join(" ")}
              >
                {message.body}
                <span
                  aria-hidden
                  className={[
                    "mt-1 block text-[11px]",
                    isMine ? "text-white/70" : "text-ink-500",
                  ].join(" ")}
                >
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
