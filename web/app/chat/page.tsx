"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRealtimeMessages, type RealtimeMessage } from "@/lib/hooks/useRealtimeMessages";
import { Icon } from "@/components/landing/Icon";
import { BubbleSkeleton } from "@/components/app/Skeleton";
import { buildMessageInsert } from "@/lib/utils/message-payload";

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

const CONVERSATION_ID = "global-chat";

export default function ChatPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLUListElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages: realtimeMessages, isConnected } = useRealtimeMessages({
    conversationId: CONVERSATION_ID,
    enabled: true,
  });

  // Resolve current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.push("/");
        return;
      }
      setUser({ id: data.user.id, email: data.user.email ?? "Anonymous" });
    });
  }, [supabase, router]);

  // Load initial messages
  useEffect(() => {
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, type, body, read_at, created_at")
      .eq("conversation_id", CONVERSATION_ID)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setInitialMessages((data ?? []) as ChatMessage[]);
        }
        setLoading(false);
      });
  }, [supabase]);

  // Merge initial + realtime messages, deduplicate by id
  const merged = useRef<Map<string, ChatMessage>>(new Map());

  useEffect(() => {
    merged.current.clear();
    for (const m of initialMessages) {
      merged.current.set(m.id, m);
    }
  }, [initialMessages]);

  useEffect(() => {
    for (const m of realtimeMessages) {
      merged.current.set(m.id, m as ChatMessage);
    }
  }, [realtimeMessages]);

  const messages = Array.from(merged.current.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Auto-scroll to bottom on new message
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Send message
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !user || sending) return;

    setSending(true);
    setError(null);

    const { error: err } = await supabase.from("messages").insert(
      // Shared builder mirrors `body` into the legacy `content` column so the
      // insert succeeds even before migration 017 is applied.
      buildMessageInsert({
        conversationId: CONVERSATION_ID,
        senderId: user.id,
        body: body.trim(),
        type: "text",
      })
    );

    if (err) {
      setError(err.message);
    } else {
      setBody("");
    }
    setSending(false);
  }

  if (loading) {
    // Instant chat skeleton — same header + bubble geometry as the real thread,
    // so the thread swaps in with no spinner and no layout jump.
    return (
      <div className="app-canvas mx-auto flex h-dvh max-w-3xl flex-col" aria-busy="true">
        <span role="status" aria-live="polite" className="sr-only">
          Opening chat
        </span>
        <header className="flex items-center gap-3 border-b border-ink-700 bg-surface px-4 py-3" aria-hidden>
          <span className="sk sk--avatar block h-10 w-10" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="sk sk--line block w-32" />
            <span className="sk sk--line block h-2.5 w-48" />
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <BubbleSkeleton bubbles={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-canvas mx-auto flex h-dvh max-w-3xl flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-ink-700 bg-surface px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15">
          <Icon name="chat" className="h-5 w-5 text-brand-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-white">Live Chat</h1>
          <p className="truncate text-xs text-ink-400">
            {user?.email ?? "Signing in…"}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-success-500" : "bg-white/20"
            }`}
          />
          <span className={isConnected ? "text-success-300" : "text-ink-400"}>
            {isConnected ? "Live" : "Connecting…"}
          </span>
        </span>
      </header>

      {/* Messages */}
      <ul
        ref={listRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        aria-label="Messages"
        role="log"
      >
        {messages.length === 0 ? (
          <li className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <Icon name="chat" className="h-10 w-10 text-ink-300" />
            <p className="text-lg font-semibold text-white">No messages yet</p>
            <p className="text-sm text-ink-400">
              Be the first to say something — start the conversation!
            </p>
          </li>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === user?.id;
            return (
              <li
                key={message.id}
                className={isMine ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={[
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 sm:max-w-[70%]",
                    isMine
                      ? "rounded-br-md bg-[#FF5722] text-white"
                      : "rounded-bl-md border border-ink-700 bg-surface text-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mb-1 block text-[11px] font-medium",
                      isMine ? "text-white/70" : "text-ink-400",
                    ].join(" ")}
                  >
                    {isMine ? "You" : message.sender_id.slice(0, 8)}
                  </span>
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
          })
        )}
        <div ref={bottomRef} />
      </ul>

      {/* Error */}
      {error ? (
        <div className="border-t border-danger-500/30 bg-danger-500/10 px-4 py-2 text-sm text-danger-300">
          {error}
        </div>
      ) : null}

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-ink-700 bg-surface px-4 py-3"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          disabled={sending || !user}
          className="h-11 flex-1 rounded-xl border border-ink-700 bg-background px-4 text-sm text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !body.trim() || !user}
          aria-label="Send message"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white transition hover:bg-brand-800 disabled:opacity-50"
        >
          <Icon name="send" className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}