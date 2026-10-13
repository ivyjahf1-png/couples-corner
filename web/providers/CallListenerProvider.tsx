/**
 * CallListenerProvider — the GLOBAL incoming-call listener.
 *
 * WHY THIS EXISTS AT THE ROOT. The ring subscription used to live inside
 * `VideoCallModal`, which means it only existed for as long as that modal was
 * mounted — i.e. only after the member had already opened a conversation and
 * pressed the call button. A call placed from anywhere else in the app (the
 * feed, a profile, the inbox, a background tab) arrived with nothing listening,
 * so the phone never rang. Mounting the listener in the root layout keeps it
 * subscribed for the entire time the member is signed in, on every route.
 *
 * ── THREE DELIVERY PATHS, ON PURPOSE ─────────────────────────────────────────
 *  1. Supabase Realtime: an `INSERT` on `public.active_calls` filtered to
 *     `receiver_id = <this user>` (the filter runs server-side, so the socket
 *     only ever carries rows meant for this device).
 *  2. A 3s direct poll of `active_calls` (the FAST FALLBACK). Realtime is the
 *     first thing an ad-blocker, VPN, or flaky mobile radio drops, and a
 *     dropped INSERT is SILENT — no error, no retry, just a call that never
 *     rings. This is the instant-ring safety net: it reads the newest ringing
 *     row straight from the table so the receiver's phone still rings within a
 *     few seconds even when the socket is dead. RLS bounds the read to this
 *     member's own rows, and `receiver_id` is indexed so it is cheap.
 *  3. A 12s poll of `getIncomingCallsAction()` that also re-seeds the seen-set
 *     on (re)connect so a call already handled elsewhere is never re-rung.
 *
 *  All paths funnel into `present()`, which de-duplicates by call id, so a
 *  call that arrives on two or three of them never rings twice.
 *
 * AUTH: the listener is keyed to the Supabase auth session rather than to a
 * server-rendered prop, so it re-subscribes on sign-in and sign-out without any
 * prop threading. It renders nothing at all until a call actually rings.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneOff, Phone, Video, Volume2, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  acceptActiveCallAction,
  declineActiveCallAction,
  getCallerNameAction,
  getIncomingCallsAction,
} from "@/lib/actions/calls";
import { notifyIncomingCall } from "@/lib/utils/notify";

/** Seconds a call may ring before it is treated as missed and cleared. */
const RING_TIMEOUT_MS = 45_000;
/** Poll cadence for the realtime fallback. */
const POLL_INTERVAL_MS = 12_000;
/** Fast direct-read poll cadence — the instant-ring safety net (see below). */
const FAST_POLL_INTERVAL_MS = 3_000;

interface RingingCall {
  id: string;
  callerId: string;
  callerName: string;
  mode: "audio" | "video";
  channelName: string;
}

interface RawCallRow {
  id?: string;
  caller_id?: string;
  receiver_id?: string;
  channel_name?: string;
  status?: string;
  mode?: string;
}

function modeOf(value: string | null | undefined): "audio" | "video" {
  return value === "audio" ? "audio" : "video";
}

/** Realtime ringtone — a looping two-tone oscillator. No audio asset needed. */
function useRingtone() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      void ctxRef.current?.close();
    } catch {
      /* Already closed — ringing is over either way. */
    }
    ctxRef.current = null;
  }, []);

  const start = useCallback(() => {
    try {
      stop();
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const playRing = () => {
        if (!ctxRef.current) return;
        const now = ctx.currentTime;
        // Two short tones per cycle — the classic "ring-ring" cadence.
        [0, 0.35].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 480;
          gain.gain.setValueAtTime(0.0001, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.28);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.3);
        });
      };
      playRing();
      timerRef.current = window.setInterval(playRing, 2600);
    } catch {
      /* Audio blocked by autoplay policy — the visual ring still shows. */
    }
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { start, stop };
}

