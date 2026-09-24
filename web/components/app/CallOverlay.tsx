"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

export type CallMode = "audio" | "video" | null;

export function CallOverlay({ mode, summary, onClose }: { mode: CallMode; summary: ConversationParticipantSummary | null; onClose: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  useEffect(() => { if (!mode) return; const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [mode]);
  if (!mode) return null;
  const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  return <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={`${mode} call`}>
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-xs uppercase tracking-widest text-purple-300">{mode} call</p><h2 className="font-semibold text-white">{summary?.name ?? "Chat"}</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-sm tabular-nums text-white/80">{time}</span></div>
    <div className="relative flex flex-1 items-center justify-center"><div className="absolute h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" /><div className="flex h-40 w-40 items-center justify-center rounded-full border border-purple-300/30 bg-gradient-to-br from-purple-500/30 to-amber-300/20 shadow-2xl"><Avatar src={summary?.avatarUrl ?? summary?.photos?.[0]?.publicUrl ?? null} name={summary?.name ?? "Chat"} kind={summary?.kind} className="h-28 w-28 text-3xl" /></div><div className="absolute bottom-6 right-5 h-28 w-20 overflow-hidden rounded-2xl border-2 border-white/30 bg-slate-800"><div className="flex h-full items-center justify-center text-3xl">🪞</div><span className="absolute bottom-1 left-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px]">You</span></div></div>
    <div className="flex items-center justify-center gap-4 border-t border-white/10 px-5 py-6"><button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Unmute" : "Mute"} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">{muted ? "🔇" : "🎙️"}</button>{mode === "video" ? <button type="button" onClick={() => setCamera((value) => !value)} aria-label="Toggle camera" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">{camera ? "📹" : "🚫"}</button> : null}<button type="button" onClick={onClose} aria-label="End call" className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-500 text-xl text-white">⌕</button></div>
  </div>;
}
