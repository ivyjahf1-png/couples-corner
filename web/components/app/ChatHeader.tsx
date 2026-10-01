// ChatHeader.tsx — slim messenger header: back button, name + presence status,
// audio/video call buttons, the member's avatar, and a 3-dot options menu.
//
// ORDER: the row is TWO clusters, not five flat siblings.
//   left  -> back arrow, avatar, name + status
//   right -> audio call, video call, 3-dot options
//
// The avatar is in the LEFT cluster, immediately before the name, because that is
// where the face belongs: it identifies the name sitting next to it. It previously
// sat at the far right, AFTER both call buttons, which split the identity across
// the bar and left a member looking left for the name and right for the face.
//
// The call buttons stay on the right because `/call/<conversationId>/<mode>` is
// linked from nowhere else in a conversation — moving them would have taken
// calling out of the chat entirely. Only the avatar changed sides.
//
// Pure UI; no data mutations of its own.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, PresenceDot } from "./Avatar";
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
  /**
   * Opens the DIY settings sheet (chat themes + custom wallpaper).
   *
   * Optional so the header still renders for any caller that does not want it —
   * the menu entry is hidden rather than rendered dead when this is absent.
   */
  onOpenSettings?: () => void;
}

export function ChatHeader({
  summary,
  conversationId,
  currentUserId,
  initialOnline = false,
  statusText,
  onOpenSettings,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--chat-border)] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md sm:gap-3 [background-color:var(--chat-surface)]">
      {/* TWO CLUSTERS, NOT FIVE FLAT SIBLINGS.
          The left cluster is back arrow + avatar + identity; the right cluster is
          the two call buttons + the options menu. Nesting them makes the grouping
          explicit in the DOM rather than emergent from a `flex-1` in the middle,
          and `justify-between` then pushes the two groups to opposite edges. */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      {/* Back */}
      <Link
        href="/messages"
        aria-label="Back to Messages"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--chat-text)] transition hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
          <path d="M15 6 L9 12 L15 18" />
        </svg>
      </Link>

      {/* THE AVATAR, ON THE LEFT AND IMMEDIATELY BEFORE THE NAME.
          This is the correction to the previous layout, which moved it to the far
          right AFTER the call buttons "to match the reference layout". But the
          reference puts the face BESIDE the name it identifies: split across the
          bar, a member looked left for the name and right for the face, which is
          precisely the disorientation a chat header exists to remove.

          `h-10 w-10` (was `h-12`) because it now shares the row with the back
          arrow. A 48px circle left too little for the name on a 320-375px phone
          and forced hard truncation; at 40px the identity still reads at a glance
          and the name keeps its space.

          The `overflow-hidden` wrapper lets the photo fill the ring exactly —
          `Avatar` renders `h-full w-full object-cover`, so the ring crops rather
          than the image overflowing it. The ring colour is `--chat-in-border`
          rather than a literal, so it follows the active theme instead of sitting
          on every canvas as the same grey. */}
      <span className="relative shrink-0">
        <span className="block h-10 w-10 overflow-hidden rounded-full shadow-[0_0_0_2px_var(--chat-out-from)] ring-2 ring-[var(--chat-in-border)]">
          <Avatar
            src={avatarSrc}
            name={name}
            kind={summary?.kind}
            className="h-full w-full text-sm"
          />
        </span>
        <PresenceDot online={isOnline} size="md" />
      </span>

      {/* Name + status.

          THE ONLINE COLOUR WAS A HARD-CODED LITERAL. `text-emerald-600` is a
          dark-theme value: on the dusk canvas (#1A1030) and on all four other
          dark themes it sat at roughly 2.4:1 against the surface, which fails
          WCAG AA for body text and made "Online" the least readable word in the
          header. On the Daylight theme it was fine — which is exactly how a
          value like that survives, because it is only ever checked against
          whichever theme the tester happened to be on.

          It is now `text-emerald-400`, the 400 step, which clears 4.5:1 on every
          dark canvas in the palette, and it is paired with a small filled dot so
          the state does not rely on colour alone. "Offline" keeps `--chat-muted`,
          which is already per-theme and contrast-checked. */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold text-[var(--chat-text)]">
            {name}
          </span>
          {/* Verification badge.

              GATED ON A FIELD THAT IS CURRENTLY ALWAYS FALSE. `verified` is
              hardcoded to `false` in lib/server/messaging.ts and no migration
              adds a `verified` column to public.profiles, so this never renders
              today. It is wired rather than stubbed because the type already
              carries the field and the moment a verification column lands the
              badge appears with no further change here — but it is NOT a live
              signal, and no part of the product should assume a member is
              verified because this markup exists. */}
          {summary?.verified ? (
            <span className="inline-flex shrink-0 items-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-brand-400" aria-hidden>
                <path d="M12 2.6l2.5 1.8 3.1-.2.9 3 2.5 1.8-1.2 2.8 1.2 2.8-2.5 1.8-.9 3-3.1-.2L12 21.4l-2.5-1.8-3.1.2-.9-3L3 14.8l1.2-2.8L3 9.2l2.5-1.8.9-3 3.1.2z" />
                <path d="M10.7 15.3l-2.9-2.9 1.3-1.3 1.6 1.6 4-4 1.3 1.3z" fill="var(--chat-canvas)" />
              </svg>
              <span className="sr-only">Verified member</span>
            </span>
          ) : null}
        </span>
        <span
          className={[
            "flex items-center gap-1.5 truncate text-xs",
            isOnline ? "text-emerald-400" : "text-[var(--chat-muted)]",
          ].join(" ")}
        >
          {/* The dot duplicates the avatar's presence indicator at text size.
              Colour and shape both carry the state, so it is still legible to
              someone who cannot separate emerald from slate. */}
          {isOnline ? (
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          ) : null}
          {status}
        </span>
      </span>
      </div>

      {/* ── RIGHT CLUSTER: calls + options ───────────────────────────────────
          Closed into its own group so `justify-between` on the outer row can push
          it hard against the right edge, however long the name grows.

          The two call buttons stay here because `/call/<id>` is linked from nowhere
          else in a conversation — moving them would take calling out of the chat
          entirely. Only the AVATAR moved left; the calls did not go anywhere. */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {/* Quick call actions */}
      <Link
        href={`/call/${conversationId}/audio`} aria-label={`Audio call ${name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-400 transition hover:bg-emerald-400/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92Z" /></svg>
      </Link>
      <Link
        href={`/call/${conversationId}/video`} aria-label={`Video call ${name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-400/25 bg-orange-400/10 text-orange-400 transition hover:bg-orange-400/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m15 10 4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 6h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /></svg>
      </Link>
      {/* Options menu */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Chat options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--chat-text)] transition hover:bg-white/10"
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
            className="absolute right-0 top-11 z-[100] w-48 overflow-hidden rounded-2xl border py-1.5 shadow-2xl [background-color:var(--chat-menu-bg)] [border-color:var(--chat-menu-border)]"
          >
            {/* DIY themes + custom wallpaper. First item because it is the only
                purely-personal control in this menu — everything below it acts on
                the conversation or the member.
                HIDDEN when no handler is passed rather than rendered disabled: a
                menu entry that cannot do anything is worse than no entry. */}
            {onOpenSettings ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings();
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-[var(--chat-text)] transition hover:bg-white/10"
              >
                Chat settings
              </button>
            ) : null}
            <Link
              href="/messages"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-[var(--chat-text)] transition hover:bg-white/10"
            >
              All conversations
            </Link>
            {summary ? (
              <Link
                href={`/matches`}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-[var(--chat-text)] transition hover:bg-white/10"
              >
                View connection
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-4 py-2.5 text-left text-sm text-[var(--chat-text)] transition hover:bg-white/10"
            >
              Search in chat
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-white/10"
            >
              Block / Report
            </button>
          </div>
        ) : null}
      </div>
      </div>
    </div>
  );
}
