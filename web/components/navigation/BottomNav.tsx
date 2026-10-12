"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import { NavIcon, type NavIconName } from "@/components/app/NavIcons";

/**
 * Couples Corner — FLOATING ISLAND BOTTOM NAVIGATION (the "Midnight Slate &
 * Vibrant Orange" dock, reference design 1000022088_2.jpg).
 *
 * ── WHAT THIS REPLACED ──────────────────────────────────────────────────────
 * The old bar was hardcoded inside AppNav.tsx: a five-slot `grid-cols-5` row
 * of `.nav-pill` tabs (Explore | Moment | Feed | Messages | Me) plus an
 * unlayered `.nav-pill` / `.app-bottom-nav` CSS pair in globals.css that
 * outranked the component's own utilities. All of it — the tabs array, the
 * pill-class builder, the unread badge and the CSS rules — was removed. This
 * file is now the single source of truth for the mobile bar; the desktop
 * sidebar (AppSidebar) and the "Menu" drawer in AppNav.tsx are untouched.
 *
 * ── LAYOUT: STRICT SYMMETRICAL 5-COLUMN GRID (reference 1000022088_2.jpg) ──
 *   Slot 1 (far left):   Explore  (Compass → /discover)
 *   Slot 2 (inner left):  Moments  (Images → /moments)
 *   Slot 3 (centre):      Feed — elevated solid-orange circular action button
 *                         (bg-[#FF5722] + radial glow, → /feed)
 *   Slot 4 (inner right): Messages (MessageSquare → /messages, unread badge)
 *   Slot 5 (far right):   Profile  (User → /profile)
 *
 * The pill is ONE `grid grid-cols-5` row — five equal tracks, no hardcoded
 * offsets — so the centre button is geometrically centred on every screen
 * width and the bar scales automatically without breaking.
 *
 * ── THE 5REM INVARIANT (unchanged from the old bar — do not break it) ───────
 * The whole app reserves exactly 5rem (80px) plus the safe-area inset below
 * its content for this bar: AppMain's bottom padding, the deck dock's bottom
 * offset, MediaFeed's composer, SHEET_SHELL in components/ui/layers.ts, and
 * the per-page reserves all sit at that number. The bar's TOTAL stack
 * (lift + pill height, excluding the centre button's deliberate overhang)
 * must stay at or under 80px + the inset, or it covers them:
 *
 *   bottom-4                  (16px lift above the screen edge + safe-area pad)
 * + pill: border (2px)
 *       + py-1.5 chrome (12px)
 *       + h-11 tab row (44px)
 * = 74px + env(safe-area-inset-bottom)
 *
 * — 6px clear of the 5rem line. The centre button is h-14 (56px) and lifted
 * 6px inside the 44px row, which lands its top edge at 79px + the inset:
 * 5px PROUD of the pill (the elevated look) and still 1px inside the reserve,
 * so it never overlaps a neighbour's content. Grow the pill and you must grow
 * every one of those reserves with it.
 *
 * ── SAFE-AREA + POSITIONING: ONE FIXED ANCHOR, INSET COUNTED ONCE ──────────
 * This component owns the only `fixed` element in the chain (AppNav's
 * BottomNavRegion is a visibility guard, not a wrapper). The home-indicator
 * inset is carried HERE, as bottom padding on the fixed container — counted
 * ONCE; the pill adds no safe-area padding of its own, or the two env()
 * lookups stack into a doubled gap. `left-4 right-4` give the pill real side
 * gutters; `max-w-md mx-auto` caps and centres it on the same axis the deck
 * card centres on. `z-50` is Z.nav from components/ui/layers.ts and must stay
 * BELOW the sheets' z-[200]: a modal sheet paints over this dock and dims it.
 * `md:hidden` — from 768px up the fixed sidebar rail takes over. The
 * `app-bottom-nav` class is kept as a HIDE HOOK: the short-landscape block in
 * globals.css display:none's the dock on rotated phones, where the height
 * reserve would eat a fifth of the viewport. No unlayered CSS styles it any
 * more — the pill paints itself entirely with the utilities below.
 *
 * ── MOTION ─────────────────────────────────────────────────────────────────
 * Tap feedback is framer-motion (`whileTap` scale springs on each tab and on
 * the centre button), wrapped in MotionConfig reducedMotion="user" so members
 * with the OS reduced-motion setting get colour-only state changes. WhileTap
 * lives on an INNER motion.span rather than on the Link itself: the anchor
 * stays a plain next/link, which sidesteps the motion-component ref/typing
 * friction around client-routing links, and keeps the transform off the same
 * element as the centre button's elevation translate.
 *
 * ACTIVE STATE = VIBRANT ORANGE (#FF5722) — the app's existing action orange
 * (same value the unread badge and the Chat button already use). Resting
 * tabs are slate-400 (~7:1 on the dock's navy) and lift to white on hover;
 * the active tab paints its icon disc with a translucent #FF5722 wash, a
 * hairline ring and a soft glow, and its caption turns #FF5722 too (~5.6:1
 * on #0F172A — AA for the 11px label), so "you are here" never depends on
 * colour alone: the caption also changes to font-semibold and the disc gains
 * its ring, giving the active tab a distinct SHAPE as well as a hue.
 */

