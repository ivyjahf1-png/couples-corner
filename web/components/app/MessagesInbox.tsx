// MessagesInbox.tsx - the entire /messages surface.
//
// ONE CLIENT COMPONENT, NOT FOUR.
// The header's filter pills, the search field and the conversation list are
// three pieces of ONE control surface: picking "Chats" narrows the list and
// typing in the field narrows it again. Splitting them would mean lifting both
// filters into a shared parent anyway, so they live together and the page stays
// a thin Server Component that only fetches. Everything crossing that boundary
// is plain serialisable data, so no query is forced to run twice.
//
// THE THEME.
// Midnight slate (bg-slate-950) with the brand orange reserved for interactive
// and status elements: the selected pill, the unread badge, the docked header's
// hairline, the scam warning. Orange is an ACCENT here, never a surface - orange
// cards turn a list of people into a list of alerts, and the one genuine warning
// on the screen stops standing out against its own neighbours.
//
// THE STICKY HEADER.
// The header lives INSIDE PageLock's body, which is the route's single
// overflow-y-auto region, so `sticky top-0` is what docks it. A docked bar
// showing a 2rem title would permanently eat a third of a phone viewport, so the
// bar cross-fades to a compact state the moment the large title scrolls out.
// That transition is driven by an IntersectionObserver on a zero-height sentinel
// placed ABOVE the header and rooted at the scroll container - discovered from
// the DOM rather than assumed to be `window`, because on this route `document`
// does not scroll. A scrollTop threshold cannot know how tall the header is.
//
// NO BACKGROUND LAYER. This component renders no absolutely-positioned image,
// banner or graphic layer of any kind. PageLock is the root element, so there is
// no positioned ancestor inside this page for such a layer to anchor to.
"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { displayNameFromEmail, isLikelyEmailAddress } from "@/lib/utils/display-name";
import { PageLock } from "@/components/app/PageHeader";
import { Avatar, PresenceDot } from "@/components/app/Avatar";
import { Icon } from "@/components/landing/Icon";
import { MicIcon, VideoIcon } from "@/components/app/RealtimeIcons";
import { purgeLegacyChatWallpaper } from "@/lib/hooks/useChatWallpaper";

export interface InboxChat {
  key: string;
  href: string;
  /** Call route base (/call/<id>), or null for rows that cannot be dialled. */
  callHrefBase: string | null;
  name: string;
  kind: "person" | "couple";
  avatarUrl: string | null;
  /** Null when the member has not shared a date of birth; the card omits it. */
  age: number | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  isOnline: boolean;
  /** Pinned above the recency list. Bot personas can never be pinned. */
  isPinned?: boolean;
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [docked, setDocked] = useState(false);

  /* THE INBOX HAS NO WALLPAPER, AND THIS ENFORDS IT ON EVERY LOAD.

     An older build stored a per-device chat background under
     `couples_corner:chat-wallpaper` and, when that key was present, painted a
     photo behind this list - which is exactly the wrong thing to do on a screen
     whose whole job is showing faces and message previews. This component
     renders no image layer at all, so the only way a stale key could still
     matter is via something else reading it later; clearing it on mount retires
     the key for good rather than leaving it to be rediscovered.

     The opaque backgrounds below are what actually protect the rows. This effect
     is housekeeping: it stops the value coming back, it does not stop a
     rendering fault. Both, deliberately. */
  useEffect(() => {
    purgeLegacyChatWallpaper();
  }, []);

  /* THE DOCKING TRIGGER. A zero-height sentinel above the header: while it is
     inside the scroll container the large title is on screen and the bar stays
     tall; the moment it leaves, the bar condenses. */
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const scroller = sentinel.closest(".page-lock__body");

