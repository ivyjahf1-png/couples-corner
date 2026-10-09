"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/landing/Icon";
import { NavIcon, type NavIconName } from "@/components/app/NavIcons";
import { Avatar } from "@/components/app/Avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";

/**
 * Couples Corner — app navigation (VISUAL SHELL ONLY).
 *
 * Layout contract:
 *   — Mobile (<768px): a 5-item bottom bar — Explore | Moment | Likes |
 *     Messages | Me, in that order. Explore leads (see `mobileTabs` for why)
 *     and is also the post-auth landing screen. The "Menu" drawer (opened from
 *     the top bar) holds the secondary destinations + sign out.
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
 * Mobile — strictly 3-item bottom bar + "Menu" drawer
 * -------------------------------------------------------------------------- */

interface AppMobileNavProps {
  displayName: string;
  displayEmail: string;
  isDemo: boolean;
  unreadCount?: number;
}

/** One tab in the mobile bottom bar. */
interface MobileTab extends AppNavItem {
  /**
   * The line-art glyph for THIS tab, from `NavIcons`.
   *
   * Separate from `icon` on purpose. `icon` still feeds the desktop sidebar and
   * the "Menu" drawer, which keep the hand-drawn `Icon` set; the bottom bar uses
   * the stroke-only set. One union type per surface means neither is forced to
   * compromise, and changing a tab's nav glyph cannot silently change its
   * sidebar glyph.
   */
  navIcon: NavIconName;
  /** Renders the unread-messages badge on this tab (Messages). */
  showBadge?: boolean;
  /**
   * THE RAISED CENTRE BUTTON. `true` on the Feed tab only.
   *
   * It is a normal entry in this array and a normal link — it is NOT a floating
   * button layered over the bar. The reference shows a raised pill, not a separate
   * widget, and a `position: fixed` centre button is exactly the class of thing
   * that ends up overlapping the composer or sitting under the tab bar once a
   * safe-area inset appears. Raising it INSIDE the row keeps it on the same
   * baseline maths as its neighbours and lets it scroll with the bar.
   */
  raised?: boolean;
}

/**
/**
 * Mobile bottom-bar tabs - the exact 5-tab sequence:
 *   Explore - Moment - Feed (raised centre) - Messages - Me
 *
 * -- WHY FIVE TABS AGAIN -------------------------------------------------------
 * This bar previously carried four (Home - Moment - Chat - Me) after an earlier
 * request, and five before that (Explore - Moment - Likes - Messages - Me). The
 * reference this now matches has five, with a RAISED centre Feed button. That is
 * what is built here.
 *
 * The two changes worth understanding, because both are reversible by editing only
 * this array and the `grid-cols-5` below:
 *
 *   1. EXPLORE IS BACK as the first tab, pointing at `/discover` ? the product's core
 *      loop and the route a member lands on after signing in. It had been demoted to
 *      the drawer when the bar shrank to four.
 *
 *   2. FEED IS ITS OWN TAB (`/feed`) AND MOMENT IS ITS OWN TAB (`/moments`). These
 *      were ONE tab serving two very different surfaces: `/moments` redirected to
 *      `/feed`, which itself toggled between an immersive video player and a blog
 *      timeline. A member tapping "Moment" for videos could land on a blog with no
 *      indication that anything had been substituted. They are now genuinely
 *      separate routes with their own headers.

 * THE GRID BELOW MUST MATCH THIS LENGTH. `grid-cols-5` with six entries squeezes
 * every tab; four entries leave a dead gap. Change them together.

 * `showBadge` is on Messages only, and the count is the real `unreadCount` prop.
 */
const mobileTabs: MobileTab[] = [
  { href: "/discover", icon: "compass", navIcon: "explore", label: "Explore", alsoActiveFor: ["/explore"] },
  { href: "/moments", icon: "moments", navIcon: "moment", label: "Moment" },
  { href: "/feed", icon: "sparkle", navIcon: "feed", label: "Feed", raised: true },
  { href: "/messages", icon: "chat", navIcon: "messages", label: "Messages", showBadge: true },
  { href: "/profile", icon: "profile", navIcon: "me", label: "Me" },
];

