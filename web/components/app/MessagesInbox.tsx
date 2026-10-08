"use client";

/**
 * MESSAGES INBOX — the `/messages` list.
 *
 * â”€â”€ WHY A CLIENT COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * The header's Chat/Call switcher, the scam banner's dismiss state and the
 * active-tab highlight are all interaction state, so this file owns them. Every
 * conversation is fetched on the SERVER (see `app/(app)/messages/page.tsx`) and
 * arrives here as plain serialisable rows — nothing in this file queries Supabase
 * or re-reads the session.
 *
 * â”€â”€ THE THEME MATCHES THE PROFILE SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * `components/profile/ProfileScreen.tsx` declares the same purple ramp, so
 * the two read as one app. The ramp is stated inline rather than through a theme
 * token because the app's `--background` is still the old dark navy, and
 * retinting it would repaint every route in the product.
 *
 * â”€â”€ BOTTOM NAVIGATION IS NOT IN HERE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * The app shell renders a fixed tab bar (`BottomNavRegion`) on every route, and
 * `AppMain` carries the matching padding. Rendering a second bar inside the
 * scroll region would draw a duplicate above the real one — the exact bug the
 * profile screen documents. `pb-24` here reserves its height.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Headset,
  MessageCircle,
  Phone,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageLock } from "@/components/app/PageHeader";
import { useScrollCollapse } from "@/lib/hooks/useScrollCollapse";
import { Avatar } from "@/components/app/Avatar";
import { profileViewClick } from "@/components/profile/ProfileViewModal";

/** One real conversation, as assembled by the server page. */
export interface InboxChat {
  key: string;
  href: string;
  name: string;
  kind: "person" | "couple";
  avatarUrl: string | null;
  /**
   * THE OTHER PARTICIPANT'S UID — null for bot threads and self-conversations.
   *
   * Set, the avatar tap opens the global profile view modal
   * (`profileViewClick`); unset, the tap falls through to the row's normal
   * thread navigation, so no row ever offers a modal with nothing to fetch.
   */
  userId?: string | null;
  /** Null when the member has not shared a date of birth. */
  age: number | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
  isOnline: boolean;
  isPinned?: boolean;
  isBot?: boolean;
  /**
   * Decorative heart/kiss run shown beside the name, matching the reference.
   *
   * OPTIONAL because there is no emoji column in this schema — a member cannot
   * choose their own. When absent the row renders the name alone rather than
   * inventing a glyph, so the screen never claims an attribute the data does not
   * carry. Set it once a real column exists.
   */
  emoji?: string;
  /** Ornate frame treatment for VIP/ornate accounts. */
  frame?: "gold" | null;
  /** Sticker glyphs overlaid on the avatar (anime / kitty style). */
  stickers?: string[];
}

/**
 * A row that is NOT a conversation: the seen-me counter and Official Team.
 *
 * Modelled as its own variant rather than faked up as a chat, because a system
 * row has no timestamp, no avatar and no preview — shoehorning them into
 * `InboxChat` is what made the old inbox print "undefined" in those columns.
 */
interface SystemRow {
  kind: "system";
  key: string;
  title: string;
  subtitle: string;
  /** Leading disc glyph + its gradient. */
  icon: LucideIcon;
  gradient: string;
  /** Small glyph pinned to the disc's lower-right, e.g. the "Hi" badge. */
  iconBadge?: string;
  /** Null renders the row inert — there is no screen to open. */
  href: string | null;
  /** Right-hand count chip, e.g. "+170". */
  badge: string | null;
}

/** A conversation row. */
interface ChatRow {
  kind: "chat";
  key: string;
  chat: InboxChat;
}

type InboxRow = SystemRow | ChatRow;

/**
 * THE GLASS CARD - every surface on this screen, and the exact token
 * `components/profile/ProfileScreen.tsx` uses.
 *
 * This was `bg-white`. The profile's surfaces are translucent purple, so an
 * opaque white card here was the one thing that made the inbox read as a
 * different app from the page you reach it from. The shadow is the profile's
 * too - a dark one, because a shadow tuned for white cards is invisible on a
 * dark canvas.
 */
