"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/landing/Icon";
import { Avatar } from "@/components/app/Avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";

/**
 * Couples Corner — app navigation (VISUAL SHELL ONLY).
 *
 * Layout contract:
 *   • Mobile (<768px): a 4-item bottom bar — Home | Moments | Messages | Me.
 *     "Moments" points at the community feed route (`/feed`). The "Menu"
 *     drawer (opened from the top bar) holds the secondary destinations
 *     (Messages, Home, Profile, Feed, Alerts, Subscription, Settings) + sign out.
 *   • Tablet + desktop (≥768px): one fixed left-hand navy (#0F172A) sidebar
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
  /** Extra path prefixes that also mark this entry active (Matches ⇄ Messages). */
  alsoActiveFor?: string[];
}

/** Sidebar group 1 — the core discovery loop. */
export const appNavItems: AppNavItem[] = [
  { href: "/", label: "Home", icon: "home", alsoActiveFor: ["/dashboard"] },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/likes", label: "Likes", icon: "flame" },
  { href: "/matches", label: "Matches", icon: "heart" },
  { href: "/messages", label: "Messages", icon: "chat" },
];

/** Sidebar group 2 — engagement + account. On mobile these live behind "Menu". */
export const appSecondaryNavItems: AppNavItem[] = [
  { href: "/feed", label: "Feed", icon: "moments" },
  { href: "/notifications", label: "Alerts", icon: "bell" },
  { href: "/subscription", label: "VIP Membership", icon: "crown" },
  { href: "/aristocracy", label: "Aristocracy", icon: "crown" },
  { href: "/task", label: "Task Center", icon: "check" },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** Destinations inside the mobile "Menu" drawer. */
export const menuDrawerItems: AppNavItem[] = [
  { href: "/messages", label: "Messages", icon: "chat" },
  { href: "/", label: "Home", icon: "home", alsoActiveFor: ["/dashboard"] },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/feed", label: "Feed", icon: "moments" },
  { href: "/notifications", label: "Alerts", icon: "bell" },
  { href: "/subscription", label: "VIP Membership", icon: "crown" },
  { href: "/aristocracy", label: "Aristocracy", icon: "crown" },
  { href: "/task", label: "Task Center", icon: "check" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, item: AppNavItem) {
  // Normalize trailing slashes first. The Home tab's href is "/", so a
  // `pathname` of "" or "/" must both resolve to it; without normalization the
  // root tab silently fails to light up and Home looks inert next to every
  // other tab.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  // Root ("/") must match only exactly. A naive `startsWith("/")` would make
  // Home look active on EVERY route, which is why the extra hrefs are
  // enumerated via alsoActiveFor rather than relying on prefix matching.
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
  /** Renders the unread-messages badge on this tab (Messages). */
  showBadge?: boolean;
}

/**
 * Mobile bottom-bar tabs — the exact 5-tab sequence: Home · Explore · Likes · Messages · Me.
 * Every href is an absolute app route verified to exist in `app/(app)/**`.
 */
const mobileTabs: MobileTab[] = [
  // "/" is the real home route; /dashboard now redirects to it, so both are
  // listed as active paths. Without this the Home tab never lights up.
  { href: "/", icon: "home", label: "Home", alsoActiveFor: ["/dashboard"] },
  { href: "/discover", icon: "compass", label: "Explore" },
  { href: "/likes", icon: "heart", label: "Likes" },
  { href: "/messages", icon: "chat", label: "Messages", showBadge: true },
  { href: "/profile", icon: "profile", label: "Me" },
];

/**
 * Shared tab styling: smooth rounded pill + soft glowing gradient active state
 * (image_25 reference). `nav-pill` / `nav-pill--active` come from globals.css;
 * `nav-pill--tab` keeps the icon-above-label column layout inside the pill.
 */
function mobileTabClasses(active: boolean) {
  return [
    "nav-pill nav-pill--tab",
    active ? "nav-pill--active font-semibold" : "",
    "flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 pt-2.5 pb-2",
    "text-[11px] font-medium leading-none whitespace-nowrap transition-colors",
    active ? "" : "text-slate-400 hover:text-orange-400",
  ]
    .filter(Boolean)
    .join(" ");
}

function ActiveDot({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span
      aria-hidden
      className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#FF5722]"
    />
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-label={`${count} unread messages`}
      className="absolute -top-0.5 right-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF5722] px-1 text-[10px] font-bold leading-4 text-white"
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

  return (
    <main
      className={[
        "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden",
        inActiveConversation
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
            "px-4 pb-20 pt-6 sm:px-6 md:px-8 md:pb-0 lg:px-10 xl:px-12",
      ].join(" ")}
    >
      <div className="mx-auto h-full w-full max-w-[88rem]">{children}</div>
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
    <div className="fixed inset-x-0 bottom-0 z-50 shrink-0 md:hidden">
      <AppMobileNav {...props} />
    </div>
  );
}

/**
 * Mobile chrome: a 5-item bottom bar (Home · Explore · Likes · Messages · Me) rendered as
 * a floating frosted-glass capsule with a purple-to-orange glow. Hidden from
 * `md` up, where the fixed sidebar takes over. The "Menu" drawer is retained
 * for secondary destinations.
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
        className="app-bottom-nav shrink-0 border-t border-slate-800/50 bg-slate-950/90 backdrop-blur-md"
      >
        <div className="mx-auto max-w-lg rounded-[28px] border border-white/10 bg-slate-900/85 p-2 backdrop-blur-xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,87,34,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <ul className="mx-auto grid max-w-md grid-cols-5">
            {mobileTabs.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href} className="relative">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={mobileTabClasses(active)}
                  >
                    <span className="relative flex items-center justify-center">
                      <Icon name={item.icon} className="h-5 w-5" />
                      {item.showBadge && unreadCount > 0 ? (
                        <UnreadBadge count={unreadCount} />
                      ) : null}
                      {active ? <ActiveDot active={active} /> : null}
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

