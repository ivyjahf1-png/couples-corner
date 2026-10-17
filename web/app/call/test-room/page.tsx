"use client";
/**
 * /call/test-room — the Agora RTC engine test bench.
 *
 * Loads the VideoCall engine through `next/dynamic` with `ssr: false`: the
 * agora-rtc-sdk-ng bundle touches browser-only APIs (WebRTC, getUserMedia,
 * AudioContext), so it must never be evaluated during server rendering. The
 * channel is fixed to "test-room" — open this route in two browsers/devices
 * signed into the same deployment and both land in the same RTC channel.
 *
 * Token flow: VideoCall first asks POST /api/agora-token (requires a session
 * and AGORA_APP_CERTIFICATE); without either it falls back to an App-ID-only
 * join using NEXT_PUBLIC_AGORA_APP_ID, which works on Agora projects with
 * Testing Mode enabled.
 */
import dynamic from "next/dynamic";

const VideoCall = dynamic(
  () => import("@/components/call/VideoCall").then((m) => m.VideoCall),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-400">
        Loading call engine…
      </div>
    ),
  },
);

export default function TestRoomPage() {
  return <VideoCall channel="test-room" />;
}