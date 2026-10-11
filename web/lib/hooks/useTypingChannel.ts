"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/** How long the peer is shown as typing after their last keystroke event. */
const TYPING_WINDOW_MS = 3_000;
/** Minimum gap between outgoing typing events, so a fast typist is not a flood. */
const SEND_THROTTLE_MS = 1_500;

interface UseTypingChannelOptions {
  conversationId: string | null;
  /** This member's user id — used to ignore their own echoed events. */
  selfId: string;
  enabled?: boolean;
}

interface UseTypingChannelReturn {
  /** True while the OTHER participant is believed to be typing. */
  peerTyping: boolean;
  /** Call on every keystroke; throttled internally, so just call it. */
  announceTyping: () => void;
}

/**
 * Live "is typing…" over a Supabase Realtime broadcast channel.
 *
 * WHY BROADCAST AND NOT `postgres_changes`. Typing is ephemeral — it has no
 * business being a database write. Writing a keystroke event to a table means a
 * row per announcement, a table to prune, an RLS policy pair, and a write that
 * lands seconds after the indicator has already expired. `broadcast` sends it
 * over the socket only: no table, no write, no migration, nothing to clean up.
 *
 * WHY THE CHANNEL NAME IS NOT PREFIXED `private:`. Realtime authorises `private:`
 * channels against RLS on the table they are named after, and this feature has
 * no table. A public channel's `broadcast` events are still scoped to that
 * channel name alone, so `typing:<conversationId>` remains visible only to the
 * two people subscribed to that one conversation.
 *
 * WHY A WINDOW RATHER THAN A START/STOP PAIR. A stop event is lost whenever the
 * peer's tab dies, the radio drops, or the member switches apps mid-sentence —
 * and a stale "typing…" that never clears is far more confusing than one that
 * lingers for a moment. Each incoming event re-arms a timer instead, so the
 * indicator self-heals without depending on a delivery that may never arrive.
 */
export function useTypingChannel({
  conversationId,
  selfId,
  enabled = true,
}: UseTypingChannelOptions): UseTypingChannelReturn {
  const [peerTyping, setPeerTyping] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const windowTimerRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const selfIdRef = useRef(selfId);
  selfIdRef.current = selfId;

  /** Clear the visible indicator and disarm its timer. */
  const clearWindow = useCallback(() => {
    if (windowTimerRef.current !== null) {
      window.clearTimeout(windowTimerRef.current);
      windowTimerRef.current = null;
    }
    setPeerTyping(false);
  }, []);

  /**
   * Show the indicator and (re-)arm its expiry. Reading through a ref keeps this
   * out of the subscribe effect's dependency list, so an incoming event never
   * tears down and rebuilds the socket.
   */
  const armWindowRef = useRef<() => void>(() => undefined);
  armWindowRef.current = () => {
    if (windowTimerRef.current !== null) window.clearTimeout(windowTimerRef.current);
    setPeerTyping(true);
    windowTimerRef.current = window.setTimeout(() => {
      windowTimerRef.current = null;
      setPeerTyping(false);
    }, TYPING_WINDOW_MS);
  };

  const announceTyping = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (now - lastSentRef.current < SEND_THROTTLE_MS) return;
    lastSentRef.current = now;
    void channel
      .send({ type: "broadcast", event: "typing", payload: { userId: selfIdRef.current } })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!enabled || !conversationId) {
      clearWindow();
      return;
    }

    let alive = true;
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (!alive) return;
        /* `broadcast: { self: false }` already drops our own events; this second
           check covers a peer who somehow shares our id and is belt-and-braces
           against the config not being honoured. */
        const from = (payload as { payload?: { userId?: string } }).payload?.userId;
        if (from && from === selfIdRef.current) return;
        armWindowRef.current();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      alive = false;
      channelRef.current = null;
      clearWindow();
      void supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, clearWindow]);

  useEffect(() => clearWindow, [clearWindow]);

  return { peerTyping, announceTyping };
}