/** Tap animation shared by every control: a quick, damped spring. */
const TAP_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

/** One flanking tab (left or right group). */
interface DockTab {
  href: string;
  label: string;
  /** Line-art glyph from `NavIcons` (stroke-only set — see that file). */
  navIcon: NavIconName;
  /** Extra path prefixes that also mark this tab active. */
  alsoActiveFor?: string[];
  /** Renders the unread-messages badge on this tab (Messages only). */
  showBadge?: boolean;
}

/** LEFT GROUP — Explore leads because it is the core loop and the post-auth landing screen. */
const LEFT_TABS: DockTab[] = [
  { href: "/discover", label: "Explore", navIcon: "explore", alsoActiveFor: ["/explore"] },
  { href: "/moments", label: "Moments", navIcon: "moment" },
];

/** RIGHT GROUP — Messages keeps the real unread badge; Profile closes the bar. */
const RIGHT_TABS: DockTab[] = [
  { href: "/messages", label: "Messages", navIcon: "messages", showBadge: true },
  { href: "/profile", label: "Profile", navIcon: "me" },
];

/**
 * THE CENTRE ACTION — Feed. Solid vibrant-orange circle (bg-[#FF5722]) with a
 * soft radial glow, elevated proud of the pill's top edge.
 */
const CENTRE_ACTION = { href: "/feed", label: "Feed", navIcon: "feed" } as const;

/**
 * Tab active-state check, same rules the sidebar/drawer `isActive` uses:
 * exact match, or prefix match for nested screens — EXCEPT the root, which
 * must match exactly or its entry would light up everywhere.
 */
function isTabActive(pathname: string, tab: { href: string; alsoActiveFor?: string[] }) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return [tab.href, ...(tab.alsoActiveFor ?? [])].some(
    (href) => path === href || (href !== "/" && path.startsWith(`${href}/`))
  );
}

/**
 * Unread-messages badge on the Messages tab.
 *
 * THE BADGE NEEDS ROOM TO ESCAPE ITS PARENT: `right-0` on the icon box hung
 * the dot mostly OUTSIDE the glyph where it read as a smudge; the negative
 * insets here centre a single digit over the icon's top-right corner, which
 * is where a member looks for it. The icon disc is the positioned ancestor
 * with NO overflow clipping — `overflow-x: hidden` + `overflow-y: visible`
 * silently computes to auto and would clip the badge at its own edge.
 *
 * `bg-[#FF5722]` is the app's existing action orange (the dock's active tint
 * and the Chat button's gradient end), not a fourth accent, and the border is
 * Tailwind's slate-900 — exactly the pill's #0F172A fill, so the badge reads
 * as punched out of the dock rather than pasted on it.
 */
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-label={`${count} unread messages`}
      className="pointer-events-none absolute -right-1 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-slate-900 bg-[#FF5722] px-1 text-[10px] font-bold leading-none text-white"
    >
      {display}
    </span>
  );
}