    const observer = new IntersectionObserver(
      ([entry]) => setDocked(!entry.isIntersecting),
      {
        root: scroller,
        /* Fire only once the sentinel is genuinely gone, not as its last pixel
           clips the edge - otherwise the bar flickers while the title is still
           readable. */
        threshold: 0,
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  /* THE MAGNIFIER AND THE FILTERS BUTTON OPEN THE SAME PANEL.

     There is deliberately ONE search input on this screen. Two fields bound to
     `query` would render two elements with id="inbox-search", and a duplicate id
     breaks the label association for both. One input, two ways to reach it - a
     labelled button and a bare glyph, which is exactly the pair the design calls
     for.

     Focus lands AFTER the panel is in the DOM; focusing a node that does not
     exist yet is a silent no-op. */
  const toggleSearch = useCallback(() => {
    setMenuOpen(false);
    setFiltersOpen((open) => {
      const next = !open;
      if (next) {
        window.requestAnimationFrame(() => searchInputRef.current?.focus());
      } else {
        setQuery("");
      }
      return next;
    });
  }, []);

  /* Derived, not stored, so the Filters button's dot can never disagree with the
     pill row it mirrors. */
  const activeFilter = TABS.find(({ id }) => id === tab)?.label ?? null;

  const needle = query.trim().toLowerCase();

  const visible = useMemo(() => {
    /* Tab first, then the free-text needle - both filter the same array, and
       ANDing them is what a member expects from two controls. */
    const byTab = tab === "calls" ? chats.filter((c) => c.isOnline) : chats;
    if (!needle) return byTab;

    /* Name AND preview, so "scarlett" finds the thread and "coffee" finds the
       message. Matching either alone makes the field feel broken on real data. */
    return byTab.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.preview ?? "").toLowerCase().includes(needle)
    );
  }, [chats, needle, tab]);

  /* Pinned threads split OUT of the recency list rather than reordered within it:
     they must obey the same search and tab filters as the list below, and
     reordering inside one list would fight the recency sort and shuffle pinned
     rows as new messages arrive. `visible` is already newest-first, so `pinned`
     inherits that order for free. */
  const pinned = visible.filter((c) => c.isPinned);
  const unpinned = visible.filter((c) => !c.isPinned);

  const totalUnread = chats.reduce((sum, c) => sum + Math.max(c.unread ?? 0, 0), 0);
  const onlineCount = chats.filter((c) => c.isOnline).length;

  /* The most recent conversation that can actually be dialled. The quick-action
     call buttons need a peer; null means they render inert rather than linking to
     a call with no participant. */
  const callable = useMemo(() => chats.find((c) => c.callHrefBase && !c.isBot) ?? null, [chats]);


