"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/landing/Icon";
import { BottomNav } from "@/components/navigation/BottomNav";
import { Avatar } from "@/components/app/Avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";

/**
 * Couples Corner — app navigation (VISUAL SHELL ONLY).
 *
 * Layout contract:
 *   - Mobile (<768px): a floating-island bottom bar (see
 *     components/navigation/BottomNav.tsx): Explore | Moments on the left,
 *     an elevated orange Match / Game Hub action in the centre, then
 *     Messages | Profile on the right. Explore leads and is also the
 *     post-auth landing screen. The "Menu" drawer (opened from the top bar)
 *     holds the secondary destinations + sign out.
 *   — Tablet + desktop (=768px): one fixed left-hand navy (#0F172A) sidebar
 *     carrying the complete navigation.
 *
 * PRESERVATION CONSTRAINT: this module renders links and drawer state only.
 * No route, route parameter, Supabase query, auth handler or API endpoint is
 * read or modified here — every `href` below already existed before this
 * refactor (they are the same paths the old nav used).
 */

export interface AppNavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Extra path prefixes that also mark this entry active (Matches ? Messages). */
  alsoActiveFor?: string[];
}

/** Sidebar group 1 — the core loop, mirroring the mobile bar's order. */
export const appNavItems: AppNavItem[] = [
  { href: "/discover", label: "Explore", icon: "compass", alsoActiveFor: ["/explore"] },
  { href: "/feed", label: "Moment", icon: "moments" },
  { href: "/likes", label: "Likes", icon: "flame" },
  { href: "/matches", label: "Matches", icon: "heart" },
  { href: "/messages", label: "Messages", icon: "chat" },
];

/** Sidebar group 2 — engagement + account. On mobile these live behind "Menu". */
export const appSecondaryNavItems: AppNavItem[] = [
  // Go Live sits directly under Feed: both are "broadcast something to other
  // people", so grouping them is what a member expects, and it keeps the
  // feature one click away instead of buried in the profile or behind the "+"
  // sheet. It was previously reachable only by typing /live.
  { href: "/live", label: "Go Live", icon: "live" },
  // "/" is no longer a nav item anywhere, but the route still serves the
  // immersive feed for deep links and shares. It is listed here under its
  // former name so a member with the old bookmark has a way back to it.
  { href: "/", label: "Home (immersive feed)", icon: "home", alsoActiveFor: ["/dashboard"] },
  { href: "/notifications", label: "Alerts", icon: "bell" },
  { href: "/subscription", label: "VIP Membership", icon: "crown" },
  { href: "/aristocracy", label: "Aristocracy", icon: "crown" },
  { href: "/task", label: "Task Center", icon: "check" },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** Destinations inside the mobile "Menu" drawer. */
export const menuDrawerItems: AppNavItem[] = [
  // Explore and Likes lead the drawer BECAUSE they are no longer tabs. Explore is
  // the product's core loop and /likes is the member's inbound list; neither may
  // be reachable only by typing a URL. They are listed first so the drawer opens
  // on the destinations that just lost their tab, rather than burying the core
  // loop under live and alerts.
  { href: "/discover", label: "Explore", icon: "compass", alsoActiveFor: ["/explore"] },
  { href: "/likes", label: "Likes", icon: "flame" },
  // Mirrors the sidebar order — Go Live first in the engagement group, and
  // third overall so it is above the fold of the drawer.
  { href: "/live", label: "Go Live", icon: "live" },
  { href: "/messages", label: "Messages", icon: "chat" },
  // "/" stays reachable as the immersive feed for old bookmarks and deep links,
  // and for the same reason `/` is NOT the "Home" tab's only other home — it is
  // both, deliberately: the tab is the primary affordance, the drawer is the
  // safety net for a deep link that opens this surface directly.
  { href: "/", label: "Home (immersive feed)", icon: "home", alsoActiveFor: ["/dashboard"] },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/notifications", label: "Alerts", icon: "bell" },
  { href: "/subscription", label: "VIP Membership", icon: "crown" },
  { href: "/aristocracy", label: "Aristocracy", icon: "crown" },
  { href: "/task", label: "Task Center", icon: "check" },
  { href: "/feedback", label: "User feedback", icon: "chat" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, item: AppNavItem) {
  // Normalize trailing slashes first. "/" is still a real nav item (the drawer
  // and sidebar), so a `pathname` of "" or "/" must both resolve to it; without
  // normalization the root entry silently fails to light up.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  // Root ("/") must match only exactly. A naive `startsWith("/")` would make the
  // root entry look active on EVERY route, which is why the extra hrefs are
  // enumerated via alsoActiveFor rather than relying on prefix matching. This is
  // what keeps the drawer's "Home (immersive feed)" from lighting up while the
  // member is on /discover.
  return [item.href, ...(item.alsoActiveFor ?? [])].some(
    (href) => path === href || (href !== "/" && path.startsWith(`${href}/`))
  );
}

/* -------------------------------------------------------------------------- *
 * Tablet + desktop — fixed deep-navy rail
 * -------------------------------------------------------------------------- */

function SidebarLink({ item, active }: { item: AppNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-white/[0.08] text-white" : "text-ink-300 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-orange-500 transition-opacity",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
        ].join(" ")}
      />
      <Icon
        name={item.icon}
        className={[
          "h-5 w-5 shrink-0 transition-colors",
          active ? "text-orange-400" : "text-ink-400 group-hover:text-white",
        ].join(" ")}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Navigation list rendered inside the fixed sidebar rail (md and up). */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-2">
      <p className="nav-section-label">Discover</p>
      {appNavItems.map((item) => (
        <SidebarLink key={item.href} item={item} active={isActive(pathname, item)} />
      ))}

      <div className="nav-divider" role="presentation" />

      <p className="nav-section-label">Your corner</p>
      {appSecondaryNavItems.map((item) => (
        <SidebarLink key={item.href} item={item} active={isActive(pathname, item)} />
      ))}
    </nav>
  );
}