/**
 * Shared tab styling: a rounded pill with an amber active state (the `nav-pill`
 * family comes from globals.css; `nav-pill--tab` keeps the icon-above-label
 * column layout inside the pill).
 *
 * The INACTIVE colour is light slate, not the `#94a3b8` the pill carried when the
 * bar was dark: an inactive tab has to recede against a light surface, and the
 * old mid-grey was the same value it had when the bar behind it was near-black.
 * Hover moves to amber so the affordance is still discoverable.
 */
/**
 * Shared tab styling.
 *
 * `raised` switches on the FEED tab''s centre-button treatment. See the comment
 * inside for why it is a separate branch and not a modifier on the amber pill.
 */
function mobileTabClasses(active: boolean, raised = false) {
    /* THE SELECTED TAB IS A CIRCULAR ACCENT, NOT A PILL FILL.

       The reference shows the highlighted slot as a filled CIRCLE rather than a
       rounded rectangle, so the resting pill is a circle that grows only when
       selected. `rounded-full` alone gives an ellipse as wide as the track; the
       fixed `h-11 w-11` on the inner span is what actually makes it round, and
       `min-w-0`/`px-0` stop the `whitespace-nowrap` "Messages" caption from
       stretching it back into an oval on a narrow phone.

       ACCENT IS BRAND ORANGE, matching the app's single accent. The previous
       `bg-white` fill was a leftover from the light theme: on this deep navy pill
       it read as five holes punched in the bar, and it competed with the content
       above rather than marking the current location.

       `raised` (the centre Feed tab) is NO LONGER a separate branch. It used to
       carry a permanent filled pill plus a `-mt-4` lift, which out-shouted its
       four neighbours at rest and read as a broken element once the lift was
       removed. Selection is now the ONLY thing that fills a tab, on every tab
       alike, so "you are here" is expressed the same way everywhere. The flag is
       kept in the signature because `mobileTabs` still sets it and callers pass
       it; it intentionally no longer changes the styling. */
    return [
      "nav-pill nav-pill--tab",
      /* THE ACTIVE CLASS IS WHAT RETINTS THE PILL. `.nav-pill` in globals.css is
         UNLAYERED CSS, so it beats Tailwind's layered utilities in the cascade —
         its resting `color` would otherwise paint every label in the muted base
         tone, orange fill or not. `.nav-pill--active` (same specificity, same
         origin) is the one rule allowed to override it, which is why the active
         state must carry the class rather than only the utility pair. */
      active ? "nav-pill--active" : "",
      "flex h-full w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-0 pt-2.5 pb-2 transition",
      "text-[11px] font-bold leading-none whitespace-nowrap",
      active
        ? "text-[#0F0C1B] shadow-[0_8px_20px_-6px_rgba(255,122,0,0.65)] transition-all duration-300"
          : "text-[#9B93AE] hover:bg-white/10 hover:text-white transition-all duration-300",
    ]
      .filter(Boolean)
      .join(" ");
  }

