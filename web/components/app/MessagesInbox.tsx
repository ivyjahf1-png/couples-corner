// MessagesInbox.tsx — the entire /messages surface.
//
// WHY THIS IS A CLIENT COMPONENT: the notification banner has to read
// `Notification.permission` and call `requestPermission()`, and the dismiss state
// has to live somewhere. Everything else it renders is plain serialisable data
// passed down from the page, so nothing here fetches.
//
// THE LIGHT THEME MATCHES THE PROFILE SCREEN (`components/profile/ProfileScreen.tsx`)
// so the two screens read as one app. Both declare the same slate/amber ramp
// inline rather than through a theme file, because the app's `--background`
// token is still the old dark navy and retinting it would repaint every route.
//
// NO WALLPAPER. The previous inbox painted a per-device chat background out of
// localStorage. A photo behind a list of faces and message previews is the wrong
// trade on this screen, so the layer is gone rather than restored, and the
// background is stated explicitly on the root instead of being inherited from
// whatever the shell happens to paint behind it.
//
// BOTTOM NAVIGATION IS NOT IN HERE — the shell already renders a fixed tab bar
// (`BottomNavRegion`) and `AppMain` carries the matching padding, which `pb-24`
// below reserves. See `ProfileScreen` for the same reasoning.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Crown,
  Headset,
  Mail,
  MessageCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageLock } from "@/components/app/PageHeader";
import { Avatar } from "@/components/app/Avatar";
import { requestNotificationPermission } from "@/lib/utils/notify";

/** One real conversation, as assembled by the page. */
export interface InboxChat {
  key: string;
  href: string;
  name: string;
  kind: "person" | "couple";
  avatarUrl: string | null;
  /** Null when the member has not shared a date of birth. */
  age: number | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  isOnline: boolean;
  isPinned?: boolean;
  isBot?: boolean;
}

/**
 * A row that is NOT a conversation: Visitors, Official Team, Expired Messages.
 *
 * These are product surfaces that happen to live in the inbox. Modelled as their
 * own variant rather than faked up as a chat, because a system row has no
 * timestamp, no avatar and no preview — shoehorning them into `InboxChat` is what
 * made the old inbox print "undefined" in those columns.
 */
interface SystemRow {
  kind: "system";
  key: string;
  title: string;
  subtitle: string;
  /** Leading disc glyph + its gradient. */
  icon: LucideIcon;
  gradient: string;
  /** Null renders the row inert — there is no screen to open. */
  href: string | null;
  /** Right-hand count chip, e.g. "+169". */
  badge: string | null;
}

/** A conversation row. */
interface ChatRow {
  kind: "chat";
  key: string;
  chat: InboxChat;
}

type InboxRow = SystemRow | ChatRow;

/** localStorage key recording that the member dismissed the banner for good. */
const BANNER_DISMISSED_KEY = "couples_corner:notification-banner-dismissed";

/** Soft card shadow shared by every white surface, matching the profile screen. */
const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

/**
 * "2026-10-02T20:35:00Z" → "10-02 20:35".
 *
 * LOCAL time, deliberately, not UTC: this label sits next to a person, and
 * "20:35" must mean twenty past eight where the reader is. Formatting with
 * `toISOString().slice()` would print UTC and put the row an hour out for most
 * of Europe. The reference design shows this exact width — month, dash, day,
 * space, 24-hour clock — so it is padded rather than trimmed.
 *
 * Returns null for a missing or unparseable value; the row then omits the
 * timestamp instead of printing "Invalid Date".
 */
function formatStamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/**
 * The permission prompt at the top of the inbox.
 *
 * WHY IT IS NOT `position: fixed`: the design calls it "floating", but a truly
 * fixed card would sit above the shell's own header, cover the route title, and
 * never scroll away — a permanent overlay above a list. It is rendered first
 * inside the scroll region instead, so it reads as a floating card at the top
 * and then scrolls with the content, which is what the reference does.
 *
 * WHY PERMISSION IS ONLY EVER REQUESTED FROM THE BUTTON: Chrome and Safari both
 * reject `requestPermission()` that does not trace back to a user gesture, and
 * there is no workaround. So nothing here calls it on mount — only the Allow
 * button does, and that is the whole reason this file is a client component.
 *
 * The dismissal is persisted, because a banner a member swipes away and sees
 * again on every visit is worse than no banner at all. Reading localStorage is
 * deferred to an effect so the server markup and the first client paint agree;
 * rendering it on the server and hiding it after hydration would flash it.
 */
