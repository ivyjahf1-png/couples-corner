// ChatHeader.tsx — slim messenger header: back button, avatar with online
// dot, name + status, 3-dot options menu. Pure UI; no data mutations.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { CallOverlay, type CallMode } from "./CallOverlay";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

interface ChatHeaderProps {
  summary: ConversationParticipantSummary | null;
  conversationId: string;
  currentUserId: string;
  isOnline?: boolean;
  statusText?: string;
}

export function ChatHeader({
  summary,
  conversationId,
  currentUserId,
  isOnline = true,
  statusText,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [call, setCall] = useState<CallMode>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const name = summary?.name ?? "Chat";
  const avatarSrc = summary?.avatarUrl ?? summary?.photos?.[0]?.publicUrl ?? null;
  const status = statusText ?? (isOnline ? "Online" : "Offline");

  return (
    <div className="flex items-center gap-3 border-b border-white/10 bg-slate-950/90 px-3 py-2.5 backdrop-blur-md sm:px-4">
      {/* Back */}
      <Link
        href="/messages"
        aria-label="Back to Messages"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
          <path d="M15 6 L9 12 L15 18" />
        </svg>
      </Link>

      {/* Avatar with online dot */}
      <span className="relative shrink-0">
        <span className="block h-11 w-11 overflow-hidden rounded-full ring-2 ring-white/10">
          <Avatar
            src={avatarSrc}
            name={name}
            kind={summary?.kind}
            className="h-full w-full text-sm"
          />
        </span>
        <span
          aria-hidden
          className={[
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-slate-950",
            isOnline ? "bg-green-500" : "bg-white/25",
          ].join(" ")}
        />
      </span>

      {/* Name + status */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-white">
          {name}
        </span>
        <span
          className={[
            "block truncate text-xs",
            isOnline ? "text-green-400" : "text-ink-400",
          ].join(" ")}
        >
          {status}
        </span>
      </span>

      {/* Quick call actions */}
      <button type="button" onClick={() => setCall("audio")} aria-label={`Audio call ${name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 transition hover:bg-emerald-400/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92Z" /></svg>
      </button>
      <button type="button" onClick={() => setCall("video")} aria-label={`Video call ${name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-400/30 bg-purple-400/10 text-purple-200 transition hover:bg-purple-400/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m15 10 4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 6h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /></svg>
      </button>
      {/* Options menu */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Chat options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
        {menuOpen ? (
          <div
            role="menu"
            aria-label="Chat options"
            className="absolute right-0 top-11 z-[100] w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] py-1.5 shadow-2xl shadow-black/50"
          >
            <Link
              href="/messages"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
            >
              All conversations
            </Link>
            {summary ? (
              <Link
                href={`/matches`}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
              >
                View connection
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/10"
            >
              Search in chat
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-4 py-2.5 text-left text-sm text-red-300 transition hover:bg-white/10"
            >
              Block / Report
            </button>
          </div>
        ) : null}
      </div>
      {call ? <CallOverlay mode={call} summary={summary} conversationId={conversationId} currentUserId={currentUserId} onClose={() => setCall(null)} /> : null}
    </div>
  );
}
