// ChatHeader.tsx — slim messenger header: back button, avatar with live
// presence dot, name + Online/Offline status, 3-dot options menu.
// Pure UI; no data mutations of its own.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, PresenceDot } from "./Avatar";
import { CallOverlay, type CallMode } from "./CallOverlay";
import { usePresence } from "@/lib/hooks/usePresence";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

interface ChatHeaderProps {
  summary: ConversationParticipantSummary | null;
  conversationId: string;
  currentUserId: string;
  /**
   * Server-rendered presence seed, so the header paints the right state on
   * first frame instead of flashing "Offline" until the first poll returns.
   * The live hook takes over from there.
   */
  initialOnline?: boolean;
  /** Overrides the status line; otherwise derived from live presence. */
  statusText?: string;
}

export function ChatHeader({
  summary,
  conversationId,
  currentUserId,
  initialOnline = false,
  statusText,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [call, setCall] = useState<CallMode>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const otherId = summary?.id ?? null;
  const { presence } = usePresence(otherId ? [otherId] : [], Boolean(otherId));

  // Prefer the live hook's verdict. Before the first response lands there is no
  // entry for this member, so fall back to the server-rendered seed rather than
  // defaulting to "offline" and flashing the wrong state on every page load.
  const entry = otherId ? presence[otherId] : undefined;
  const isOnline = entry ? entry.online : initialOnline;

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
    // SAFE AREA + BASE PADDING (the fix for the header sitting flush against the
    // top edge / under the notch).
    //
    // The old value was `pt-[env(safe-area-inset-top)]`, which is the whole bug:
    // `env()` resolves to 0 on every device without a notch (desktop, most
    // Androids, and any browser not in fullscreen), so the bar lost ALL top
    // padding and butted straight up against the screen edge. Even on a notched
    // iPhone the inset alone is only ~44px of status bar with no breathing room
    // above the controls themselves.
    //
    // `max(0.75rem, env(safe-area-inset-top))` guarantees a 12px floor on every
    // device and grows to the full inset only where one exists. This mirrors the
    // `pb-[max(0.75rem,env(safe-area-inset-bottom))]` the MessageComposer already
    // uses for the home indicator, so the two bars of this view are symmetric.
    //
    // The global mobile back header is suppressed on this route (the chat owns
    // its own header), so this bar is directly under the notch and must apply
    // the inset itself. `shrink-0` on every child guarantees the row never
    // compresses or wraps.
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md sm:gap-3">
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
        <PresenceDot online={isOnline} size="md" />
      </span>

      {/* Name + status. "Offline" is spelled out rather than being left to an
          empty line or a dot alone, so the state is unambiguous in text. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-white">
          {name}
        </span>
        <span
          className={[
            "block truncate text-xs",
            isOnline ? "text-emerald-400" : "text-ink-400",
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