function NotificationBanner({ onDismiss }: { onDismiss: () => void }) {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");

  /* Deferred to an effect, and read defensively: Safari throws on localStorage
     in private mode, and an unreadable preference must not take the inbox down. */
  useEffect(() => {
    try {
      if (window.localStorage.getItem(BANNER_DISMISSED_KEY) === "1") onDismiss();
    } catch {
      /* storage unavailable — show the banner rather than hide it forever */
    }
  }, [onDismiss]);

  const allow = useCallback(async () => {
    setState("working");
    const result = await requestNotificationPermission();
    /* Retired on `granted` AND `denied`: a member who said no has answered, and
       re-asking on every visit is what gets a site blocked. Only `default`
       (they dismissed the native sheet) leaves the banner up. */
    if (result === "granted" || result === "denied") {
      try {
        window.localStorage.setItem(BANNER_DISMISSED_KEY, "1");
      } catch {
        /* ignore — the banner simply returns next visit */
      }
      onDismiss();
      return;
    }
    setState("idle");
  }, [onDismiss]);

  return (
    <div className={`flex items-center gap-3 p-3 ${CARD}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
        <Bell className="h-5 w-5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">Turn on message notification</p>
        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
          Click to enable notification permission to receive chat messages in time
        </p>
      </div>

      <button
        type="button"
        onClick={allow}
        disabled={state === "working"}
        className={`shrink-0 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-amber-500 disabled:opacity-60 ${FOCUS}`}
      >
        {state === "working" ? "…" : "Allow"}
      </button>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification prompt"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 ${FOCUS}`}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
/**
 * One inbox row.
 *
 * System rows get a gradient disc with a glyph; chat rows get the member's real
 * avatar through `Avatar`, which falls back to initials when the photo URL is
 * missing or broken. The two are separate branches rather than one row with a
 * nullable avatar, because the leading disc IS the design for a system row and an
 * initials fallback would falsely imply a person sent it.
 */
function InboxRowItem({ row }: { row: InboxRow }) {
  const ROW_FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400";

  if (row.kind === "system") {
    const Icon = row.icon;
    const body = (
      <>
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${row.gradient} text-white`}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-900">{row.title}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">{row.subtitle}</span>
        </span>
        {row.badge ? (
          <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
            {row.badge}
          </span>
        ) : null}
      </>
    );

    return (
      <li>
        {row.href ? (
          <Link href={row.href} className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 ${ROW_FOCUS}`}>
            {body}
          </Link>
        ) : (
          /* No destination: a non-interactive row. `href="#"` would look tappable
             and do nothing, which is worse than an obviously inert row. */
          <div className="flex items-center gap-3 px-4 py-3.5">{body}</div>
        )}
      </li>
    );
  }

  const { chat } = row;
  const stamp = formatStamp(chat.lastMessageAt);

  return (
    <li>
      <Link href={chat.href} className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 ${ROW_FOCUS}`}>
        {/* `relative` hosts the Game badge, which is deliberately allowed to
            overlap the avatar's edge — that offset is what makes it read as a
            floating badge rather than a second, badly placed avatar. */}
        <span className="relative shrink-0">
          <Avatar name={chat.name} src={chat.avatarUrl} size="md" />
          {chat.isBot ? (
            <span className="absolute -bottom-0.5 -right-1 rounded-full bg-rose-500 px-1.5 py-px text-[9px] font-bold text-white">
              Game
            </span>
          ) : null}
        </span>

        <span className="min-w-0 flex-1">
          {/* Name and stamp share one flex row so the timestamp pins to the right
              edge even when the name wraps to two lines. */}
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">
              {chat.name}
            </span>
            {stamp ? (
              <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{stamp}</span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">{chat.preview}</span>
        </span>

        {/* Hidden entirely at zero — a grey "0" chip on every read thread is noise,
            and `aria-label` carries the meaning instead. */}
        {chat.unread > 0 ? (
          <span
            aria-label={`${chat.unread} unread`}
            className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white"
          >
            {chat.unread > 99 ? "99+" : chat.unread}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
export function MessagesInbox({
  chats,
  visitors,
  expiredCount,
}: {
  chats: InboxChat[];
  /** Profile-visitor count for the Visitors row. 0 hides the "+n" chip. */
  visitors: number;
  /** Unread expired-message count. 0 hides the badge; the row still shows. */
  expiredCount: number;
}) {
  const [bannerVisible, setBannerVisible] = useState(false);

  /* Start hidden and reveal in an effect. On THIS route the member is already
     signed in and has seen the app before, so the common case is "already
     answered" — flashing a permission prompt at someone who dismissed it last
     visit is exactly the behaviour that trains people to dismiss banners. */
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(BANNER_DISMISSED_KEY);
    } catch {
      /* storage unavailable — fall through and show the banner */
    }
    setBannerVisible(stored !== "1");
  }, []);

  const dismissBanner = useCallback(() => setBannerVisible(false), []);

  /* Pinned threads first, then everyone else newest-first. The page already
     sorted by recency, so this only lifts the pinned ones. */
  const rows: InboxRow[] = useMemo(() => {
    const chatRows = [...chats]
      .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)))
      .map<ChatRow>((chat) => ({ kind: "chat", key: chat.key, chat }));

    return [
      {
        kind: "system",
        key: "system-visitors",
        title: `${visitors} have seen me`,
        subtitle: "Hey! People here appreciate you, see whos visiting your profile",
        icon: MessageCircle,
        gradient: "from-violet-500 to-purple-700",
        href: "/likes",
        badge: visitors > 0 ? `+${visitors}` : null,
      },
      {
        kind: "system",
        key: "system-team",
        title: "Official Team",
        subtitle: "Your charisma attracted Sugar to your home page multiple tim...",
        icon: Headset,
        gradient: "from-pink-500 to-rose-600",
        /* Official announcements live in the alerts surface; there is no separate
           "team inbox" route to open. */
        href: "/notifications",
        /* The reference design marks this row with a lips/kiss glyph. A unicode
           emoji is used rather than an icon so it matches the reference exactly;
           wrapped in aria-hidden because the row's own text carries the meaning. */
        badge: "💋",
      },
      ...chatRows,
      {
        kind: "system",
        key: "system-expired",
        title: "Expired Messages",
        subtitle: "Expired Messages Record",
        icon: Mail,
        gradient: "from-amber-300 to-yellow-500",
        /* There is no expired-messages screen in this app, so this row is inert
           rather than a link to nowhere. It still reports the count. */
        href: null,
        badge: expiredCount > 0 ? String(expiredCount) : null,
      },
    ];
  }, [chats, visitors, expiredCount]);

  return (
    /* PageLock is the app's single scroll region (`body` is the only
       `overflow-y-auto` element), which is what keeps the shell's fixed bottom
       nav from bouncing. `pb-24` clears that nav.

       `bg-slate-50` on the root is explicit on purpose: the previous inbox
       inherited whatever the shell painted behind it, which let any layer behind
       this page show straight through the rows. */
    <PageLock
      flush
      className="bg-slate-50"
      bodyClassName="flex flex-col gap-3 px-4 py-3 pb-24"
    >
      {bannerVisible ? <NotificationBanner onDismiss={dismissBanner} /> : null}

      {/* Faint promotional strip. `aria-hidden` — it is decoration with no
          destination, and announcing "FAKE COIN OFFERS" to a screen reader
          every time the inbox loads is noise. Say it to sighted users only. */}
      <p aria-hidden className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-300">
        Fake Coin Offers
      </p>

      {chats.length === 0 ? (
        /* The three system rows are inbox furniture, not conversations, so they
           still render when there are no chats — an empty inbox shows Visitors,
           Official Team and Expired Messages plus this notice. `EmptyState` is
           deliberately NOT used here: it hardcodes the old dark palette
           (`bg-surface-muted`, `text-white`) and would render as a black slab on
           this light screen. */
        <div className={`flex flex-col items-center gap-2 px-6 py-12 text-center ${CARD}`}>
          <MessageCircle className="h-8 w-8 text-slate-300" aria-hidden />
          <p className="text-sm font-bold text-slate-900">No messages yet</p>
          <p className="max-w-xs text-xs leading-5 text-slate-500">
            Once you connect with someone, you can start a private chat from their profile.
          </p>
          <Link
            href="/discover"
            className={`mt-1 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-amber-500 ${FOCUS}`}
          >
            Discover people
          </Link>
        </div>
      ) : (
        /* One card, `divide-y` between rows. Splitting each row into its own card
           puts a border above and below every single line, which reads as a stack
           of boxes rather than one list. */
        <ul className={`divide-y divide-slate-100 overflow-hidden ${CARD}`}>
          {rows.map((row) => (
            <InboxRowItem key={row.key} row={row} />
          ))}
        </ul>
      )}

      {/* Crown mark on the last chat row, per the reference: it reads as a
          VIP/persona marker. Decorative only. */}
      {chats.length > 0 ? (
        <p aria-hidden className="flex items-center justify-center gap-1 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
          <Crown className="h-3 w-3" aria-hidden />
          End of inbox
        </p>
      ) : null}
    </PageLock>
  );
}