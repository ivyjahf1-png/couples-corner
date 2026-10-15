"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Star,
  Heart,
  MessageCircle,
  Clock,
  Flame,
  Users,
  ChevronRight,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Avatar, PresenceDot } from "@/components/app/Avatar";
import { StoryAvatar } from "@/components/story/StoryAvatar";

/**
 * MessagesInbox — the private inbox, rebuilt to the reference layout.
 *
 * LAYOUT (top → bottom), on the existing dark theme + orange accent:
 *   A. App Bar ............ "Chat" title, Filter/Sort + Search actions.
 *   B. Stories row ......... horizontally scrollable circular avatars + names.
 *   C. Best Matches ....... horizontally scrollable large profile cards.
 *   D. Segmented tabs ..... Chat | Activity (swappable, orange active state).
 *   E. Main list .......... vertically scrollable conversation list.
 *
 * CRITICAL SCROLLING CONTRACT: the route page wraps this in a
 * `flex h-full min-h-0 flex-col overflow-hidden` box. The root here is a flex
 * column filling that height; the header / stories / matches / tabs are
 * fixed-height sections and the LIST is the only `flex-1 min-h-0 overflow-y-auto`
 * region. No fixed heights and no NeverScrollableScrollPhysics box it out — that
 * is exactly what made the old page unscrollable.
 */

export interface InboxChat {
  key: string;
  href: string;
  name: string;
  /** "person" for members, "couple" for the two-dot duo mark. */
  kind: "person" | "couple";
  avatarUrl: string | null;
  /** The other participant's uid — lets the avatar open a profile in place. */
  userId?: string | null;
  age?: number | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  isOnline: boolean;
  isBot?: boolean;
  isPinned?: boolean;
}

type TabKey = "chat" | "activity";
type SortMode = "recent" | "online";

/** Border hues cycled across the stories row so each ring reads distinctly. */
const STORY_RINGS = [
  "ring-brand-500",
  "ring-rose-500",
  "ring-sky-500",
  "ring-emerald-500",
  "ring-purple-500",
  "ring-amber-500",
];

/**
 * Best Matches is a showcase rail, not a real data source (no matches endpoint
 * is wired to this screen yet). It prefers REAL avatars from the inbox where
 * they exist and pads the rail with curated demo cards so the section always
 * renders at full width like the reference. Cards degrade to a gradient +
 * initials when there is no photo — nothing asserts a person that isn't there.
 */
const DEMO_MATCHES = [
  { id: "bm-1", name: "Sofia", tagline: "92% match", grad: "from-rose-500 to-purple-600" },
  { id: "bm-2", name: "Liam", tagline: "89% match", grad: "from-sky-500 to-indigo-600" },
  { id: "bm-3", name: "Amara", tagline: "87% match", grad: "from-amber-500 to-pink-600" },
  { id: "bm-4", name: "Noah", tagline: "85% match", grad: "from-emerald-500 to-teal-600" },
];

/** Browser-local time so the hour is correct for the viewer, not the server. */
function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Two-letter initials with a safe fallback so the disc is never blank. */
function initialsOf(name: string): string {
  const parts = name.split(/\s&+/).filter(Boolean).slice(0, 2);
  return (parts.map((w) => w[0] ?? "").join("") || "?").toUpperCase();
}

