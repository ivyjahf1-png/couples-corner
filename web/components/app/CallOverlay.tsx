"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

import { Avatar } from "./Avatar";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

type Signal = { sender: string; target: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
const config: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };
export function useCallMedia(mode: "audio" | "video" | null, conversationId: string, userId: string, peerId: string | undefined) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  const [status, setStatus] = useState("Requesting camera and microphone…");
  const stop = useCallback(() => { peerRef.current?.close(); peerRef.current = null; streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; if (channelRef.current) void getSupabaseClient().removeChannel(channelRef.current); channelRef.current = null; }, []);
  useEffect(() => {
    if (!mode || !peerId) { if (mode && !peerId) setStatus("Participant unavailable"); return; }
    let live = true;
    const channel = getSupabaseClient().channel(`call:${conversationId}`, { config: { broadcast: { self: false } } });
    const peer = new RTCPeerConnection(config); channelRef.current = channel; peerRef.current = peer;
    const send = (payload: Signal) => void channel.send({ type: "broadcast", event: "signal", payload });
    peer.ontrack = (event) => { if (remoteRef.current && event.streams[0]) remoteRef.current.srcObject = event.streams[0]; };
    peer.onicecandidate = (event) => { if (event.candidate) send({ sender: userId, target: peerId, candidate: event.candidate.toJSON() }); };
    peer.onconnectionstatechange = () => { if (peer.connectionState === "connected") setStatus("Connected"); else if (["failed", "disconnected"].includes(peer.connectionState)) setStatus("Call disconnected"); };
    channel.on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
      if (!live || payload.target !== userId || payload.sender === userId) return;
      try { if (payload.description) { await peer.setRemoteDescription(payload.description); if (payload.description.type === "offer") { const answer = await peer.createAnswer(); await peer.setLocalDescription(answer); send({ sender: userId, target: payload.sender, description: answer }); } } if (payload.candidate) await peer.addIceCandidate(payload.candidate); } catch { setStatus("Unable to connect the call"); }
    });
    void channel.subscribe(async (channelStatus) => {
      if (channelStatus !== "SUBSCRIBED" || !live) return;
      try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false }); if (!live) { stream.getTracks().forEach((t) => t.stop()); return; } streamRef.current = stream; if (localRef.current) { localRef.current.srcObject = stream; await localRef.current.play().catch(() => undefined); } stream.getTracks().forEach((track) => peer.addTrack(track, stream)); setStatus(userId < peerId ? "Calling…" : "Waiting for an answer…"); if (userId < peerId) { const offer = await peer.createOffer(); await peer.setLocalDescription(offer); send({ sender: userId, target: peerId, description: offer }); } } catch { setStatus("Camera or microphone permission denied"); }
    });
    return () => { live = false; stop(); };
  }, [conversationId, mode, peerId, stop, userId]);
  const toggleMic = () => { const value = !muted; streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !value; }); setMuted(value); };
  const toggleCamera = () => { const value = !camera; streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = value; }); setCamera(value); };
  return { localRef, remoteRef, muted, camera, status, toggleMic, toggleCamera, stop };
}

export type CallMode = "audio" | "video" | null;

export function CallOverlay({ mode, summary, conversationId, currentUserId, onClose }: { mode: CallMode; summary: ConversationParticipantSummary | null; conversationId: string; currentUserId: string; onClose: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const call = useCallMedia(mode, conversationId, currentUserId, summary?.id);
  useEffect(() => { if (!mode) return; const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [mode]);
  if (!mode) return null;
  const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const end = () => { call.stop(); onClose(); };
  return <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={`${mode} call`}>
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6"><div><p className="text-xs uppercase tracking-widest text-purple-300">{mode} call · {call.status}</p><h2 className="font-semibold text-white">{summary?.name ?? "Chat"}</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-sm tabular-nums text-white/80">{time}</span></div>
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6"><video ref={call.remoteRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" /><div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-purple-300/30 bg-gradient-to-br from-purple-500/30 to-amber-300/20 shadow-2xl"><Avatar src={summary?.avatarUrl ?? summary?.photos?.[0]?.publicUrl ?? null} name={summary?.name ?? "Chat"} kind={summary?.kind} className="h-28 w-28 text-3xl" /></div><div className="absolute bottom-5 right-4 h-32 w-24 overflow-hidden rounded-2xl border-2 border-white/30 bg-slate-800 shadow-2xl sm:bottom-8 sm:right-8 sm:h-40 sm:w-28"><video ref={call.localRef} muted autoPlay playsInline className="h-full w-full scale-x-[-1] object-cover" /><span className="absolute bottom-1 left-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-white">You</span></div></div>
    <div className="flex shrink-0 items-center justify-center gap-4 border-t border-white/10 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:gap-6"><button type="button" onClick={call.toggleMic} aria-label={call.muted ? "Unmute microphone" : "Mute microphone"} className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${call.muted ? "bg-danger-500" : "bg-white/10"}`}>{call.muted ? "🔇" : "🎙️"}</button>{mode === "video" ? <button type="button" onClick={call.toggleCamera} aria-label={call.camera ? "Turn camera off" : "Turn camera on"} className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${call.camera ? "bg-white/10" : "bg-danger-500"}`}>{call.camera ? "📹" : "🚫"}</button> : null}<button type="button" onClick={end} aria-label="End call" className="flex h-14 w-20 items-center justify-center rounded-full bg-danger-500 text-xl text-white shadow-lg shadow-danger-500/30">✕</button></div>
  </div>;
}