/* -------------------------------------------------------------------------- *
 * Mobile - floating-island bottom bar + "Menu" drawer
 * -------------------------------------------------------------------------- */

interface AppMobileNavProps {
  displayName: string;
  displayEmail: string;
  isDemo: boolean;
  unreadCount?: number;
}


/**
 * True for an ACTIVE conversation route (`/messages/<conversationId>`) and false
 * for the messages list itself (`/messages`). Single source of truth shared by
 * the tab-bar visibility check, the <main> padding check and the mobile back
 * header, so the three can never disagree about what "inside a chat" means.
 */
export function isActiveConversationPath(pathname: string | null): boolean {
  return Boolean(pathname) && pathname!.startsWith("/messages/") && pathname!.length > "/messages/".length;
}

/**
 * The single <main> scroll region of the app shell, with ROUTE-AWARE PADDING.
 *
 * Everywhere except an ACTIVE conversation (/messages/<conversationId>) the
 * region keeps its normal page gutters and top padding. Inside a conversation it
 * drops them completely, so the chat page's own `h-[100dvh]` column is not
 * squeezed or overflowed by shell padding - the thread, header and composer get
 * the raw dynamic viewport, edge to edge.
 *
 * Client component purely so it can read the pathname; it renders no data and
 * performs no mutation.
 */
