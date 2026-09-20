// LiveChatThread.tsx — merged server + realtime message stream with seeded starter.

"use client";

import { useState, useEffect } from "react";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";
import { getSupabaseClient } from "@/lib/supabase/client";
import { sendMessageAction } from "@/lib/actions/messaging";
import type { ChatStarter } from "@/lib/feature/types";

interface Message {
  id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
}

interface LiveChatThreadProps {
  conversationId: string;
  starter: ChatStarter | null;
  currentUserId: string;
  initialMessages: Message[];
}

interface RenderedMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function LiveChatThread({
  conversationId,
  starter,
  currentUserId,
  initialMessages,
}: LiveChatThreadProps) {
  const supabase = getSupabaseClient();
  const isSupabaseReady = supabase !== null;
  const { messages: realtimeMessages, isConnected } = useRealtimeMessages({
    conversationId,
    enabled: isSupabaseReady,
  });

  const [localMessages, setLocalMessages] = useState<RenderedMessage[]>(
    () =>
      initialMessages.map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        body: m.body ?? "",
        created_at: m.created_at,
      }))
  );

  useEffect(() => {
    setLocalMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const incoming = realtimeMessages
        .filter((m) => !seen.has(m.id))
        .map((m) => ({
          id: m.id,
          sender_id: m.sender_id,
          body: m.body ?? "",
          created_at: m.created_at,
        }));
      return prev.concat(incoming);
    });
  }, [realtimeMessages]);

  const merged = localMessages
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

  const messageCount = merged.length;

  async function handleUseStarter() {
    if (!starter) return;
    const result = await sendMessageAction({ conversationId, body: starter.body });
    if (!result.ok) {
      console.error(
        "[LiveChatThread] starter send failed",
        result.error ?? "Unknown error",
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex items-center justify-between border-b border-ink-700/70 px-1 py-2">
        <span className="text-xs text-ink-400">
          {messageCount} message{messageCount === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span
            className={[
              "h-2 w-2 rounded-full",
              isConnected ? "bg-success-500" : "bg-white/20",
            ].join(" ")}
            aria-hidden
          />
          <span
            className={isConnected ? "text-success-300" : "text-ink-400"}
          >
            {isConnected ? "Live" : "Connecting…"}
          </span>
        </span>
      </div>

      {messageCount === 0 && starter ? (
        <div className="mx-4 mt-4 flex max-w-[88%] flex-col gap-1.5 rounded-2xl border border-ink-700 bg-surface/60 px-4 py-3 backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-white">{starter.body}</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-400">Just for you 💌</span>
            <button
              type="button"
              aria-label="Send this starter"
              className="text-[11px] font-medium text-orange-300 transition hover:text-orange-200"
              onClick={handleUseStarter}
            >
              Use this starter
            </button>
          </div>
        </div>
      ) : null}

      <ul
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 scrollbar-thin"
        aria-label="Messages"
        role="log"
      >
        {merged.map((message) => {
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
                    : "rounded-bl-md border border-ink-700 bg-surface text-white",
                ].join(" ")}
              >
                {message.body}
                <span
                  aria-hidden
                  className={[
                    "mt-1 block text-[11px]",
                    isMine ? "text-white/70" : "text-ink-400",
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
