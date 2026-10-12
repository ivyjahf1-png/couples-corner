'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

interface CallPayload {
  from: string;
  to: string;
  type: 'video' | 'audio';
}

export default function IncomingCallModal({ currentUserId }: { currentUserId: string }) {
  const [incomingCall, setIncomingCall] = useState<CallPayload | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Listen for incoming calls via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`calls:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `to=eq.${currentUserId}`,
        },
        (payload) => {
          setIncomingCall(payload.new as CallPayload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Play ringtone and vibrate when a call arrives
  useEffect(() => {
    if (!incomingCall) return;

    // Play ringtone
    const ringtone = new Audio('/sounds/ringtone.mp3');
    ringtone.loop = true;
    ringtoneRef.current = ringtone;
    ringtone.play().catch((err) => console.error('Ringtone play failed:', err));

    // Vibrate pattern
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200]);
    }

    // Cleanup on unmount / call ends
    return () => {
      ringtone.pause();
      ringtoneRef.current = null;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(0);
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-80 rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-3xl">
          📞
        </div>
        <h2 className="text-lg font-semibold">Incoming call</h2>
        <p className="mt-1 text-sm text-gray-500">
          {incomingCall.type === 'video' ? 'Video' : 'Audio'} call from {incomingCall.from}
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => setIncomingCall(null)}
            className="rounded-full bg-red-500 px-6 py-2 text-white"
          >
            Decline
          </button>
          <button
            onClick={() => setIncomingCall(null)}
            className="rounded-full bg-green-500 px-6 py-2 text-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