export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inActiveConversation = isActiveConversationPath(pathname);

  /* FULL-BLEED SURFACES. The media feed is a 9:16 player that must occupy the
     entire viewport — every pixel of gutter is dead space the video should be
     filling. `<main>` normally carries `pt-6` and `px-4..xl:px-12` gutters for
     prose pages, and on this route those pushed the player down and left grey
     bands down both sides: exactly the "excessive empty space at the top" in
     the screenshot. The conversation view already opts out for the same reason;
     the feed now joins it.

     `/discover` is here for the same reason and a different reason: the swipe
     deck must show the card AND its action dock at once, and the gutters plus
     `pt-6` were enough on their own to push the dock below the fold on a phone.
     The page reserves the bottom-nav height itself, so dropping the `pb-20`
     here does not strand anything behind the fixed bar.

     Identified by path rather than by prop because `<main>` is a Server
     Component's child and has no access to the feed's own state. Both routes
     are the same player (`ImmersiveFeed`), so matching on the two paths is
     enough and cannot drift out of sync with the feed's internals. */
  /* `/profile/<uid>` is IMMERSIVE, like the feed and the discover deck: a
     full-bleed photo header with the dark profile sheet overlapping it edge to
     edge. `<main>`'s `px-4` and `pt-6` would frame that photo inside a gutter —
     grey bands down both sides, which is the one thing an immersive header must
     not have. The page reserves the tab bar's height itself (see the fixed
     Chat/Follow action bar in `UserProfileView`), so dropping the `pb-20`
     compensation here strands nothing.

     Matched with `startsWith` rather than `===` because this is a DYNAMIC route:
     `/profile` itself is the own-profile page and keeps its normal document
     gutters, so an exact match would opt the wrong screen in or out. */
  /* THE FULL-BLEED LIST IS ABOUT THE PAGE'S OWN BACKGROUND REACHING THE BEZEL,
     not about content width.

     `<main>` carries `px-4` for prose pages. When a page paints its own full-bleed
     background inside that padding, the shell's background shows down both sides ?
     which is exactly the "dark gutter" framing: /messages painted a light inbox
     inset 16px inside a dark shell, and /profile painted its dark canvas inset
     inside the same. The padding is not wrong on its own; it is wrong for a route
     that owns the background.

     These routes therefore take `p-0` and MUST reserve the fixed tab bar's height
     themselves. Every one of them already does (`pb-24` on the inbox and the store,
     `pb-28` on the profile), so nothing is stranded behind the bar.

     `/messages` and `/profile` are matched EXACTLY on purpose: `/profile/<uid>` is a
     different, already-full-bleed surface, and `/profile` is the member's own hub. */
  const isFullBleedSurface =
    pathname === "/feed" ||
    pathname === "/moments" ||
    pathname === "/" ||
    pathname === "/discover" ||
    pathname === "/messages" ||
    pathname === "/profile" ||
    pathname === "/store" ||
    pathname?.startsWith("/profile/");

  return (
    <main
      /* `app-main` is the hook the landscape block in globals.css targets to
         drop the gutters and the `pb-20` that compensated for the bottom
         capsule. In a short landscape viewport that padding is what was pushing
         the bottom fifth of the feed off-screen. See globals.css LANDSCAPE. */
      className={[
        "app-main flex min-h-0 min-w-0 flex-1 flex-col",
        /* -- PAGE-LEVEL SCROLL IS FORBIDDEN ON LOCKED SURFACES ------------------
           These routes are self-contained viewport-locked screens: each owns its
           own single inner scroll region (the community panel's `overflow-y-auto`,
           the media feed's snap scroller, the discover deck's card region), and
           each already reserves the fixed tab bar's height itself.

           So a scrollbar HERE is never intended scrolling — it means a child
           overflowed its box, and the member's only symptom is the whole screen
           sliding under the header and nav. That is the "messy scrolling" this
           locks down: `overflow-hidden` makes containment STRUCTURAL rather than
           incidental, so a future overflow bug fails visibly inside the child that
           caused it instead of silently scrolling the page.

           Everywhere else this region keeps `overflow-y-auto`, because ordinary
           pages genuinely scroll here. `/messages` is deliberately NOT in this
           list — it renders through `PageLock`, whose body is its own
           `flex-1 min-h-0 overflow-y-auto`.

           `overflow-x-hidden` is retained unconditionally: nothing in this app
           scrolls horizontally, and a stray wide child must never produce a
           sideways page scroll. */
        inActiveConversation || (isFullBleedSurface && !pathname?.startsWith("/profile/"))
          ? "overflow-hidden"
          /* -webkit-overflow-scrolling: touch is the iOS momentum-scroll flag.
             Without it, Safari scrolls this region with the OLD non-composited
             path: no momentum, no rubber-band, and — worst — the entire page
             behind it janks instead of the region itself, which is what "this
             won't scroll smoothly on my phone" always turns out to be. It cannot
             be expressed as a real Tailwind utility because it is a vendor-
             prefixed property, so it is written as an arbitrary property. */
          : "overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y]",
        inActiveConversation || isFullBleedSurface
          ? "p-0"
          : // `pb-20` is the COMPENSATING PADDING for the now-`fixed` bottom bar.
            // Because that bar left the flex flow, <main> spans the full viewport
            // and the bar overlays its last 5rem; without this, the end of every
            // page (and the feed's bottom composer) would sit permanently behind
            // the navigation. `md:pb-0` drops it at tablet and up, where the bar
            // is `md:hidden` and the sidebar rail takes over. The inner wrapper
            // is `h-full`, so it measures the padded box and full-height pages
            // (the media feed) shrink to clear the bar rather than hiding under
            // it. The conversation route takes `p-0`: its bar is hidden entirely,
            // so any padding here would be dead space.
            "px-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-6 sm:px-6 md:px-8 md:pb-0 lg:px-10 xl:px-12",
      ].join(" ")}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[88rem] flex-1 flex-col">{children}</div>
    </main>
  );
}