/** One flanking tab: icon disc over an 11px caption, spring-scaled on tap. */
function DockTabItem({
  tab,
  pathname,
  unreadCount,
}: {
  tab: DockTab;
  pathname: string;
  unreadCount: number;
}) {
  const active = isTabActive(pathname, tab);
  return (
    <li className="flex min-w-0 items-center justify-center">
      <Link
        href={tab.href}
        aria-current={active ? "page" : undefined}
        aria-label={tab.label}
        className="block h-11 w-full max-w-[4.75rem] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70"
      >
        {/* INNER motion.span, not the Link: keeps next/link a plain anchor and
            keeps the tap transform off the centre button's elevation axis. */}
        <motion.span
          whileTap={{ scale: 0.88 }}
          transition={TAP_SPRING}
          className={[
            "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full transition-colors",
            active
              /* VIBRANT ORANGE #FF5722 — caption and disc both. */
              ? "text-[#FF5722]"
              : "text-slate-400 hover:text-white",
          ].join(" ")}
        >
          {/* The icon disc. Active paints the translucent orange wash, a
              hairline ring and a soft glow — the same "orange means you are
              here" language the rest of the app uses. It is also the unread
              badge's positioned ancestor, so NO overflow clipping here. */}
          <span
            className={[
              "relative flex h-7 w-7 items-center justify-center rounded-full transition",
              active
                ? "bg-[#FF5722]/15 ring-1 ring-[#FF5722]/45 shadow-[0_0_12px_rgba(255,87,34,0.35)]"
                : "",
            ].join(" ")}
          >
            <NavIcon name={tab.navIcon} size={20} className="text-current" />
            {tab.showBadge && unreadCount > 0 ? <UnreadBadge count={unreadCount} /> : null}
          </span>
          <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
        </motion.span>
      </Link>
    </li>
  );
}

/** THE CENTRE ACTION BUTTON — elevated solid-orange circle with radial glow. */
function CentreAction({ pathname }: { pathname: string }) {
  const active = isTabActive(pathname, CENTRE_ACTION);
  return (
    <li className="flex items-center justify-center px-1.5">
      {/* The elevation translate lives on the LINK (a plain element), never on
          the motion.span, so framer-motion's tap transform cannot override it. */}
      <Link
        href={CENTRE_ACTION.href}
        aria-label={CENTRE_ACTION.label}
        aria-current={active ? "page" : undefined}
        className="block -translate-y-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
      >
        <motion.span
          whileTap={{ scale: 0.92 }}
          transition={TAP_SPRING}
          className={[
            "flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5722] transition-shadow",
            active
              /* ON /feed the radial glow intensifies so the centre reads as
                 the lit control without changing the shared orange. */
              ? "shadow-[0_0_28px_rgba(255,87,34,0.65)]"
              : "shadow-[0_0_20px_rgba(255,87,34,0.4)]",
          ].join(" ")}
        >
          <NavIcon
            name={CENTRE_ACTION.navIcon}
            size={26}
            className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          />
        </motion.span>
      </Link>
    </li>
  );
}

/**
 * The floating island. Rendered (and hidden inside active conversations) by
 * `BottomNavRegion` in AppNav.tsx, which AppShell mounts on every route.
 */
export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  return (
    <MotionConfig reducedMotion="user">
      {/* THE SINGLE FIXED ANCHOR. Safe-area inset = this container's bottom
          padding (counted once, see the header note); bottom-2 is the graceful
          lift above the screen edge; z-50 must stay below the sheets' z-200. */}
      <nav
        aria-label="Primary"
        className="app-bottom-nav fixed bottom-2 left-4 right-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-md pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {/* THE PILL — one shared capsule: dark navy at 90% under a heavy
            backdrop frost, hairline slate border, deep float shadow. It has NO
            overflow clipping, which is what lets the centre button stand proud
            of its top edge and the unread badge escape its icon. */}
        <ul className="grid grid-cols-5 items-center rounded-full border border-slate-800/80 bg-[#0F172A]/90 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
          {LEFT_TABS.map((tab) => (
            <DockTabItem key={tab.href} tab={tab} pathname={pathname} unreadCount={unreadCount} />
          ))}
          <CentreAction pathname={pathname} />
          {RIGHT_TABS.map((tab) => (
            <DockTabItem key={tab.href} tab={tab} pathname={pathname} unreadCount={unreadCount} />
          ))}
        </ul>
      </nav>
    </MotionConfig>
  );
}