/* The active dot is GONE, deliberately.

   It was an orange disc at the bottom edge of a tab whose active state is already
   a full orange gradient pill with a glow. Orange-on-orange is invisible at
   best, and at worst it reads as a rendering artifact where the gradient is
   lightest — a smudge under the label of the very tab the member is on. The pill
   plus the `font-semibold` weight already carry "you are here" unambiguously;
   the dot was a third signal saying the same thing in a colour that cannot
   survive its own background.

   Removing it also means the active tab has no child positioned below the icon
   row, so the icon and label sit optically centred in the pill instead of being
   pushed up by an invisible element. */
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  return (
    /* THE BADGE NEEDS ROOM TO OVERFLOW ITS PARENT.

       Positioning it at `right-0` put the dot's right edge flush with the 20px
       icon box, so with a one-digit count ("5") the circle hung mostly OUTSIDE
       the glyph and read as a smudge beside the chat icon rather than a badge on
       it. Pulling it back with a negative inset centres the single digit over the
       icon's top-right corner, which is where a member looks for it.

       `-top-1.5` (not `-top-0.5`) is what makes it float clear ABOVE the icon: at
       half a step it overlapped the glyph's own top edge and looked pasted on.

       THE ANIMATED WRAPPER IS LOAD-BEARING. `overflow-x: hidden` + `overflow-y:
       visible` cannot be combined in CSS — the "visible" side silently computes
       to "auto", which would give this element a scroll container and clip the
       badge at its own edge. So the icon wrapper is the positioned ancestor with
       NO overflow at all, and the badge is a plain `absolute` inside it.

       `bg-[#FF5722]` is the app's existing action orange (same value as the Chat
       button's gradient end), not a new red, so the badge matches the rest of
       the yellow/orange theme rather than introducing a fourth accent. */
    <span
      aria-label={`${count} unread messages`}
      className="pointer-events-none absolute -right-1 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-slate-900 bg-[#FF5722] px-1 text-[10px] font-bold leading-none text-white"
    >
      {display}
    </span>
  );
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
 * drops them completely, so the chat page's own `h-full max-h-[100dvh]` column is not
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
            //
            // 7rem, NOT 5rem, SINCE THE BAR BECAME A FLOATING PILL. The reserve
            // must cover the pill's whole height PLUS the `mb-4` gap that lifts it
            // off the bottom edge: 16px margin + 8px padding + a 44px accent
            // circle with its caption + 8px padding is ~109px, and 5rem (80px)
            // stranded the last row behind it. 7rem (112px) clears it. The
            // gesture-bar inset is INSIDE the pill (`pb-[env(...)]`), so it is
            // added on top here exactly as before. The pages that reserve the bar
            // themselves (`pb-24` on the inbox and store, `pb-28` on the profile)
            // were already generous enough and are unchanged.
            "px-4 pb-[calc(7rem_+_env(safe-area-inset-bottom))] pt-6 sm:px-6 md:px-8 md:pb-0 lg:px-10 xl:px-12",
      ].join(" ")}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[88rem] flex-1 flex-col">{children}</div>
    </main>
  );
}

/**
 * Bottom tab navigation with route-aware visibility.
 *
 * The 5-tab bar is hidden inside an ACTIVE conversation
 * (`/messages/<conversationId>`) and reappears the moment the member taps back
 * to `/messages`. This is the standard dating-app pattern: a live chat is a
 * focused, single-task surface, and a persistent tab bar steals vertical space
 * from the thread and invites accidental navigation mid-conversation.
 *
 * The list route `/messages` itself keeps the bar - only a specific
 * conversation hides it.
 *
 * FIXED to the bottom of the viewport (was an in-flow `shrink-0` sibling).
 *
 * Why it was in-flow before, and what changed: the in-flow version reserved its
 * own height in the shell's flex column, so the content region never extended
 * under it. That works, but it means the bar's position is a function of the
 * content column above it - and when a page inside the region sets its own
 * height (the 100dvh conversation view, the fill-mode media feed) the two
 * disagree and the bar drifts. Pinning it removes that whole class of bug: the
 * bar is now anchored to the viewport and cannot be moved by content.
 *
 * THE TRADE-OFF, and the reason the padding below is NOT optional: a `fixed`
 * element leaves the flex flow, so <main> now grows to the FULL viewport and
 * page content scrolls *behind* the bar. That is precisely the "floating nav"
 * bug the in-flow layout was built to avoid. The fix is the compensating bottom
 * padding on AppMain, which is why the two changes in this commit must ship
 * together - do not revert one without the other.
 *
 * `/messages` (the list) keeps the bar; only a specific conversation hides it,
 * and the conversation page therefore takes NO compensating padding.
 */