  return (
    /* THE CONTAINER.

       PageLock is the ROOT. `overflow-hidden` and `min-h-0` are stated here
       rather than left implicit in the stylesheet: they are what stop a long
       list from pushing the header out of the locked column, and saying so at
       the call site means the guarantee survives a future refactor.

       WIDTH: max-w-md on a phone reads as the app's own shell rather than a
       stretched web page, stepping to sm:max-w-2xl and lg:max-w-3xl as there is
       room. The app shell already caps content at 88rem, so without a tighter cap
       the rows stretch on a wide monitor until the avatar and the timestamp sit a
       hand-span apart.

       GUTTERS: px-3 on the narrowest phones, sm:px-5 once there is room. The sticky
       header's negative margins below MUST match these exact values - that pairing
       is what extends the header background to the screen edge.

       pb-28 clears the fixed 5rem tab bar plus the compose FAB. */
    <PageLock
      /* `bg-slate-950` ON THE ROOT is the guarantee this screen was missing.

         Nothing here paints a wallpaper, but before this the container declared
         NO background of its own - it simply inherited whatever the app shell
         put behind it. That is an open door: any element painted behind this
         page (a stale shell background, an injected promo layer, a browser
         extension, or simply a future change) shows straight through, because
         the list is a stack of partly-transparent cards over an unstated canvas.

         Declaring an OPAQUE background at the root means nothing behind this
         page can ever reach the conversation rows, whatever it is. That is
         defence in depth: it holds even for causes we have not identified, which
         matters when a rendering bug has already proved hard to pin down. */
      className="mx-auto w-full max-w-md overflow-hidden bg-slate-950 isolate sm:max-w-2xl lg:max-w-3xl"
      /* The BODY carries it too, so the scroll region is opaque in its own right
         rather than relying on the root showing through it. `min-h-0` keeps a
         long list from pushing the header out of the locked column. */
      bodyClassName="min-h-0 bg-slate-950 px-3 pb-28 sm:px-5"
    >
      {/* The observer target. Zero-height and invisible - it exists purely to be
          measured, and it MUST stay a sibling ABOVE the sticky header, so that
          "the title left the viewport" means "the member scrolled past the
          title", which is exactly when docking should begin. */}
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {/* THE HEADER.

          `sticky top-0` inside the scroll body docks this block. `-mx-3 sm:-mx-5`
          extends that background edge to edge so rows do not appear to slide under
          a card-sized strip, and the same values are restored as padding on the
          content. z-30 clears the conversation rows and the pinned section but
          stays under the shell nav. */}
      <header
        className={[
          "sticky top-0 z-30 -mx-3 border-b px-3 backdrop-blur-md sm:-mx-5 sm:px-5",
          "transition-[background-color,border-color] duration-300 motion-reduce:transition-none",
          /* Both docked states are FULLY OPAQUE slate-950. The undocked bar was
             `bg-slate-950/60` with a blur, which is translucent by definition:
             anything painted behind this page - a stale shell background, an
             injected layer - shows through it while the large title scrolls.
             There is no content behind a sticky header to justify the
             see-through, so translucency here is pure risk. */
          docked
            ? "border-orange-500/30 bg-slate-950 shadow-lg shadow-black/40"
            : "border-transparent bg-slate-950",
        ].join(" ")}
      >
        <div
          className={[
            /* The height cross-fade is what makes this read as "docking" rather
               than a jump: the title shrinks into the bar while the bar gains its
               hairline and opaque fill at the same time. */
            "flex items-center gap-3 overflow-hidden transition-all duration-300 motion-reduce:transition-none",
            docked ? "py-2.5" : "pb-4 pt-3",
          ].join(" ")}
        >
          <h1
            className={[
              "min-w-0 flex-1 truncate font-bold tracking-tight text-white transition-all duration-300 motion-reduce:transition-none",
              docked ? "text-lg" : "text-3xl",
            ].join(" ")}
          >
            Messages
          </h1>

          {/* FILTERS BUTTON - a labelled entry point to the same panel the
              magnifier opens. It lives in the TITLE ROW rather than the pill row
              because that row collapses to zero height when the header docks: a
              button down there would vanish at exactly the moment a member who
              has scrolled down wants it. */}
          <button
            type="button"
            onClick={toggleSearch}
            aria-label="Filters"
            aria-expanded={filtersOpen}
            title="Filters"
            className={[
              "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60",
              filtersOpen
                ? "border-orange-500/50 bg-orange-500/15 text-orange-200"
                : "border-white/10 bg-slate-900/80 text-ink-200 hover:border-orange-500/30 hover:text-orange-300",
            ].join(" ")}
          >
            <Icon name="settings" className="h-4 w-4" />
            Filters
            {/* Only meaningful when something is actually narrowed. */}
            {activeFilter && activeFilter !== "All" ? (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={toggleSearch}
            aria-label="Search messages"
            aria-expanded={filtersOpen}
            title="Search"
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60",
              filtersOpen
                ? "border-orange-500/30 bg-orange-500/15 text-orange-300"
                : "border-white/10 bg-slate-900/80 text-ink-200 hover:border-orange-500/30 hover:text-orange-300",
            ].join(" ")}
          >
            <Icon name="search" className="h-5 w-5" />
          </button>


          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Messages options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title="Options"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-ink-200 transition hover:border-orange-500/30 hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
            >
              {/* Drawn inline: the shared Icon set has no overflow glyph and this
                  is the only place that needs one. */}
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
                <circle cx="5" cy="12" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="19" cy="12" r="1.75" />
              </svg>
            </button>

            {menuOpen ? (
              <>
                {/* Scrim so the menu can be dismissed by an outside tap - a menu
                    with no dismiss path traps the member on the page. */}
                <button
                  type="button"
                  aria-label="Close options"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40 h-full w-full cursor-default"
                />
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-orange-500/30 bg-slate-950 py-1 shadow-2xl"
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

        {/* Subtitle. Inside the header block so it docks away WITH the title
            rather than being left floating on its own. */}
        <p
          className={[
            "overflow-hidden text-sm text-ink-300 transition-all duration-300 motion-reduce:transition-none",
            docked ? "max-h-0 opacity-0" : "max-h-16 opacity-100",
          ].join(" ")}
        >
          Connect with your verified connections.
        </p>

        {/* Filter pills. A full-width segmented track is NOT used here - the
            design calls for discrete pills, and three short pills read as three
            destinations rather than one control with three settings. They collapse
            with the header when it docks, which is exactly why the Filters button
            above sits in the title row. */}
        <div
          role="tablist"
          aria-label="Filter messages"
          className={[
            "flex items-center gap-2 overflow-x-auto transition-all duration-300 motion-reduce:transition-none",
            docked ? "mt-0 max-h-0 -translate-y-1 opacity-0" : "mt-3 max-h-12 pb-1 opacity-100",
          ].join(" ")}
        >
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
                onClick={() => setTab(id)}
                className={[
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60",
                  selected
                    ? "border-orange-500/50 bg-orange-500/20 text-orange-200"
                    : "border-white/10 bg-slate-900/80 text-ink-300 hover:border-orange-500/30 hover:text-white",
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


        {/* FILTERS PANEL. Rendered INSIDE the sticky header, which keeps it on
            screen while the bar is docked. The header has no overflow-hidden (only
            the title row does), so the panel is not clipped. */}
        {filtersOpen ? (
          <>
            {/* Scrim BELOW the panel: dismisses on an outside tap without
                stealing the tap that lands on the input itself. */}
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="fixed inset-0 z-30 h-full w-full cursor-default"
            />
            <div className="relative z-40 mt-2 rounded-2xl border border-orange-500/30 bg-slate-950 p-3 shadow-2xl">
              {/* `relative` wrapper so the glyph anchors to the FIELD, not the
                  panel - otherwise it floats at the padding edge, a full
                  icon-width away from the text it decorates. */}
              <div className="relative">
                <label htmlFor="inbox-search" className="sr-only">
                  Search messages and people
                </label>
                <input
                  id="inbox-search"
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search messages, people..."
                  className="h-11 w-full appearance-none rounded-2xl border border-orange-500/30 bg-slate-900/80 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-ink-400 focus:border-orange-500/60 [&::-webkit-search-cancel-button]:hidden"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
                >
                  <Icon name="search" className="h-4 w-4" />
                </span>
              </div>

              {/* Clear only renders when there is something to clear - a
                  permanently disabled "Clear" invites taps that do nothing. */}
              {needle ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 py-2 text-xs font-semibold text-ink-300 transition hover:border-orange-500/30 hover:text-white"
                >
                  Clear search
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </header>

      {/* THE SCAM WARNING.

          ONE static banner. An auto-advancing safety notice is a notice nobody
          reads: the copy a member actually needs must still be on screen when
          they glance back at the list an hour later. Orange is reserved for this
          one element, which is why it is a full-width block rather than a
          dismissible toast. Nothing here claims anything about an individual
          member - it is product copy about what the platform will never ask. */}
      <section
        aria-label="Scam warning"
        className="mt-4 flex items-start gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3.5"
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300"
        >
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-orange-100">Scam Warning</p>
          <p className="mt-0.5 text-[11px] leading-4 text-orange-200/90">
            Never send money, gift cards or codes to anyone. We will never ask you for them.
          </p>
        </div>
      </section>

      {/* QUICK ACTIONS.

          Every tile is a REAL destination. There is no "Create Group" tile: the
          product has no group conversations, so such a button could only lead
          nowhere. The call tiles render INERT - not as dead links - when there is
          no conversation to call, because /call/<id>/<mode> needs a real id and
          inventing one 404s on tap. */}
      <div className="mb-4 mt-4 grid grid-cols-4 gap-2">
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


      {/* THE LIST SURFACE. `bg-slate-950` here is the second opaque layer under
          the rows, and the one that does the real work: the root above already
          paints solid, but these rows are partly translucent cards, so anything
          that reaches the page must travel through THIS element to touch one.
          Declaring the surface opaque closes that path for causes we have not
          identified yet. No padding of its own - the page gutters do that. */}
      <div className="bg-slate-950">
      {/* PINNED THREADS. Distinct from the scam warning: that is product copy the
          team owns, these are real threads the viewer pinned. */}
      {pinned.length > 0 ? (
        <section aria-labelledby="inbox-pinned-heading" className="mb-4">
          <h2
            id="inbox-pinned-heading"
            className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400"
          >
            <Icon name="pin" className="h-3.5 w-3.5" aria-hidden />
            Pinned
          </h2>
          <ul className="flex flex-col gap-2">
            {pinned.map((chat) => (
              <li key={chat.key}>
                <ChatRow chat={chat} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {chats.length === 0 ? (
        emptyState
      ) : visible.length === 0 ? (
        /* A search with no hits gets its OWN message, distinct from "you have no
           conversations" - conflating the two makes a working inbox look broken. */
        <p className="rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-6 text-center text-sm text-ink-300">
          {needle
            ? `No conversations match "${query.trim()}".`
            : "Nobody is online right now. Start a chat to reach someone."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {unpinned.map((chat) => (
            <li key={chat.key}>
              <ChatRow chat={chat} />
            </li>
          ))}
        </ul>
      )}
      </div>
    </PageLock>
  );
}

const TONES = {
  orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
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
  /** Why the tile is inert - surfaced as a tooltip, not silently dimmed. */
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
      /* `aria-disabled` on a span rather than `disabled` on a <button>: a truly
         disabled control is skipped by assistive tech with no explanation. This
         stays in the tree and announces why it is inert. */
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


/* MEMOIZED, AND THE PROPS ARE A STABLE REFERENCE.

   The inbox re-renders on every keystroke in the search field, and each render
   re-ran every row. With a long list that is a real per-keystroke reconciliation
   of the whole page, and it is entirely wasted: a row's markup depends only on
   its own `chat` object, which the parent's `filter`/`map` never re-creates.

   `chat` is what makes this correct rather than just fast. The parent derives
   `pinned`/`unpinned` with `filter`, which passes the SAME object references
   through, so a row only re-renders when its own data actually changes. If this
   ever needs fresh objects per render, this memo silently stops skipping - which
   is why the comparison note lives here rather than in a comment on the props. */
const ChatRow = memo(function ChatRow({ chat }: { chat: InboxChat }) {
  /* NAMES ARE SANITIZED BEFORE THEY REACH THE VIEW.

     `display_name` is seeded from the email address on signup, so a member who
     never chose a name carries a machine string - and on some rows that string is
     the FULL ADDRESS. The inbox is the one screen where that matters most: it is a
     list of PEOPLE, and printing "ivyjahf1@gmail.com" as the label for a person is
     both ugly and a small privacy leak, since it broadcasts the address to anyone
     looking at the screen.

     `displayNameFromEmail` turns an address into a handle ("Ivy J.") and passes an
     already-human name through untouched, so this is a no-op for members who did
     choose a name. The `isLikelyEmailAddress` guard handles a real name that
     merely CONTAINS an "@", so a deliberate handle is never mangled. */
  const rawName = chat.name?.trim() || "";
  const name =
    rawName && isLikelyEmailAddress(rawName)
      ? displayNameFromEmail(rawName) || "Chat"
      : rawName || "Chat";
  const unread = Math.max(chat.unread ?? 0, 0);
  const at = chat.lastMessageAt ? formatChatTime(chat.lastMessageAt) : null;

  /* "Sarah Chen, 32". The age is OMITTED rather than replaced with a dash when
     unknown, so a member who has not shared a date of birth looks like a member
     rather than like a gap in the data. */
  const identity = chat.age != null && chat.age > 0 ? `${name}, ${chat.age}` : name;

  return (
    /* A raised OPAQUE card inset from the screen edge by the page's own padding,
       so no row touches the bezel. Opaque matters, and it is now absolute: a
       translucent fill lets whatever is behind the page show through the row,
       which reads as a rendering fault. `bg-slate-900` with no alpha. */
    <Link
      href={chat.href as never}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 p-3 transition hover:border-orange-500/30 hover:bg-slate-800 active:scale-[0.99] sm:gap-4"
    >
      {/* A FIXED-SIZE, OVERFLOW-CLIPPED BOX around the avatar.

          `h-11 w-11` mirrors Avatar's own `md` size, so the box and the image
          agree even if a size utility is ever purged. `overflow-hidden` is the
          real guarantee: whatever intrinsic pixel dimensions an uploaded
          `/api/photos/...` file has, it is clipped to the circle instead of
          escaping into the row. `relative` anchors the unread badge and the
          presence dot to THIS element rather than to the page. */}
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
        <Avatar name={name} src={chat.avatarUrl} kind={chat.kind} size="md" />
        {/* Bots are never "online" - they have no presence row, so a dot would be
            a status the product cannot resolve. */}
        {chat.isBot ? null : <PresenceDot online={chat.isOnline} size="md" />}
        {unread > 0 ? (
          <span
            aria-label={`${unread} unread ${unread === 1 ? "message" : "messages"}`}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{identity}</p>
        <p className="truncate text-xs text-ink-300">
          {chat.preview?.trim() || "No messages yet"}
        </p>
      </div>

      {/* Timestamp hard right, OUTSIDE the truncating middle column, so a long
          preview can never ellipsize it.

          `suppressHydrationWarning` IS LOAD-BEARING. `formatChatTime` reads
          `Date.now()` DURING RENDER, and this component is server-rendered, so the
          server renders at T and the client hydrates at T+delta - a thread showing
          "1m ago" can hydrate as "2m ago". That is a genuine mismatch firing on the
          inbox's first paint, not a cosmetic one.

          The suppression is scoped to this element's own text, which is the only
          value that legitimately differs between the two renders. The alternative -
          gating the timestamp behind a mounted flag - renders an empty cell on the
          server and pops the value in later, which is worse. */}
      {at ? (
        <span
          suppressHydrationWarning
          className={[
            "shrink-0 whitespace-nowrap text-[11px]",
            unread > 0 ? "font-semibold text-orange-400" : "text-ink-400",
          ].join(" ")}
        >
          {at}
        </span>
      ) : null}
    </Link>
  );
});

/**
 * Relative chat timestamp.
 *
 * "2m ago", "1h ago", "Yesterday" - the words a person would say out loud. Bare
 * "2m" / "1h" / "3d" read as a machine counter next to a human name, and "3d"
 * says nothing about whether the member missed three conversations or thirty.
 *
 * `Math.max` guards zero: server/device clock skew can put a message seconds in
 * the future, which would otherwise render "in 4m ago".
 */
function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.max(Math.floor((Date.now() - date.getTime()) / 60_000), 0);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
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