/**
 * Bottom navigation with route-aware visibility.
 *
 * The floating-island bar (components/navigation/BottomNav.tsx) is hidden
 * inside an ACTIVE conversation (`/messages/<conversationId>`) and
 * reappears the moment the member taps back to `/messages`. This is the
 * standard dating-app pattern: a live chat is a focused, single-task
 * surface, and a persistent tab bar steals vertical space from the thread
 * and invites accidental navigation mid-conversation.
 *
 * The list route `/messages` itself keeps the bar - only a specific
 * conversation hides it.
 *
 * VISIBILITY GUARD ONLY, NOT A WRAPPER. This function used to be the bar's
 * fixed anchor (and, before that, an in-flow sibling reserving height in
 * the shell's flex column), each carrying its own copies of the dock's
 * geometry. The fixed positioning, the 5rem height budget, the safe-area
 * inset and the z-index now all live inside BottomNav.tsx itself - counted
 * once, there. This guard simply declines to render the bar where a chat
 * must not be interrupted. To move the dock, move it THERE; do not re-add
 * positioning here or two fixed elements will fight.
 */
export function BottomNavRegion(props: AppMobileNavProps) {
  const pathname = usePathname();

  // /messages/<id> -> hidden. /messages or anything else -> visible.
  const inActiveConversation = isActiveConversationPath(pathname);

  if (inActiveConversation) return null;

  return <AppMobileNav {...props} />;
}

/**
 * Mobile chrome: the floating-island bottom bar (see
 * components/navigation/BottomNav.tsx) plus the "Menu" drawer below.
 * Re-keyed per route so open-drawer state resets on navigation. Hidden from
 * `md` up, where the fixed sidebar takes over. The "Menu" drawer holds every
 * destination that is not a tab.
 */
export function AppMobileNav(props: AppMobileNavProps) {
  const pathname = usePathname();
  // Reset only the navigation UI when the route changes.
  return <MobileNavigation key={pathname} {...props} />;
}

function MobileNavigation({
  displayName,
  displayEmail,
  isDemo,
  unreadCount = 0,
}: AppMobileNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // While open: lock background scroll and support the Escape key.
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      {/* FLOATING ISLAND BAR - the "Midnight Slate & Orange" dock. The single
          fixed anchor, the safe-area inset (counted once, on the fixed
          container), the pill chrome (dark navy at 90% under a backdrop
          frost, hairline slate border, shadow-2xl), the 2 tabs + elevated
          orange Match / Game Hub action + 2 tabs layout, the unread badge
          and the framer-motion whileTap tap springs ALL live in
          components/navigation/BottomNav.tsx. The old inline five-tab bar,
          its MobileTab / mobileTabClasses data and the UnreadBadge helper
          were removed from this file along with it. Because the dock is
          fixed and out of flow, <main> runs the full viewport height and
          the dock overlays it - AppMain's matching bottom padding (and the
          other 5rem reserves across the app) keep page content from hiding
          underneath. */}
      <BottomNav unreadCount={unreadCount} />

      {menuOpen ? (
        <div
          className="fixed inset-0 z-[100] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu and profile"
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="app-drawer-scrim absolute inset-0 h-full w-full cursor-default"
          />

          <div className="app-drawer absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col border-l shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Avatar name={displayName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-300">
                  {isDemo ? "Demo account" : displayEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            {isDemo ? (
              <p className="mx-5 mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Preview mode — demo accounts can&apos;t change production data.
              </p>
            ) : null}

            <nav aria-label="Menu" className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="flex flex-col gap-1">
                {menuDrawerItems.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={[
                          "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                          active
                            ? "bg-white/10 text-white"
                            : "text-ink-200 hover:bg-white/5 hover:text-white",
                        ].join(" ")}
                      >
                        <Icon
                          name={item.icon}
                          className={[
                            "h-5 w-5 shrink-0",
                            active ? "text-orange-400" : "text-ink-400 group-hover:text-white",
                          ].join(" ")}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        <Icon name="chevron" className="h-4 w-4 text-ink-500" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t border-white/10 p-4">
              <LogoutButton className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