export function BottomNavRegion(props: AppMobileNavProps) {
  const pathname = usePathname();

  // /messages/<id> -> hidden. /messages or anything else -> visible.
  const inActiveConversation = isActiveConversationPath(pathname);

  if (inActiveConversation) return null;

  return (
    // `Z.nav` is 50 and must stay BELOW `Z.sheet` (200): a modal sheet paints
    // over this bar and dims it, but the bar's links would otherwise still win
    // taps in the strip where the two overlap. See components/ui/layers.ts.
    <div className="fixed inset-x-0 bottom-0 z-50 shrink-0 md:hidden">
      <AppMobileNav {...props} />
    </div>
  );
}

/**
 * Mobile chrome: a 5-item bottom bar (Explore - Moment - Feed - Messages - Me)
 * rendered as FIVE SEPARATE PILLS - one independent card per tab, each with its
 * own solid muted-slate fill, margin, ring and shadow, laid out with a dark
 * gutter between neighbours. It is deliberately NOT one shared capsule, and
 * deliberately NOT bright white: a single background behind transparent tabs
 * merged them into one block, and five white slabs on the navy bar out-shouted
 * the content above. Hidden from `md` up, where the fixed sidebar takes over.
 * The "Menu" drawer holds every destination that is not a tab.
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
      {/* `fixed` on the region above pins this bar to the viewport, so it can no
          longer drift with the content column. Because it is out of flow, <main>
          runs the full height and this bar overlays it - AppMain carries the
          matching bottom padding so content is never hidden underneath. Do not
          convert either half back to in-flow without changing the other. */}
      <nav
        aria-label="Primary"
        /* THE FLOATING PILL. Not an edge-to-edge bar: `mx-4` pulls it in from both
           sides and `mb-4` lifts it off the bottom edge, so it reads as a card
           hovering over the content. `rounded-full` makes it a true pill.

           `pb-[env(safe-area-inset-bottom)]` is what puts the gesture-bar inset
           INSIDE the pill rather than below it — the home indicator is drawn over
           the pill's own bottom padding, so the icons keep a real clearance on a
           notched device instead of sitting under the system bar.

           `bg-[#0b0f19]/95` and `backdrop-blur-md` are restated here for readers,
           but they are NOT what paints the surface: `.app-bottom-nav` is UNLAYERED
           CSS and outranks this layered utility, so the authoritative values live
           in that rule in globals.css. Both places must be changed together. */
        className="app-bottom-nav pointer-events-auto mx-4 mb-4 w-[calc(100%-2rem)] max-w-md rounded-full border border-white/10 bg-[#0b0f19]/95 shadow-2xl backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        {/* NO SHARED CAPSULE - TRANSPARENT LAYOUT WRAPPER ONLY.

            This element used to paint ONE solid white rounded capsule (fill +
            hairline border + drop shadow) behind all five tabs. Because every
            resting tab is transparent, that single white slab is exactly what
            made the buttons "leak" into each other: there was no visible
            boundary between neighbours, so the row read as one merged block
            instead of five controls.

            All of that chrome is gone. The wrapper now contributes only its max
            width and gutters; the dark `.app-bottom-nav` strip shows through the
            `gap-1` on the list and around each pill, and every tab paints its
            OWN background on its `<li>` below. Do not reintroduce a fill here -
            this shared background is the thing the fix exists to remove. */}
        <div className="mx-auto max-w-lg p-2">
          {/* FIVE EQUAL TRACKS, NO GUTTER. `grid-cols-5` gives every tab exactly a
              fifth of the pill, which is what "evenly spaced" means here — each
              pill then fills its own track via `w-full` below, so the five
              controls are identical in size and the spaces between them are
              identical too.

              `gap-1` and each `<li>`'s `mx-1` are GONE. They were there to stop
              the old separate-card pills touching, but combined with `grid-cols-5`
              they left the row unevenly spaced: the pills did not fill their
              tracks, so the visual gaps did not match the arithmetic ones. With
              the pills now flush to their tracks the spacing is exact by
              construction, and there is no dark gutter inside the pill to betray
              the shared background.

              MUST match the length of `mobileTabs` (5). A stale count either
              squeezes four tabs into five tracks — a dead gap at one end — or
              stretches them across an empty fifth. */}
          <ul className="grid w-full grid-cols-5">
            {mobileTabs.map((item) => {
              const active = isActive(pathname, item);
              /* THE `<li>` IS A TRANSPARENT TRACK, NOT A CARD.

                 It used to paint its own opaque slate pill (`bg-[#241E44]` + ring +
                 shadow) so five separate cards read as five controls. That is the
                 opposite of the reference, which shows ONE floating pill with five
                 evenly spaced slots inside it. The fill therefore moves OFF this
                 element: it is now invisible, and the selected tab paints its own
                 accent circle inside it (see `mobileTabClasses`).

                 `flex items-stretch` makes the `<li>` as tall as its grid track so
                 the tab below can be `h-full`; `relative` stays the positioning
                 context for the unread badge, and there is still deliberately NO
                 `overflow-hidden` — the badge overflows its icon box and clipping
                 would cut it off. */
              return (
                <li
                  key={item.href}
                  className="relative flex h-full w-full items-stretch justify-center"
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={mobileTabClasses(active, item.raised)}
                  >
                    {/* THE BADGE'S POSITIONED ANCESTOR.

    `relative` with NO overflow clipping — that is what lets the badge escape
    upward past the icon and past the capsule's padding to sit over the chat
    glyph's top-right corner. See `UnreadBadge` for why the mixed-overflow trick
    is not available here.

    `w-6` is wider than the 20px icon on purpose: it is the positioning box that
    lets the badge sit slightly outside the glyph without shifting the icon. */}
                    {/* THE LINE-ART GLYPH, AND WHY ITS COLOUR IS PINNED.

    `NavIcon` is stroke-only and inherits `currentColor`, so the active state
    could simply be inherited from the pill. It is NOT: the pill's active text
    colour is a dark amber chosen for LABEL legibility, and inheriting that into
    the glyph produced a muddy brown mark rather than the bright accent the
    reference shows. So active pins to the brand orange and inactive pins to
    slate — explicitly both ways, because the inactive icon would otherwise
    inherit the pill's colour and lose its own contrast once the pill's
    background changes.

    Size is passed as a prop (20) rather than left to `h-5 w-5`, so the SVG box
    and the glyph stay in step. The RAISED Feed tab is given 18px: it sits in a
    filled pill whose label is bold, and a 20px stroke-only glyph beside that
    weight reads heavier than its neighbours. */}
                    {/* THE ICON'S CIRCULAR ACCENT — the highlighted centre button.

                        `h-11 w-11` + `rounded-full` is what makes the selected tab a
                        true CIRCLE: the track is far wider than it is tall, so
                        `rounded-full` on the tab alone would only ever produce a
                        wide ellipse. Fixing both dimensions here is the only way to
                        get a round highlight.

                        At rest the circle is transparent and the glyph sits on the
                        pill's own navy. Selected, it fills with the brand orange and
                        gains a glow, which is the single accent on the bar.

                        `relative` is kept as the badge's positioning context and
                        there is NO `overflow-hidden`: the unread badge escapes this
                        box to sit over the glyph's top-right corner. */}
                    <span
                      className={
                        active
                          ? "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF9500] to-[#FF7A00]"
                          : "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-transparent"
                      }
                    >
                      <NavIcon
                        name={item.navIcon}
                        size={20}
                        className={active ? "text-white" : "text-[#9B93AE]"}
                      />
                      {item.showBadge && unreadCount > 0 ? (
                        <UnreadBadge count={unreadCount} />
                      ) : null}
                    </span>
                    <span className="mt-1">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

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

            <nav aria-label="Menu" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
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

