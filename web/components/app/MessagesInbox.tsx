// MessagesInbox.tsx — the whole /messages surface below the shell chrome.
//
// ── WHY ONE CLIENT COMPONENT AND NOT FOUR ────────────────────────────────────
// The header's filter pills, the search field and the conversation list are three
// pieces of ONE control surface: picking "Chats" narrows the list, and typing in
// the field narrows it again. Splitting them across components would mean lifting
// the two filters into a shared parent anyway, so they live together here and the
// page stays a thin Server Component that only fetches.
//
// The data crossing the boundary is plain and serialisable (ids, names, preview
// strings, counts, timestamps, booleans), so this forces no query to run twice.
//
// ── WHY THE SEARCH IS CLIENT-SIDE AND HONEST ABOUT IT ────────────────────────
// Every conversation is fetched up front, so filtering locally is instant and
// costs no round trip. There is no server-side message search in this product,
// and faking one with a hardcoded result set would be a control that looks live
// and does nothing. This filters exactly what is on screen.
//
// ── WHY THE TABS ARE All / Chats / CALLS ─────────────────────────────────────
// There are no group conversations in this product — the `conversations` table
// holds only `direct` and `couple` rows — so a "Groups" tab would be a tab that
// can never select anything. It is deliberately absent rather than disabled.
//
// "Calls" filters to the people who are ONLINE right now, because a call can only
// be placed to someone who can answer it. There is no call-history table in the
// product, so showing a "recent calls" list would mean inventing one.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageLock } from "@/components/app/PageHeader";
import { Avatar, PresenceDot } from "@/components/app/Avatar";
import { Icon } from "@/components/landing/Icon";
import { MicIcon, VideoIcon } from "@/components/app/RealtimeIcons";

export interface InboxChat {
  key: string;
  href: string;
  /** Call route base (`/call/<id>`), or null for rows that cannot be dialled. */
  callHrefBase: string | null;
  name: string;
  kind: "person" | "couple";
  avatarUrl: string | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  isOnline: boolean;
  isBot?: boolean;
}

type InboxTab = "all" | "chats" | "calls";

const TABS: { id: InboxTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "chats", label: "Chats" },
  { id: "calls", label: "Calls" },
];

