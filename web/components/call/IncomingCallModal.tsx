"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneOff, Video, Volume2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * IncomingCallModal — incoming-call ring surface for the `calls` table.
 *
 * Subscribes to Supabase Realtime on `public.calls`, filtered server-side to
 * rows whose `receiver_id` equals the signed-in member. A row rings only while
 * `status` is `ringing`; `connected`/`ended` clears the overlay.
 *
 * On ring it plays looping `/sounds/ringtone.mp3` and fires the hardware
 * vibration [500, 200, 500, 200]. Accept navigates to the Agora room at
 * `/call/<channel_name>`; decline flips the row to `ended`. Midnight Slate
 * theme (slate-950 backdrop, emerald accept, rose decline).
 */

interface IncomingCallRow {
  id: string;
  caller_id: string;
  receiver_id: string;
  channel_name: string;
  status: string;
  mode?: string | null;
}

interface RingingCall {
  id: string;
  callerId: string;
  channelName: string;
  mode: "audio" | "video";
}

function modeOf(value: string | null | undefined): "audio" | "video" {
  return value === "audio" ? "audio" : "video";
}

export default function IncomingCallModal({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [ringing, setRinging] = useState<RingingCall | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  /** Stop the looping ringtone + cancel any active vibration. */
  const stopRinging = useCallback(() => {
    const audio = ringtoneRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      ringtoneRef.current = null;
    }
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(0);
    }
  }, []);

  /** Start the looping ringtone + the hardware vibration pattern. */
  const startRinging = useCallback(() => {
    try {
      const audio = new Audio("/sounds/ringtone.mp3");
      audio.loop = true;
      ringtoneRef.current = audio;
      void audio.play().catch((err) => {
        console.error("[IncomingCallModal] ringtone play failed:", err);
      });
    } catch (err) {
      console.error("[IncomingCallModal] could not create ringtone:", err);
    }

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([500, 200, 500, 200]);
    }
  }, []);

  // Realtime: INSERT rows for this receiver, plus UPDATEs so a row
  // cancelled/answered elsewhere clears this overlay.
  useEffect(() => {
    const channel = supabase
      .channel(`calls:incoming:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as IncomingCallRow;
          if (row.status !== "ringing") return;
          setRinging({
            id: row.id,
            callerId: row.caller_id,
            channelName: row.channel_name,
            mode: modeOf(row.mode),
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as IncomingCallRow;
          setRinging((current) => {
            if (current && current.id === row.id && row.status !== "ringing") {
              return null;
            }
            return current;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId]);

  // Drive the ringtone/vibration from the ringing state.
  useEffect(() => {
    if (ringing) {
      startRinging();
    } else {
      stopRinging();
    }
    return stopRinging;
  }, [ringing, startRinging, stopRinging]);

  // Escape declines, matching every other modal in the app.
  useEffect(() => {
    if (!ringing) return;
    const active = ringing;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") void handleDecline(active.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ringing]);

  async function handleAccept(call: RingingCall) {
    stopRinging();
    await supabase.from("calls").update({ status: "connected" }).eq("id", call.id);
    router.push(`/call/${encodeURIComponent(call.channelName)}`);
    setRinging(null);
  }

  async function handleDecline(callId: string) {
    stopRinging();
    setRinging(null);
    await supabase.from("calls").update({ status: "ended" }).eq("id", callId);
  }

  if (!ringing) return null;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Incoming ${ringing.mode} call`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 px-6 text-white backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Incoming {ringing.mode} call
        </p>

        <div className="relative flex h-32 w-32 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full bg-orange-500/25"
          />
          <span className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-600 text-white shadow-[0_0_30px_rgba(249,115,22,0.6)]">
            {ringing.mode === "video" ? (
              <Video className="h-12 w-12" aria-hidden="true" />
            ) : (
              <Volume2 className="h-12 w-12" aria-hidden="true" />
            )}
          </span>
        </div>

        <p className="text-sm text-slate-400">Couples Corner</p>

        <div className="mt-2 flex items-center gap-8">
          <button
            type="button"
            onClick={() => void handleDecline(ringing.id)}
            aria-label="Decline call"
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full bg-rose-600 text-white shadow-lg transition hover:scale-105 hover:bg-rose-500 active:scale-95"
          >
            <PhoneOff className="h-6 w-6" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Decline
            </span>
          </button>
          <button
            type="button"
            onClick={() => void handleAccept(ringing)}
            aria-label="Accept call"
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full bg-emerald-600 text-white shadow-lg transition hover:scale-105 hover:bg-emerald-500 active:scale-95"
          >
            <Phone className="h-6 w-6" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Accept
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