const CARD =
  "rounded-2xl border border-white/[0.08] bg-[#2A2438]/55 shadow-[0_1px_2px_rgba(0,0,0,0.45)] [contain:layout_style]";

/**
 * THE PAGE CANVAS - the SAME gradient as `app/(app)/profile/page.tsx`.
 *
 * Declared here rather than in `globals.css` for the reason the profile page
 * gives: the app's `--background` token is still the old navy and retinting it
 * would repaint every route in the product. Two radial blooms sit UNDER the
 * vertical ramp - a warm one at the foot, a plum one through the middle - so the
 * list does not sit on a flat interpolation between two flat ends.
 *
 * `backgroundAttachment: "fixed"` pins the ramp to the VIEWPORT rather than the
 * scroll box, so the warm foot stays at the bottom of the screen while the list
 * scrolls under it.
 */
const CANVAS: React.CSSProperties = {
  backgroundColor: "#0F0C1B",
  backgroundImage: [
    "radial-gradient(90% 45% at 50% 100%, rgba(255,138,46,0.22) 0%, rgba(255,122,0,0.08) 42%, rgba(255,122,0,0) 74%)",
    "radial-gradient(120% 50% at 50% 62%, rgba(122,92,178,0.18) 0%, rgba(122,92,178,0.05) 45%, rgba(122,92,178,0) 75%)",
    "linear-gradient(180deg, #0F0C1B 0%, #0F0C1B 6%, #1B1636 34%, #2C1B41 62%, #402340 84%, #55303A 100%)",
  ].join(", "),
};

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]";

const ROW_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A00]";
/**
 * "2026-10-02T20:35:00Z" â†’ "10-02 20:35".
 *
 * LOCAL time, deliberately. This label sits next to a person, and "20:35" must
 * mean twenty past eight where the READER is. `toISOString()` would print UTC and
 * put the row an hour out for most of Europe. Padded, not trimmed, to the fixed
 * month-day-hour width the reference uses.
 *
 * Returns null for a missing or unparseable value; the row then omits the stamp
 * rather than printing "Invalid Date".
 */
function formatStamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * THE HEADER — pinned above the scroll region via `PageLock`'s `head` slot.
 *
 * WHY IT IS IN `head` AND NOT IN THE BODY: this is the only chrome that must not
 * scroll. `PageLock` renders `head` outside the single `overflow-y-auto` body, so
 * the switcher and the right-hand actions stay put while the list scrolls under
 * them — which is what the reference shows.
 *
 * THE CHAT / CALL SWITCHER. `role="tablist"` with `aria-selected`, so the active
 * pane is announced rather than being conveyed by the yellow pill alone. "Call"
 * is a real tab in the reference but there is NO call-log route in this app, so
 * selecting it renders an honest empty state rather than links to nowhere. A tab
 * that opens nothing is worse than a tab that admits it is empty.
 */