export function MessagesInbox({
  chats,
  visitors,
  expiredCount,
  userId,
}: {
  chats: InboxChat[];
  visitors: number;
  expiredCount: number;
  /** The signed-in member's uid — drives the "Your Story" upload path + RLS. */
  userId?: string;
}) {
  const [tab, setTab] = useState<TabKey>("chat");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");

  const stories = useMemo(() => chats.slice(0, 12), [chats]);

  // Best-matches rail: real avatars first (up to 3), then demo padding.
  const bestMatches = useMemo(() => {
    const real = chats
      .filter((c) => c.avatarUrl)
      .slice(0, 3)
      .map((c) => ({
        id: c.key,
        name: c.name,
        tagline: "Top match",
        grad: "from-brand-500 to-purple-600",
        avatarUrl: c.avatarUrl as string,
        userId: c.userId ?? null,
        href: c.href,
      }));
    const demo = DEMO_MATCHES.map((m) => ({
      ...m,
      avatarUrl: null as string | null,
      userId: null as string | null,
      href: "/discover",
    }));
    return [...real, ...demo];
  }, [chats]);

  const visibleChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? chats.filter(
          (c) => c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
        )
      : chats.slice();
    if (sortMode === "online") {
      filtered.sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
    }
    return filtered;
  }, [chats, query, sortMode]);

  const totalUnread = useMemo(
    () => chats.reduce((n, c) => n + (c.unread || 0), 0),
    [chats],
  );

  const activityItems = useMemo(
    () => [
      { id: "visitors", icon: Users, label: "Profile visitors", value: `${visitors} today`, tone: "text-sky-400" },
      { id: "likes", icon: Heart, label: "New likes", value: "Tap to view", tone: "text-rose-400" },
      { id: "matches", icon: Flame, label: "New matches", value: `${bestMatches.length} waiting`, tone: "text-brand-400" },
      { id: "expired", icon: Clock, label: "Expired messages", value: expiredCount > 0 ? `${expiredCount} to review` : "All caught up", tone: "text-ink-400" },
    ],
    [visitors, expiredCount, bestMatches.length],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── A. APP BAR ─────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-white/10 bg-slate-950/40 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold text-white">Chat</h1>
            {totalUnread > 0 ? (
              <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-semibold text-white">
                {totalUnread}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Filter and sort"
              onClick={() => setSortMode((s) => (s === "recent" ? "online" : "recent"))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-200 transition hover:bg-white/10 hover:text-white"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                setShowSearch((v) => !v);
                if (showSearch) setQuery("");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-200 transition hover:bg-white/10 hover:text-white"
            >
              {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {showSearch ? (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Search className="h-4 w-4 text-ink-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations"
                className="w-full bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none"
              />
            </div>
          </div>
        ) : null}
      </header>

      {/* Fixed-height header region: stories + best matches + tabs. */}
      <div className="shrink-0">
        {/* ── B. STORIES / RECENT CONTACTS ─────────────────────────── */}
        <section className="pt-3">
          <div className="flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Your Story — dashed "+"/active ring + upload + shared viewer */}
            <StoryAvatar userId={userId} />

            {stories.map((c, i) => (
              <div className="relative flex w-16 shrink-0 flex-col items-center gap-1.5">
                <span className="absolute -bottom-10 right-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-brand-500 text-white shadow-lg transition hover:bg-brand-600">
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-500 text-white">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                </span>
                <span className="relative">
                  <span className={`block rounded-full ring-2 ${STORY_RINGS[i % STORY_RINGS.length]}`}>
                    <Avatar name={c.name} src={c.avatarUrl} kind={c.kind} size="lg" />
                  </span>
                  <PresenceDot online={c.isOnline} size="sm" />
                </span>
                <span className="relative w-full truncate text-center text-xs text-ink-200">
                  {c.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── C. BEST MATCHES ──────────────────────────────────────── */}
        <section className="pt-1">
          <div className="flex items-center justify-between px-4 pb-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <Star className="h-4 w-4 text-brand-400" />
              Best Matches
            </h2>
            <Link
              href="/discover"
              className="flex items-center gap-0.5 text-xs font-medium text-brand-400 hover:text-brand-300"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {bestMatches.map((m) => (
              <div
                key={m.id}
                className="relative h-44 w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-lg"
              >
                {m.avatarUrl ? (
                  <img
                    src={m.avatarUrl}
                    alt={m.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${m.grad}`}
                  >
                    <span className="text-4xl font-bold text-white/90">{initialsOf(m.name)}</span>
                  </div>
                )}
                {/* bottom scrim so name + buttons stay legible over the photo */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 pt-8">
                  <p className="truncate text-sm font-semibold text-white">{m.name}</p>
                  <p className="truncate text-[11px] text-brand-300">{m.tagline}</p>
                  <div className="mt-2 flex gap-1.5">
                    <Link
                      href={m.userId ? `/profile/${m.userId}` : m.href}
                      className="flex flex-1 items-center justify-center rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-white/25"
                    >
                      View
                    </Link>
                    <Link
                      href={m.href}
                      className="flex flex-1 items-center justify-center rounded-lg bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-600"
                    >
                      Match
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── D. SEGMENTED TABS (Chat | Activity) ──────────────────── */}
        <div className="px-4 pb-2">
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            {(["chat", "activity"] as TabKey[]).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-current={active ? "true" : undefined}
                  className={[
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold capitalize transition",
                    active
                      ? "bg-brand-500 text-white shadow"
                      : "text-ink-300 hover:text-white",
                  ].join(" ")}
                >
                  {t === "chat" ? <MessageCircle className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── E. MAIN LIST (the ONLY vertical scroll region) ─────────── */}
      {/* `pb-28` (7rem) clears the FIXED bottom dock (BottomNav.tsx: 74px pill
          lifted `bottom-4` + its safe-area inset). `/messages` is a full-bleed
          surface, so <main> applies `p-0` and does NOT add the shell's `pb-20`
          compensation — the scroll region has to reserve the bar itself, or the
          last conversation rows sit unreachable behind it. The region stays
          `flex-1 min-h-0 overflow-y-auto` so vertical scrolling is never locked,
          and the extra bottom padding only adds reachable space, never clips. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-28 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
        {tab === "chat" ? (
          visibleChats.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <MessageCircle className="h-10 w-10 text-ink-600" />
              <p className="text-sm font-medium text-ink-200">
                {query ? "No conversations match your search." : "No conversations yet."}
              </p>
              <p className="text-xs text-ink-500">Start matching to fill your inbox.</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {visibleChats.map((c) => (
                <li key={c.key}>
                  <Link
                    href={c.href}
                    className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-white/5"
                  >
                    <span className="relative shrink-0">
                      <Avatar name={c.name} src={c.avatarUrl} kind={c.kind} size="lg" />
                      <PresenceDot online={c.isOnline} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-white">{c.name}</span>
                        {c.isPinned ? (
                          <Star className="h-3.5 w-3.5 shrink-0 text-brand-400" aria-label="Pinned" />
                        ) : null}
                        {c.age != null ? (
                          <span className="shrink-0 text-xs text-ink-400">{c.age}</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={[
                            "truncate text-sm",
                            c.unread > 0 ? "font-medium text-ink-100" : "text-ink-400",
                          ].join(" ")}
                        >
                          {c.preview}
                        </span>
                        {c.unread > 0 ? (
                          <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                            {c.unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[11px] text-ink-500">{formatTime(c.lastMessageAt)}</span>
                      {c.isOnline ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Online
                        </span>
                      ) : c.unread > 0 ? (
                        <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
                          New
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="flex flex-col gap-2 pt-1">
            {activityItems.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:bg-white/10"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                      <Icon className={`h-5 w-5 ${a.tone}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{a.label}</span>
                      <span className="block truncate text-xs text-ink-400">{a.value}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-500" />
                  </button>
                </li>
              );
            })}
            {activityItems.length === 0 ? (
              <li className="flex h-40 flex-col items-center justify-center gap-1 text-center">
                <Flame className="h-8 w-8 text-ink-600" />
                <p className="text-sm text-ink-300">No activity yet.</p>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </div>
  );
}