export function CallListenerProvider() {
  const router = useRouter();
  const { start: startRingtone, stop: stopRingtone } = useRingtone();

  const [ringing, setRinging] = useState<RingingCall | null>(null);
  const [status, setStatus] = useState<"idle" | "accepting" | "declining">("idle");
  /* The signed-in member's id, mirrored from the auth listener below so the
     3s fast-poll effect can key off it without threading a server prop. */
  const [userId, setUserId] = useState<string | null>(null);

  /* Refs, not state: the realtime callback and the poll both read these on
     every event and must not tear down the subscription to see a fresh value. */
  const seenRef = useRef<Set<string>>(new Set());
  const ringingIdRef = useRef<string | null>(null);

  /** Open the ringing popup for a call id, exactly once. */
  const present = useCallback(
    async (row: RawCallRow) => {
      const id = row.id;
      if (!id) return;
      if (seenRef.current.has(id)) return;
      seenRef.current.add(id);
      /* A call already on screen wins — a second INSERT does not replace it. */
      if (ringingIdRef.current) return;

      const callerId = row.caller_id ?? "";
      const mode = modeOf(row.mode);
      const channelName = row.channel_name ?? "";
      ringingIdRef.current = id;

      const callerName = callerId
        ? await getCallerNameAction({ callerId }).catch(() => "Someone")
        : "Someone";

      setRinging({ id, callerId, callerName, mode, channelName });
      setStatus("idle");
      startRingtone();

      /* Background tab: a system notification is the only surface the member
         can see, so raise one alongside the in-page popup. Harmless no-op when
         permission was never granted or the tab is focused. */
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        void notifyIncomingCall({
          conversationId: channelName,
          callerName,
          mode,
        }).catch(() => undefined);
      }
    },
    [startRingtone],
  );

  /** Dismiss without changing the call — used on unmount and on errors. */
  const dismiss = useCallback(() => {
    stopRingtone();
    ringingIdRef.current = null;
    setRinging(null);
    setStatus("idle");
  }, [stopRingtone]);

  /**
   * SUBSCRIBE. Keyed on the auth session so signing in or out re-runs it; the
   * `receiver_id` filter is applied server-side by Supabase, so the socket
   * only ever receives rows addressed to this member.
   */
  useEffect(() => {
    const supabase = getSupabaseClient();
    let alive = true;
    let channel: { unsubscribe: () => Promise<unknown> } | null = null;
    let pollTimer: number | null = null;

    async function listenFor(userId: string) {
      /* Seed the seen-set with anything already ringing so a reconnect does not
         re-ring a call the member already handled on another device. */
      try {
        const existing = await getIncomingCallsAction();
        for (const call of existing) seenRef.current.add(call.id);
      } catch {
        /* Poll unavailable — realtime alone still works. */
      }

      try {
        const ch = supabase
          .channel(`incoming-calls:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "active_calls",
              filter: `receiver_id=eq.${userId}`,
            },
            (payload) => {
              if (!alive) return;
              const row = (payload as { new?: RawCallRow }).new;
              /* Only a genuinely ringing row is an incoming call. A row that
                 arrives already connected/ended was answered elsewhere. */
              if (!row || row.status !== "ringing") return;
              void present(row);
            },
          )
          .subscribe();
        channel = ch as unknown as { unsubscribe: () => Promise<unknown> };
      } catch {
        /* Realtime unavailable — the poll below covers delivery. */
      }

      pollTimer = window.setInterval(() => {
        /* Hidden tabs do no polling work: a backgrounded page neither needs an
           instant ring nor should burn radio/data re-reading a table whose
           realtime channel will deliver the row on return to foreground. */
        if (!alive || document.visibilityState !== "visible") return;
        void getIncomingCallsAction()
          .then((calls) => {
            if (!alive) return;
            for (const call of calls) {
              void present({
                id: call.id,
                caller_id: call.callerId,
                receiver_id: call.receiverId,
                channel_name: call.channelName,
                status: call.status,
                mode: call.mode,
              });
            }
          })
          .catch(() => undefined);
      }, POLL_INTERVAL_MS);
    }

    async function boot() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (alive && uid) {
        setUserId(uid);
        await listenFor(uid);
      }
    }

    void boot();

    /* Re-subscribe on sign-in / sign-out so the listener follows the session
       without any prop threading from a server component. */
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === "SIGNED_OUT") {
        seenRef.current.clear();
        ringingIdRef.current = null;
        setRinging(null);
        setUserId(null);
        if (channel) void channel.unsubscribe().catch(() => undefined);
        channel = null;
        if (pollTimer !== null) window.clearInterval(pollTimer);
        pollTimer = null;
        return;
      }
      const uid = session?.user?.id;
      if (event === "SIGNED_IN" && uid) {
        setUserId(uid);
        void listenFor(uid);
      }
    });

    return () => {
      alive = false;
      stopRingtone();
      sub.subscription.unsubscribe();
      if (channel) void channel.unsubscribe().catch(() => undefined);
      if (pollTimer !== null) window.clearInterval(pollTimer);
    };
  }, [present, stopRingtone]);

  // ── FAST POLL FALLBACK (3s) ─────────────────────────────────────────────────
  // Realtime is the FIRST thing an ad-blocker / VPN / flaky radio drops, and a
  // dropped INSERT is SILENT — no error, no retry, just a phone that never
  // rings. This is the safety net: a 3s setInterval that reads `active_calls`
  // directly and surfaces the newest ringing row. RLS
  // (`active_calls_select_receiver` = `auth.uid() = receiver_id`) bounds the
  // read to this member's own rows server-side, so the client query is correct
  // and cheap (receiver_id is indexed).
  //
  // The row is funneled through `present()` — NOT `setIncomingCall` — because
  // `present()` resolves the caller's display name, fires the browser
  // notification, de-dups by `presentedId`/`ringingIdRef` (so a call already
  // surfaced by realtime never rings twice), and schedules the 45s ring-timeout.
  // Deps are `[userId, present]` (stable across renders) and
  // deliberately EXCLUDE `ringing`: keying on it would tear down and
  // rebuild the interval on every ring/dismiss. De-dup lives in `present()`.
  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabaseClient();
    let alive = true;
    const checkForCalls = async () => {
      /* Skip the network read while hidden — same rationale as the seed poll
         above; realtime redelivers anything missed on refocus. */
      if (!alive || document.visibilityState !== "visible") return;
      try {
        const { data, error } = await supabase
          .from("active_calls")
          .select("id, caller_id, receiver_id, channel_name, status, mode")
          .eq("receiver_id", userId)
          .eq("status", "ringing")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!alive || error || !data) return;
        await present(data as RawCallRow);
      } catch {
        /* Poll failures are never fatal — the next tick retries. */
      }
    };

    void checkForCalls();
    const interval = window.setInterval(() => void checkForCalls(), FAST_POLL_INTERVAL_MS);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [userId, present]);

  /** Auto-miss: a call nobody answers stops ringing after the timeout. */
  useEffect(() => {
    if (!ringing) return;
    const timer = window.setTimeout(() => {
      const id = ringingIdRef.current;
      ringingIdRef.current = null;
      setRinging(null);
      setStatus("idle");
      stopRingtone();
      if (id) void declineActiveCallAction({ callId: id }).catch(() => undefined);
    }, RING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [ringing, stopRingtone]);

  async function handleAccept() {
    if (!ringing) return;
    setStatus("accepting");
    stopRingtone();
    const result = await acceptActiveCallAction({ callId: ringing.id }).catch(() => null);
    if (!result?.ok) {
      /* Answered on the other device, or already gone — drop the popup. */
      dismiss();
      return;
    }
    const target = `/call/${encodeURIComponent(ringing.channelName)}`;
    ringingIdRef.current = null;
    setRinging(null);
    setStatus("idle");
    router.push(target);
  }

  async function handleDecline() {
    if (!ringing) return;
    const id = ringing.id;
    setStatus("declining");
    stopRingtone();
    ringingIdRef.current = null;
    setRinging(null);
    setStatus("idle");
    await declineActiveCallAction({ callId: id }).catch(() => undefined);
  }

  /* Escape declines, matching every other modal in the app. */
  useEffect(() => {
    if (!ringing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") void handleDecline();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringing]);

  if (!ringing) return null;

  const busy = status !== "idle";
  const initial = (ringing.callerName.trim()[0] ?? "?").toUpperCase();

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Incoming ${ringing.mode} call from ${ringing.callerName}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 px-6 text-white backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Incoming {ringing.mode} call
        </p>

        <div className="relative flex h-32 w-32 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full bg-emerald-500/25"
          />
          <span className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-4xl font-bold">
            {initial}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold">{ringing.callerName}</p>
          <p className="flex items-center justify-center gap-2 text-sm text-slate-400">
            {ringing.mode === "video" ? (
              <Video className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
            Couples Corner
          </p>
        </div>

        <div className="mt-4 flex items-center gap-8">
          <button
            type="button"
            onClick={handleDecline}
            disabled={busy}
            aria-label="Decline call"
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full bg-rose-600 text-white shadow-lg transition hover:scale-105 hover:bg-rose-500 disabled:opacity-60 active:scale-95"
          >
            <PhoneOff className="h-6 w-6" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Decline</span>
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={busy}
            aria-label="Accept call"
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full bg-emerald-600 text-white shadow-lg transition hover:scale-105 hover:bg-emerald-500 disabled:opacity-60 active:scale-95"
          >
            <Phone className="h-6 w-6" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {status === "accepting" ? "…" : "Accept"}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleDecline}
          className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Ignore for now
        </button>
      </div>
    </div>
  );
}
