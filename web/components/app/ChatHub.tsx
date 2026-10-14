"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Mail,
  SlidersHorizontal,
  Search,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/app/Avatar";
import type { InboxChat } from "@/components/app/MessagesInbox";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Localized timestamp (MM-DD HH:MM) in the reader's timezone. */
function formatStamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF5722]";

/** A round, translucent icon button used by the header and row overflow menus. */
function IconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-200 transition hover:bg-white/10 hover:text-white ${FOCUS}`}
    >
      {children}
    </button>
  );
}

/** Hide the native scrollbar so the horizontal rails read as designed, not default. */
const RAIL =
  "flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/* ------------------------------------------------------------------ */
/* 2. Top stories row                                                   */
/* ------------------------------------------------------------------ */

function StoriesRow({ chats }: { chats: InboxChat[] }) {
  return (
    <div className="px-4 pt-3">
      <div className={RAIL}>
        {chats.map((chat) => (
          <Link
            key={`story-${chat.key}`}
            href={chat.href}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full p-[2px] transition ${
                chat.isOnline
                  ? "bg-gradient-to-tr from-[#FF5722] via-[#FF8A3D] to-[#FFB067] shadow-[0_0_12px_-1px_rgba(255,87,34,0.75)]"
                  : "bg-white/10"
              }`}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[#0B1120]">
                <Avatar
                  name={chat.name}
                  src={chat.avatarUrl}
                  kind={chat.kind}
                  size="lg"
                  className="h-full w-full text-xs"
                />
              </span>
            </span>
            <span className="w-full truncate text-center text-[11px] text-ink-200">
              {chat.name.split(" ")[0]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Best Matches — featured, horizontally swipeable cards            */
/* ------------------------------------------------------------------ */

/**
 * A curated strip drawn from the same conversation data.
 *
 * The reference calls this "Best Matches": a handful of people the member is
 * most likely to open first. There is no separate ranking column in the inbox
 * schema, so this reuses the real list — pinned threads first, then online
 * ones — rather than inventing a fake "top matches" table. Every card is a
 * real thread link, so tapping one always lands somewhere that exists.
 */
function BestMatchesSection({ chats }: { chats: InboxChat[] }) {
  const featured = useMemo(() => {
    const pinned = chats.filter((c) => c.isPinned);
    const online = chats.filter((c) => c.isOnline && !c.isPinned);
    const rest = chats.filter((c) => !c.isPinned && !c.isOnline);
    return [...pinned, ...online, ...rest].slice(0, 6);
  }, [chats]);

  if (featured.length === 0) return null;

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-white">Best Matches</h2>
        <span className="text-xs font-medium text-ink-300">{featured.length} people</span>
      </div>
      <div className={`${RAIL} mt-3 px-4`}>
        {featured.map((chat) => (
          <Link
            key={`match-${chat.key}`}
            href={chat.href}
            className="group relative w-36 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-[#FF5722]/50 hover:bg-white/[0.07]"
          >
            {/* Soft orange bloom behind the avatar, so each card reads as a
                highlight rather than a plain tile. */}
            <span
              aria-hidden
              className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#FF5722]/20 blur-2xl transition group-hover:bg-[#FF5722]/30"
            />
            <div className="flex flex-col items-center gap-2">
              <span className="relative flex h-16 w-16 items-center justify-center">
                <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-[#FF5722] bg-[#0B1120] p-[2px]">
                  <Avatar
                    name={chat.name}
                    src={chat.avatarUrl}
                    kind={chat.kind}
                    size="lg"
                    className="h-full w-full text-xs"
                  />
                </span>
                {chat.isOnline ? (
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-[#0B1120]" />
                ) : null}
              </span>
              <span className="w-full truncate text-center text-sm font-semibold text-white">
                {chat.name}
              </span>
              {/* Action badges. "Match" always shows; "Secret" appears when the
                  thread is unread, so an unread featured card shows both. */}
              <span className="flex items-center gap-1.5">
                <span className="rounded-full bg-[#FF5722] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Match
                </span>
                {chat.unread > 0 ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Secret
                  </span>
                ) : null}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Segmented Chat / Activity tab switcher                           */
/* ------------------------------------------------------------------ */

function TabSwitcher({
  tab,
  onChange,
}: {
  tab: "chat" | "activity";
  onChange: (next: "chat" | "activity") => void;
}) {
  const base =
    "flex-1 rounded-full py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722]";
  return (
    <div className="mx-4 mt-4 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
      <button
        type="button"
        aria-pressed={tab === "chat"}
        onClick={() => onChange("chat")}
        className={`${base} ${
          tab === "chat" ? "bg-[#FF5722] text-white shadow-sm shadow-orange-500/30" : "text-ink-200 hover:text-white"
        }`}
      >
        Chat
      </button>
      <button
        type="button"
        aria-pressed={tab === "activity"}
        onClick={() => onChange("activity")}
        className={`${base} ${
          tab === "activity" ? "bg-[#FF5722] text-white shadow-sm shadow-orange-500/30" : "text-ink-200 hover:text-white"
        }`}
      >
        Activity
      </button>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* 5. Swipeable conversation row                                        */
/* ------------------------------------------------------------------ */

/** How far left the row must travel before the delete action snaps open. */
const REVEAL_THRESHOLD = -60;
/** The resting offset of an opened row, in px. */
const REVEAL_OPEN = -88;

/**
 * One conversation row with a real swipe-to-reveal-delete gesture.
 *
 * The previous stub shifted by `-(x - 300)` and always reset, so nothing ever
 * revealed. This tracks the touch delta, clamps it to `[REVEAL_OPEN, 0]` so
 * the row can never be dragged off-screen or past its button, and snaps open
 * past the threshold. A delete button sits behind the row and is only
 * reachable while it is open — a stray tap on a closed row can never delete.
 */
function ConversationRow({
  chat,
  onDelete,
}: {
  chat: InboxChat;
  onDelete: (key: string) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [startX, setStartX] = useState(0);

  const opened = dragX <= REVEAL_THRESHOLD;

  function onTouchStart(e: React.TouchEvent) {
    setStartX(e.touches[0]?.clientX ?? 0);
  }

  function onTouchMove(e: React.TouchEvent) {
    const x = e.touches[0]?.clientX ?? 0;
    const dx = x - startX;
    setStartX(x);
    // Only allow leftward drag; clamp within the reveal band.
    setDragX((prev) => Math.min(0, Math.max(REVEAL_OPEN, prev + dx)));
  }

  function onTouchEnd() {
    setDragX(opened ? REVEAL_OPEN : 0);
  }

  const badge = chat.unread > 0 ? "New Text" : "Start Chat";

  return (
    <li className="relative overflow-hidden">
      {/* DELETE ACTION — behind the row, revealed by the swipe. */}
      <div className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-danger-500/90">
        <button
          type="button"
          onClick={() => onDelete(chat.key)}
          aria-label={`Delete conversation with ${chat.name}`}
          className="flex h-full w-full flex-col items-center justify-center gap-1 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Delete</span>
        </button>
      </div>

      {/* THE ROW — slides over the action. */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${dragX}px)` }}
        className="relative flex items-center gap-3 border-b border-white/[0.06] bg-[#0B1120] px-4 py-3 transition-transform duration-200"
      >
        <Link href={chat.href} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <Avatar name={chat.name} src={chat.avatarUrl} kind={chat.kind} size="lg" />
            {chat.isOnline ? (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0B1120]" />
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold text-white">{chat.name}</span>
              <span className="shrink-0 text-[11px] text-ink-300">
                {formatStamp(chat.lastMessageAt) ?? ""}
              </span>
            </span>
            <span className="mt-0.5 flex items-center justify-between gap-2">
              <span className="truncate text-xs text-ink-300">{chat.preview}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  chat.unread > 0
                    ? "bg-[#FF5722] text-white"
                    : "border border-white/15 bg-white/5 text-ink-200"
                }`}
              >
                {badge}
              </span>
            </span>
          </span>
        </Link>
        <IconButton label="More options">
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      </div>
    </li>
  );
}


/* ------------------------------------------------------------------ */
/* 6. The Messages screen                                               */
/* ------------------------------------------------------------------ */

/**
 * THE MESSAGES HUB.
 *
 * A Server Component feeds it `chats` (see `app/chat/page.tsx`). This renders
 * five bands from that one list: the fixed header, the stories rail, the Best
 * Matches rail, the Chat/Activity switcher, and the swipeable conversation
 * list. It fetches nothing itself and owns only ephemeral UI state (active
 * tab, deleted-row keys). The bottom navigation lives in the app shell and is
 * deliberately not rendered here — a second bar would double it.
 */
export function ChatHub({ chats, displayName }: { chats: InboxChat[]; displayName?: string }) {
  /* The route passes the caller's email, but the hub title is the fixed word
     "Message" (never the personal address), so it is deliberately unused here. */
  void displayName;

  const [tab, setTab] = useState<"chat" | "activity">("chat");
  const [deleted, setDeleted] = useState<string[]>([]);

  const visible = useMemo(
    () => chats.filter((c) => !deleted.includes(c.key)),
    [chats, deleted]
  );

  function onDelete(key: string) {
    setDeleted((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 1. HEADER — "Message" title + Filter/Search on the right. */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          <Mail className="h-5 w-5 text-orange-300" aria-hidden />
          Message
        </h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton label="Filter conversations">
            <SlidersHorizontal className="h-4 w-4" />
          </IconButton>
          <IconButton label="Search messages">
            <Search className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      {/* The scroll region owns everything below the header.
          `pb-28` (7rem) clears the FIXED bottom dock so the last conversation
          rows are never stranded behind it; the region stays
          `flex-1 min-h-0 overflow-y-auto` so vertical scrolling is never locked
          on any device height. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
        {/* 2. STORIES */}
        <StoriesRow chats={visible} />

        {/* 3. BEST MATCHES */}
        <BestMatchesSection chats={visible} />

        {/* 4. TAB SWITCHER */}
        <TabSwitcher tab={tab} onChange={setTab} />

        {/* 5. CHAT / ACTIVITY BODY */}
        {tab === "chat" ? (
          visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-300">
              No conversations yet.
            </p>
          ) : (
            <ul className="mt-3">
              {visible.map((chat) => (
                <ConversationRow key={chat.key} chat={chat} onDelete={onDelete} />
              ))}
            </ul>
          )
        ) : (
          <div className="mt-3 px-4 py-10 text-center">
            <p className="text-sm text-ink-300">No new activity right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}