export function MessagesInbox({
  chats,
  emptyState,
}: {
  chats: InboxChat[];
  emptyState: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<InboxTab>("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const needle = query.trim().toLowerCase();

  const visible = useMemo(() => {
    /* Tab first, then the free-text needle — both are filters over the same
       array, and ANDing them is what a member expects from two controls. */
    const byTab = tab === "calls" ? chats.filter((c) => c.isOnline) : chats;

    if (!needle) return byTab;
    /* Name AND preview, so "scarlett" finds the thread and "coffee" finds the
       message. Matching on either alone makes the field feel broken on real
       data, where people are known by what they wrote as much as by who they
       are. */
    return byTab.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.preview ?? "").toLowerCase().includes(needle)
    );
  }, [chats, needle, tab]);

  const totalUnread = chats.reduce((sum, c) => sum + Math.max(c.unread ?? 0, 0), 0);
  const onlineCount = chats.filter((c) => c.isOnline).length;

  /* The most recent conversation that can actually be dialled. The quick-action
     call buttons need a peer to call, and the newest thread is the one a member
     starting a call almost always means. Null when there is none — the buttons
     then render inert rather than linking to a call with no participant. */
  const callable = useMemo(
    () => chats.find((c) => c.callHrefBase && !c.isBot) ?? null,
    [chats]
  );

  return (
    <PageLock
      className="mx-auto w-full max-w-3xl bg-[#0F0A1C] text-white"
      /* `pb-28` clears the fixed 5rem tab bar plus the compose FAB, which
         overlaps the list's last rows. `md:pb-8` drops it where that bar is
         `md:hidden` and the sidebar rail takes over. */
      bodyClassName="px-4 pb-28 sm:px-6 md:pb-8"
      head={<InboxHeader
        tab={tab}
        onTab={setTab}
        totalUnread={totalUnread}
        onlineCount={onlineCount}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />}
    >
      {/* ── SEARCH ──────────────────────────────────────────────────────────
          `appearance-none` strips the platform search affordances (the clear
          button on some engines, the inner shadow on iOS) so this reads as the
          app's own field rather than a raw browser control. */}
      <div className="relative mb-3 mt-4">
        <label htmlFor="inbox-search" className="sr-only">
          Search messages and people
        </label>
        <input
          id="inbox-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages, people..."
          className="h-11 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/70 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-ink-400 focus:border-orange-400/50 [&::-webkit-search-cancel-button]:hidden"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
        >
          <Icon name="search" className="h-4 w-4" />
        </span>
      </div>

      {/* ── QUICK ACTIONS ──────────────────────────────────────────────────
          Four equal tiles, icon over caption. The caption is the visible label
          AND, via the link text, the accessible name — so each tile reads
          without hovering.

          Every tile is a REAL destination. There is no "Create Group" tile: the
          product has no group conversations, so such a button could only ever
          lead nowhere. The fourth tile is the Game Center, which exists.

          The two call tiles render INERT — not as dead links — when there is no
          conversation to call, because `/call/<id>/<mode>` requires a real
          conversation id and inventing one produces a 404 on tap. */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <QuickAction href="/discover" label="New Chat" tone="orange">
          <Icon name="chat" className="h-5 w-5" />
        </QuickAction>

        <QuickAction
          {...(callable ? { href: `${callable.callHrefBase}/video` } : { disabled: true })}
          label="Video Call"
          tone="sky"
          disabledTitle="Start a chat first to place a video call"
        >
          <VideoIcon className="h-5 w-5" />
        </QuickAction>

        <QuickAction
          {...(callable ? { href: `${callable.callHrefBase}/audio` } : { disabled: true })}
          label="Voice Call"
          tone="emerald"
          disabledTitle="Start a chat first to place a voice call"
        >
          <MicIcon className="h-5 w-5" />
        </QuickAction>

        <QuickAction href="/games" label="Game Center" tone="violet">
          <Icon name="sparkle" className="h-5 w-5" />
        </QuickAction>
      </div>

      {/* ── PINNED SYSTEM NOTICES, AS A CAROUSEL ────────────────────────────
          ONE card position, cycling through the notices. They sat stacked
          before, which put two full cards between the header and the first
          real conversation — on a phone that is the whole first screen, and
          the member has to scroll past two warnings to read a single "hi".

          The carousel holds the section to exactly one card's height no matter
          how many notices there are, so the conversation list always starts in
          the same place. Add a third notice and the screen does not grow.

          STATIC COPY, DELIBERATELY. Neither notice makes a claim about any
          member and neither carries a number that could be wrong about a real
          person — they are pointers to the team's own surfaces. Wiring them to
          an "admin backend control" would mean inventing an announcements table
          and an admin write path; until that exists these are honest static
          product copy rather than a control that looks live and does nothing. */}
      <NoticeCarousel />

      {chats.length === 0 ? (
        emptyState
      ) : visible.length === 0 ? (
        /* A search with no hits gets its OWN message, distinct from "you have no
           conversations" — conflating the two makes a working inbox look broken. */
        <p className="rounded-2xl border border-white/10 bg-surface px-4 py-6 text-center text-sm text-ink-300">
          {needle
            ? `No conversations match “${query.trim()}”.`
            : "Nobody is online right now. Start a chat to reach someone."}
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
    </PageLock>
  );
}

function InboxHeader({
  tab,
  onTab,
  totalUnread,
  onlineCount,
  menuOpen,
  setMenuOpen,
}: {
  tab: InboxTab;
  onTab: (t: InboxTab) => void;
  totalUnread: number;
  onlineCount: number;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
}) {
  return (
    <header className="px-4 pt-1 sm:px-6">
      {/* Title row. `min-w-0` + `truncate` so the title ellipsizes rather than
          pushing the two icon buttons off the right edge. */}
      <div className="flex items-center gap-2">
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight text-white">
          Messages
        </h1>

        {/* Icon buttons, not a text menu: the header row is one line tall and
            two text labels would wrap on a small phone. */}
        <Link
          href="/discover"
          aria-label="Find people to message"
          title="Find people"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-200 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="search" className="h-5 w-5" />


        </Link>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Messages options"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="Options"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-200 transition hover:bg-white/10 hover:text-white"
          >
            {/* Three dots drawn inline: the shared `Icon` set has no overflow
                glyph, and this is the only place that needs one. */}
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
              <circle cx="5" cy="12" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="19" cy="12" r="1.75" />
            </svg>
          </button>

          {menuOpen ? (
            <>
              {/* Scrim: dismisses the menu on an outside tap. A menu with no
                  dismiss path is a menu that traps the member on the page. */}
              <button
                type="button"
                aria-label="Close options"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 h-full w-full cursor-default"
              />
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#1A1130] py-1 shadow-2xl"
              >
                <MenuLink href="/notifications" onPick={() => setMenuOpen(false)}>
                  Alerts
                </MenuLink>
                <MenuLink href="/settings" onPick={() => setMenuOpen(false)}>
                  Privacy &amp; settings
                </MenuLink>
                <MenuLink href="/feedback" onPick={() => setMenuOpen(false)}>
                  Report a problem
                </MenuLink>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Subheader. The privacy claim used to be a third competing line under
          the title; it is one quiet line now, and the pinned safety warning
          below does the real work. */}
      <p className="mt-0.5 text-sm text-ink-300">
        Stay connected with your matches. Your chats are private.
      </p>

      {/* Filter pills. A full-width segmented track is NOT used here — the brief
          specifies discrete pills, and three short pills read as three
          destinations rather than as one control with three settings. */}
      <div role="tablist" aria-label="Filter messages" className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label }) => {
          const selected = tab === id;
          /* "All" carries no badge: its count would be the sum of the other two
             and would just be noise next to them. */
          const badge = id === "calls" ? onlineCount : id === "chats" ? totalUnread : 0;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTab(id)}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                selected
                  ? "border-orange-400/50 bg-orange-500/15 text-orange-200"
                  : "border-white/10 bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {label}
              {badge > 0 ? (
                <span
                  className={[
                    "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    selected ? "bg-orange-400/25 text-orange-100" : "bg-white/10 text-ink-200",
                  ].join(" ")}
                >
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </header>
  );

}
const TONES = {
  orange: "bg-orange-500/15 text-orange-300 border-orange-400/30",
  sky: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-400/30",
} as const;

function QuickAction({
  href,
  disabled,
  label,
  tone,
  disabledTitle,
  children,
}: {
  href?: string;
  disabled?: boolean;
  label: string;
  tone: keyof typeof TONES;
  /** Why the tile is inert — surfaced as a tooltip, not silently dimmed. */
  disabledTitle?: string;
  children: React.ReactNode;
}) {
  const shell = [
    "flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition",
    disabled
      ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-ink-500"
      : `${TONES[tone]} hover:brightness-125 active:scale-[0.97]`,
  ].join(" ");

  const caption = [
    "w-full truncate text-center text-[11px] font-semibold",
    disabled ? "text-ink-500" : "text-ink-200",
  ].join(" ");

  if (disabled || !href) {
    return (
      /* `aria-disabled` on a span rather than `disabled` on a <button>: a
         genuinely disabled control is skipped by assistive tech with no
         explanation. This stays in the tree and announces why it is inert. */
      <span role="button" aria-disabled="true" title={disabledTitle} className={shell}>
        {children}
        <span className={caption}>{label}</span>
      </span>
    );
  }

  return (
    <Link href={href} className={shell} title={label}>
      {children}
      <span className={caption}>{label}</span>
    </Link>
  );

}

/** The pinned notices, in cycle order. */
const NOTICES = [
  {
    id: "scam",
    icon: "shield" as const,
    title: "Scam Warning",
    body: "Never send money, gift cards or codes to anyone. We will never ask you for them.",
    tone: "amber" as const,
  },
  {
    id: "team",
    icon: "crown" as const,
    title: "Official Team",
    body: "Real messages from the team carry this badge. Report anyone claiming to be staff without it.",
    tone: "orange" as const,
  },
];

/** How long each notice is held before the carousel advances. */
const NOTICE_INTERVAL = 5200;

/**
 * One card position, auto-advancing through the pinned notices.
 *
 * WHY A CAROUSEL AND NOT A STACK. Stacked, the two notices occupied the entire
 * first screen on a phone and the member had to scroll past both to read a
 * single "hi". One position holds the section to a fixed height however many
 * notices exist, so the conversation list always begins in the same place.
 *
 * WHY THE ADVANCE IS PAUSABLE. A ticker that keeps moving while you are reading
 * it is worse than a static card: the text leaves while the eye is on it. The
 * timer resets on any pointer or keyboard interaction and while the document is
 * hidden, so a notice stays put exactly when it is being read and only advances
 * when it is being ignored.
 *
 * The dots are real buttons, not decoration. They are the only way to reach a
 * specific notice on demand, and they are what makes an auto-advancing region
 * usable with a keyboard or a screen reader rather than something to sit and
 * wait out.
 *
 * `aria-live="polite"` announces the new notice without interrupting: a member
 * using a screen reader hears the change when they are between utterances,
 * rather than the ticker cutting across whatever they were reading.
 */
function NoticeCarousel() {
  const count = NOTICES.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  /* Reset the countdown on every interaction. `paused` is a dependency so that
     releasing the pointer restarts a full interval rather than resuming a
     nearly-expired one and snapping away immediately. */
  useEffect(() => {
    if (paused || count < 2) return;
    const timer = window.setTimeout(() => go(index + 1), NOTICE_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [index, paused, count, go]);

  /* A backgrounded tab is not being read, but the timer still runs and the
     member returns to a notice they never saw the start of. */
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (count === 0) return null;

  return (
    <div
      className="mb-3"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* ONE height for every slide.

          All slides occupy the SAME grid cell and the container is sized by the
          tallest of them, so the section never changes height as it advances and
          the conversation list below never moves under the member's thumb. Add
          a third notice and the screen does not grow.

          `aria-live="polite"` sits on the container so the change is announced
          without interrupting. */}
      <div className="grid [&>*]:col-start-1 [&>*]:row-start-1" aria-live="polite">
        {NOTICES.map((notice, i) => (
          /* The hidden slides stay in the DOM, laid out in the same cell, so
             the opacity transition has something to cross-fade between. They
             are `aria-hidden` and `pointer-events-none`, so they are neither
             announced nor tappable while hidden. `invisible` is deliberately
             NOT used: it would remove them from the layout box as well and
             make the container collapse to the visible slide's height, which
             is the reflow this is built to avoid. */
          <div
            key={notice.id}
            className={[
              "transition-opacity duration-500 motion-reduce:transition-none",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
            aria-hidden={i !== index}
          >
            <PinnedNotice
              icon={<Icon name={notice.icon} className="h-5 w-5" />}
              title={notice.title}
              body={notice.body}
              tone={notice.tone}
            />
          </div>
        ))}
      </div>

      {count > 1 ? (
        <div className="mt-1.5 flex justify-center gap-1.5" role="tablist" aria-label="Pinned notices">
          {NOTICES.map((notice, i) => (
            <button
              key={notice.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show notice: ${notice.title}`}
              onClick={() => go(i)}
              className={[
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-5 bg-orange-400/80" : "w-1.5 bg-white/25 hover:bg-white/40",
              ].join(" ")}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PinnedNotice({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "amber" | "orange";
}) {
  return (
    /* A `<section>`, not an `<li>`: the carousel stacks these in a grid cell
       inside a plain `<div>`, and an `<li>` with no list parent is invalid
       markup that assistive tech announces as an orphan. */
    <section
      aria-label={title}
      className={[
        "flex items-start gap-3 rounded-2xl border p-3.5",
        tone === "amber"
          ? "border-amber-400/30 bg-amber-500/10"
          : "border-orange-400/30 bg-orange-500/10",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          tone === "amber"
            ? "bg-amber-500/20 text-amber-300"
            : "bg-orange-500/20 text-orange-300",
        ].join(" ")}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        {/* `line-clamp-2` on the body so a long warning cannot push the real
            conversations further down the phone than necessary. */}
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          {title}
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-200">
            Pinned
          </span>
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-ink-200">{body}</p>
      </div>
    </section>
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
        {/* Bots are never "online" — they have no presence row, so a dot on them
            would be a status the product cannot actually resolve. */}
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

      {/* Timestamp hard right, OUTSIDE the truncating middle column, so it never
          gets ellipsized by a long preview. */}
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
function MenuLink({
  href,
  onPick,
  children,
}: {
  href: string;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onPick}
      className="block px-4 py-2.5 text-sm text-ink-200 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}