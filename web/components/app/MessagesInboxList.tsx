"use client";

/**
 * The Messages inbox list: a search field plus the conversation rows.
 *
 * ── WHY THIS IS A CLIENT COMPONENT ──────────────────────────────────────────
 * The search has to filter the rows, and the rows are rendered from the server
 * component's data. Filtering therefore has to happen on the client, which means
 * the list cannot stay inside `MessagesPage`.
 *
 * A separate file rather than `"use client"` on the page, because `MessagesPage`
 * fetches the session, the conversations and the bot threads; making it a client
 * component would pull all of that into the browser bundle.
 *
 * The data crossing the boundary is plain and serialisable (ids, names, preview
 * strings, counts, timestamps), so nothing here forces a query to run twice.
 *
 * ── WHY THE SEARCH IS CLIENT-SIDE AND HONEST ABOUT IT ────────────────────────
 * The inbox is one server-rendered page with every conversation fetched up front,
 * so filtering locally is instant and adds no round trip. There is no
 * server-side message search in this product, and faking one with a hardcoded
 * result set would be the same fabricated-control problem as the admin notices.
 * This filters exactly what is on screen, and says so.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar, PresenceDot } from "@/components/app/Avatar";

export interface InboxChat {
  key: string;
  href: string;
  name: string;
  kind: "person" | "couple";
  avatarUrl: string | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  isOnline: boolean;
  isBot?: boolean;
}

export function MessagesInboxList({
  chats,
  emptyState,
}: {
  chats: InboxChat[];
  /** Rendered by the server page when there is nothing to list at all. */
  emptyState: React.ReactNode;
}) {
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  /* Name AND preview, so "scarlett" finds the thread and "coffee" finds the
     message. Matching on either alone makes the field feel broken on real data,
     where people are known by what they wrote as much as by who they are. */
  const visible = useMemo(
    () =>
      needle
        ? chats.filter(
            (c) =>
              c.name.toLowerCase().includes(needle) ||
              (c.preview ?? "").toLowerCase().includes(needle)
          )
        : chats,
    [chats, needle]
  );

  return (
    <>
      {/* A real filter over real data, not a decorative field. */}
      <div className="relative mb-3">
        <label htmlFor="inbox-search" className="sr-only">
          Search conversations
        </label>
        <input
          id="inbox-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          /* `appearance-none` strips the platform search affordances (the clear
             button on some engines, the inner shadow on iOS) so this reads as the
             app's own field rather than a raw browser control. */
          className="h-11 w-full appearance-none rounded-full border border-white/10 bg-surface pl-4 pr-10 text-sm text-white outline-none transition-colors placeholder:text-ink-400 focus:border-orange-400/50 [&::-webkit-search-cancel-button]:hidden"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
        </span>
      </div>

      {chats.length === 0 ? (
        emptyState
      ) : visible.length === 0 ? (
        /* A search with no hits gets its OWN message, distinct from "you have no
           conversations" — conflating the two makes a working inbox look broken. */
        <p className="rounded-2xl border border-white/10 bg-surface px-4 py-6 text-center text-sm text-ink-300">
          No conversations match “{query.trim()}”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((chat) => (
            <li key={chat.key}>
              <ChatRow chat={chat} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
function ChatRow({ chat }: { chat: InboxChat }) {
  const name = chat.name?.trim() || "Chat";
  const unread = Math.max(chat.unread ?? 0, 0);
  const at = chat.lastMessageAt ? formatChatTime(chat.lastMessageAt) : null;

  return (
    /* A raised card inset from the screen edge by the page's own `px-4`, so no
       row touches the bezel. `active:scale-[0.99]` gives a tap real feedback on
       touch, where there is no hover cursor to rely on. */
    <Link
      href={chat.href as never}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface p-3 transition active:scale-[0.99] hover:border-white/20 sm:gap-4"
    >
      <div className="relative shrink-0">
        {chat.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chat.avatarUrl} alt={name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <Avatar name={name} kind={chat.kind} size="md" className="bg-brand-500/15 text-brand-300" />
        )}
        {chat.isBot ? null : <PresenceDot online={chat.isOnline} size="md" />}
        {unread > 0 ? (
          <span
            aria-label={`${unread} unread ${unread === 1 ? "message" : "messages"}`}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-[#FF5722] px-1 text-[10px] font-bold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="truncate text-xs text-ink-300">{chat.preview?.trim() || "No messages yet"}</p>
      </div>

      {at ? (
        <span
          className={[
            "shrink-0 text-[11px]",
            unread > 0 ? "font-semibold text-brand-300" : "text-ink-400",
          ].join(" ")}
        >
          {at}
        </span>
      ) : null}
    </Link>
  );
}

/** Compact relative/absolute chat timestamp. */
function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}