function MessagesHeader({
  tab,
  onTabChange,
  unread,
  collapsed,
}: {
  tab: "chat" | "call";
  onTabChange: (tab: "chat" | "call") => void;
  unread: number;
  /** True once the conversation list has been scrolled past the threshold. */
  collapsed: boolean;
}) {
  const tabs: { id: "chat" | "call"; label: string; icon: LucideIcon }[] = [
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "call", label: "Call", icon: Phone },
  ];

  return (
    <header className="shrink-0 border-b border-white/[0.08] bg-[#0F0C1B]/70 px-4 pt-3 backdrop-blur-md">
      <div className="relative flex items-center justify-between gap-3">
        {/* The title is pinned to the row's CENTRE line, not laid out in flow. In
            flow it shared the row with the search/filter/settings cluster, so its
            position depended on that cluster's width — three 36px buttons plus
            gaps pushed the title left of centre, and it moved again when the
            `sm:`-gated filter button appeared. Absolute centring measures it from
            the bar itself, so it cannot drift left/right at any width or during
            scroll. `pointer-events-none` keeps it from stealing taps from the
            controls it overlays; `max-w` + `truncate` stops a long title from
            colliding with either side. */}
        <h1 className="pointer-events-none absolute left-1/2 top-1/2 max-w-[45%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-lg font-bold text-white">
          Messages
        </h1>
        {/* The filter control is `hidden sm:flex`: on the narrowest phones three
            icons plus a title crowds the row and wraps. Search and Settings
            survive at every width. */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search messages"
            className={`flex h-9 w-9 items-center justify-center rounded-full text-[#A09AB0] transition hover:bg-white/[0.08] hover:text-white ${FOCUS}`}
          >
            <Search className="h-[18px] w-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Filter messages"
            className={`hidden h-9 w-9 items-center justify-center rounded-full text-[#A09AB0] transition hover:bg-white/[0.08] hover:text-white sm:flex ${FOCUS}`}
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Message settings"
            className={`flex h-9 w-9 items-center justify-center rounded-full text-[#A09AB0] transition hover:bg-white/[0.08] hover:text-white ${FOCUS}`}
          >
            <Settings2 className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
      </div>

      {/* THE SWITCHER collapses away once the list is scrolled.

          Unlike the chat room's header, the "Messages" TITLE is a single short
          word that is always worth showing, so it stays put; the Chat/Call pills
          are the secondary row and are what collapses. They are removed from the
          DOM entirely rather than faded, because `height: 0` + `overflow: hidden`
          is the only way to actually reclaim the space, and keeping a focusable
          button inside a zero-height clipped box is an accessibility trap: it
          stays tabbable while being invisible. */}
      <div
        role="tablist"
        aria-label="Message type"
        className={`overflow-hidden transition-[max-height,opacity,margin] duration-200 ${
          collapsed ? "mt-0 max-h-0 opacity-0" : "mt-3 max-h-16 opacity-100"
        }`}
        /* Hidden from assistive tech when collapsed, for the same reason: the
           tabs are unreachable at zero height, so announcing them would promise
           an interaction the member cannot perform. The current tab remains
           recoverable from the row's own state, which is unchanged. */
        aria-hidden={collapsed}
      >
        {/* The flex row lives INSIDE the clipping wrapper, so collapsing the
            wrapper's max-height does not disturb the pills' own layout. */}
        <div className="flex gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(item.id)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition",
                  FOCUS,
                  selected
                    ? "bg-[#FF7A00] text-white shadow-[0_2px_10px_-2px_rgba(255,122,0,0.45)]"
                    : "bg-white/[0.08] text-[#A09AB0] hover:bg-white/[0.12]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
                {item.id === "chat" && unread > 0 ? (
                  <span
                    aria-label={`${unread} unread`}
                    className="ml-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

/**
 * THE SCAM WARNING BANNER.
 *
 * THIS REPLACES a faint grey "Fake Coin Offers" line of text. That line was
 * announced to a screen reader on every inbox load while carrying almost no
 * visual weight — the worst of both worlds. It is now a real, dismissible banner,
 * painted as a DARK amber card. The original was pastel peach, which is correct
 * only against a white inbox: on this canvas it was the brightest block on the
 * screen and pulled the eye off the message list. Decorative glyphs stay hidden
 * from assistive tech so only the sentence is announced.
 *
 * The copy is deliberately blunt and uppercase, matching the reference. This is
 * the one place in the product where shouting is correct: it is a fraud warning
 * aimed at people who are being actively targeted, and a soft-toned warning
 * would not survive being skimmed.
 *
 * `role="status"` rather than `alert`: an `alert` fires an ASSERTIVE announcement
 * on every render, which for a banner present on every visit is exhausting.
 * `status` is polite and still announced.
 */
function ScamWarningBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl border border-[#FF7A00]/30 bg-[#2A1F0E]/70 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
    >
      {/* Decorative ghost + sunflower, per the reference. `aria-hidden` because they
          carry no information the sentence does not. */}
      <span aria-hidden className="flex shrink-0 items-center text-lg leading-none">
        ðŸ‘»<span className="-ml-1 text-base">ðŸŒ»</span>
      </span>

      <p className="min-w-0 flex-1 text-[13px] font-extrabold uppercase leading-tight tracking-wide text-[#FFC98A]">
        Scam Warning!! Don&apos;t fall for fake coin offers
      </p>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss scam warning"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#FFA040] transition hover:bg-[#FF7A00]/25 ${FOCUS}`}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * THE AVATAR CELL — online dot, VIP frame and sticker overlays.
 *
 * All three decorations mount on ONE positioned wrapper rather than on the
 * avatar itself, because `Avatar` renders a plain `<img>`/initials disc and has no
 * overflow or positioning of its own to hang them off.
 *
 * THE ONLINE DOT is bottom-RIGHT, which is the convention every other surface in
 * this app uses (`PresenceDot` on the profile), so a member does not have to learn
 * two different presence positions. It sits OUTSIDE the disc so a dark photo
 * cannot swallow it.
 *
 * THE GOLD FRAME is a conic-gradient ring for VIP/ornate accounts. `conic-gradient`
 * is used rather than a plain border because a flat gold border reads as a
 * disabled input; the sweep is what makes it read as ornament. It is purely
 * decorative (`aria-hidden`), since the data has no VIP flag — the `frame` prop is
 * set by the caller, never inferred.
 *
 * `overflow-visible` is the default and is what lets both the dot and the stickers
 * escape the disc. A wrapper with any overflow value here would clip them.
 */
function InboxAvatar({ chat }: { chat: InboxChat }) {
  return (
    /* AVATAR TAP → PROFILE MODAL, the rest of the row → thread.

       A nested `<a>` inside the row's `<Link>` is invalid HTML, so this stays a
       plain span carrying an onClick: `profileViewClick` calls
       `preventDefault()`, which cancels the PARENT link's navigation for this
       click (the default action is decided once, at dispatch time, regardless of
       which handler cancelled it). Rows without a `userId` (bot threads) pass a
       null id, the helper's guard skips `preventDefault`, and the tap enters the
       thread exactly as before. */
    <span
      className="relative shrink-0"
      onClick={profileViewClick(chat.userId)}
    >
      {chat.frame === "gold" ? (
        <span
          aria-hidden
          className="absolute -inset-[3px] rounded-full bg-[conic-gradient(from_180deg,#f59e0b,#fde68a,#fbbf24,#d97706,#f59e0b)]"
        />
      ) : null}

      <span className="relative block">
        <Avatar name={chat.name} src={chat.avatarUrl} size="md" />
      </span>

      {/* STICKER OVERLAYS. Pinned to two opposite corners so two glyphs never
          collide, and `text-[10px]` keeps them reading as badges on the photo
          rather than competing with the face. */}
      {chat.stickers?.slice(0, 2).map((sticker, index) => (
        <span
          key={`${sticker}-${index}`}
          aria-hidden
          className={`absolute text-[10px] leading-none drop-shadow-sm ${
            index === 0 ? "-left-1 -top-1" : "-bottom-1 -right-1"
          }`}
        >
          {sticker}
        </span>
      ))}

      {chat.isOnline ? (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"
          aria-hidden
        />
      ) : null}

      {/* The state is ALSO stated in text, so presence is never colour-only. */}
      <span className="sr-only">{chat.isOnline ? "Online now" : "Offline"}</span>
    </span>
  );
}

/**
 * ONE ROW — either a system row or a conversation.
 *
 * WHY A DISCRIMINATED UNION. A system row has no timestamp, no avatar and no
 * preview; forcing it through the chat shape is what printed "undefined" in those
 * columns in earlier versions. Each branch renders only the fields it has.
 */
function InboxRowItem({ row }: { row: InboxRow }) {
  if (row.kind === "system") {
    const Icon = row.icon;
    const body = (
      <>
        {/* The disc is the positioned host for the optional "Hi" corner badge, so
            the badge tracks the disc rather than the row. */}
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm">
          <span className={`absolute inset-0 rounded-full bg-gradient-to-br ${row.gradient}`} aria-hidden />
          <Icon className="relative h-6 w-6" aria-hidden />
          {row.iconBadge ? (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-1 rounded-full bg-[#FF7A00] px-1.5 py-px text-[9px] font-bold leading-none text-white ring-2 ring-white"
            >
              {row.iconBadge}
            </span>
          ) : null}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-white">{row.title}</span>
            {/* The lips glyph on the Official Team row. `aria-hidden`: it is a
                decorative echo of the row's meaning, which the title already
                carries. */}
            {row.badge && !/^\+?\d+$/.test(row.badge) ? (
              <span aria-hidden className="shrink-0 text-sm leading-none">
                {row.badge}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-[#A09AB0]">{row.subtitle}</span>
        </span>

        {/* Numeric counters only. `shrink-0` keeps the chip pinned right even when
            the subtitle is long enough to wrap. */}
        {row.badge && /^\+?\d+$/.test(row.badge) ? (
          <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
            {row.badge}
          </span>
        ) : null}
      </>
    );

    return (
      <li>
        {row.href ? (
          <Link
            href={row.href}
            className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.06] ${ROW_FOCUS}`}
          >
            {body}
          </Link>
        ) : (
          /* No destination: an inert row. `href="#"` would look tappable and do
             nothing, which is worse than an obviously inactive row. */
          <div className="flex items-center gap-3 px-4 py-3.5">{body}</div>
        )}
      </li>
    );
  }

  const { chat } = row;
  const stamp = formatStamp(chat.lastMessageAt);

  return (
    <li>
      <Link
        href={chat.href}
        className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.06] ${ROW_FOCUS}`}
      >
        <InboxAvatar chat={chat} />

        <span className="min-w-0 flex-1">
          {/* Name, emoji run and stamp share ONE flex row so the timestamp pins to
              the right edge even when the name is long enough to ellipsize. */}
          <span className="flex items-baseline gap-2">
            <span className="flex min-w-0 items-baseline gap-1">
              <span className="truncate text-sm font-bold text-white">{chat.name}</span>
              {chat.emoji ? (
                <span aria-hidden className="shrink-0 text-xs leading-none">
                  {chat.emoji}
                </span>
              ) : null}
            </span>
            {stamp ? (
              <span className="shrink-0 text-[10px] tabular-nums text-[#A09AB0]">{stamp}</span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-[#A09AB0]">{chat.preview}</span>
        </span>

        {/* Hidden at zero — a grey "0" chip on every read thread is noise, and the
            `aria-label` carries the meaning instead. */}
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

/**
 * THE INBOX — header, scam banner, system rows and the conversation list.
 */
export function MessagesInbox({
  chats,
  visitors,
  expiredCount,
}: {
  chats: InboxChat[];
  /** Profile-visitor count for the seen-me row. 0 hides the "+n" chip. */
  visitors: number;
  /** Unread expired-message count. 0 hides the badge; the row still shows. */
  expiredCount: number;
}) {
  const [tab, setTab] = useState<"chat" | "call">("chat");

  /* SCROLL-DRIVEN HEADER COLLAPSE. The hook listens on the `page-lock__body`
     region `PageLock` owns, passed down as `bodyRef` below - the inbox must not
     introduce its own scroll container or the page ends up with two. */
  const { ref: collapseRef, collapsed } = useScrollCollapse<HTMLDivElement>(12);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const dismissWarning = useCallback(() => setWarningDismissed(true), []);

  /* TOTAL UNREAD, for the Chat tab's count chip. Derived rather than passed so the
     header can never show a total that disagrees with the rows beneath it.
     `Number.isFinite` guards a malformed row: `NaN` would poison the whole sum and
     blank the chip. */
  const totalUnread = useMemo(
    () => chats.reduce((sum, chat) => sum + (Number.isFinite(chat.unread) ? chat.unread : 0), 0),
    [chats]
  );

  /* PINNED FIRST, THEN NEWEST. The page already sorted by recency, so this only
     lifts the pinned ones to the top. */
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
        icon: UserPlus,
        gradient: "from-violet-500 to-purple-700",
        /* The reference pins a "Hi" speech badge to this disc. */
        iconBadge: "Hi",
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
        /* Rendered as the lips glyph beside the title, per the reference. */
        badge: "💋",
      },
      ...chatRows,
      {
        kind: "system",
        key: "system-expired",
        title: "Expired Messages",
        subtitle: "Expired Messages Record",
        icon: Sparkles,
        gradient: "from-amber-300 to-yellow-500",
        /* No expired-messages screen exists in this app, so the row is inert rather
           than a link to nowhere. It still reports the count. */
        href: null,
        badge: expiredCount > 0 ? String(expiredCount) : null,
      },
    ];
  }, [chats, visitors, expiredCount]);

  const showChats = tab === "chat";

  return (
    /* `PageLock` is the app's single scroll region — `body` is the only
       `overflow-y-auto` element, which is what stops the shell's fixed bottom nav
       from bouncing. `head` holds the pinned header; `pb-24` reserves the nav's
       height so the last row is never stranded behind it.

       THE CANVAS. The `CANVAS` gradient is declared on the PageLock ROOT, not on
       the body: the body is the single `overflow-y-auto` region, so a gradient
       there would scroll away with the content and leave a flat void above it. */
    <PageLock
      style={CANVAS}
      head={
        <MessagesHeader
          tab={tab}
          onTabChange={setTab}
          unread={totalUnread}
          collapsed={collapsed}
        />
      }
      bodyRef={collapseRef}
      bodyClassName="flex min-h-0 flex-1 flex-col gap-3 overscroll-contain px-4 py-3 pb-[calc(6rem_+_env(safe-area-inset-bottom))] [touch-action:pan-y] [content-visibility:auto] md:pb-8"
    >
      {/* The fraud warning is OUTSIDE the tab panels: it applies regardless of
          whether the member is reading chats or calls, and hiding it behind the
          Call tab would defeat its purpose. */}
      {!warningDismissed ? <ScamWarningBanner onDismiss={dismissWarning} /> : null}

      {showChats ? (
        chats.length === 0 ? (
          /* The system rows are inbox furniture, not conversations, so they still
             render with no chats — an empty inbox shows them plus this notice.
             `EmptyState` is deliberately not used: it hardcodes the old dark
             palette and would render as a black slab on this light screen. */
          <div className={`flex flex-col items-center gap-2 px-6 py-12 text-center ${CARD}`}>
            <MessageCircle className="h-8 w-8 text-[#A09AB0]" aria-hidden />
            <p className="text-sm font-bold text-white">No messages yet</p>
            <p className="max-w-xs text-xs leading-5 text-[#A09AB0]">
              Once you connect with someone, you can start a private chat from their profile.
            </p>
            <Link
              href="/discover"
              className={`mt-1 rounded-full bg-[#FF7A00] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#FF9500] ${FOCUS}`}
            >
              Discover people
            </Link>
          </div>
        ) : (
          /* ONE card, `divide-y` between rows. Giving each row its own card draws a
             border above and below every line, which reads as a stack of boxes
             rather than one list. */
          <ul className={`divide-y divide-white/[0.06] overflow-hidden ${CARD}`}>
            {rows.map((row) => (
              <InboxRowItem key={row.key} row={row} />
            ))}
          </ul>
        )
      ) : (
        /* THE CALL TAB'S EMPTY STATE. There is no call-log table in this schema, so
           rather than fake entries this states plainly that the feature has no
           history to show yet. */
        <div className={`flex flex-col items-center gap-2 px-6 py-12 text-center ${CARD}`}>
          <Phone className="h-8 w-8 text-[#A09AB0]" aria-hidden />
          <p className="text-sm font-bold text-white">No call history</p>
          <p className="max-w-xs text-xs leading-5 text-[#A09AB0]">
            Calls you make and receive will show up here.
          </p>
        </div>
      )}

      {/* SAFETY REMINDER at the foot of the chat list. The scam banner is
          dismissible, which means it can be gone; this line is not, so the warning
          never leaves the screen entirely. `aria-hidden` — the banner above
          already announced the message, and repeating it on every scroll is noise
          for a screen-reader user who has already heard it. */}
      {showChats && chats.length > 0 ? (
        <p
          aria-hidden
          className="flex items-center justify-center gap-1.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#A09AB0]"
        >
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Stay safe · never share your password
        </p>
      ) : null}
    </PageLock>
  );
}
