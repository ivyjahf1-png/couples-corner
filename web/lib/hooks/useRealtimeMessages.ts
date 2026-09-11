"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface RealtimeMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseRealtimeMessagesOptions {
  conversationId: string | null;
  enabled?: boolean;
}

interface UseRealtimeMessagesReturn {
  messages: RealtimeMessage[];
  isConnected: boolean;
  error: string | null;
}

/**
 * Subscribe to real-time message updates for a conversation.
 *
 * Uses Supabase Realtime's `postgres_changes` listener to receive
 * new messages instantly without polling or manual refresh.
 *
 * @example
 * const { messages, isConnected } = useRealtimeMessages({
 *   conversationId: "abc-123",
 *   enabled: true,
 * });
 */
export function useRealtimeMessages({
  conversationId,
  enabled = true,
}: UseRealtimeMessagesOptions): UseRealtimeMessagesReturn {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Stable handler for new messages
  const handleInsert = useCallback((payload: { new: RealtimeMessage }) => {
    const incoming = payload.new;
    setMessages((prev) => {
      // Deduplicate by id (safety guard against double delivery)
      if (prev.some((m) => m.id === incoming.id)) return prev;
      return [...prev, incoming];
    });
  }, []);

  useEffect(() => {
    if (!enabled || !conversationId) {
      setMessages([]);
      setIsConnected(false);
      return;
    }

    const supabase = getSupabaseClient();

    // Create a unique channel per conversation
    const channelName = `messages:${conversationId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleInsert
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as RealtimeMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          setError(null);
        } else if (status === "CHANNEL_ERROR") {
          setIsConnected(false);
          setError("Realtime connection error");
        } else if (status === "TIMED_OUT") {
          setIsConnected(false);
          setError("Realtime connection timed out");
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [conversationId, enabled, handleInsert]);

  return { messages, isConnected, error };
}
