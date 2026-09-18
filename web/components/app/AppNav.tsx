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
 *   • Mobile (<768px): a strictly 3-item bottom bar —
 *       Discover | Matches & Messages | Menu.
 *     "Menu" opens a right-hand drawer holding the secondary destinations
 *     (Home, Profile, Feed, Alerts, Subscription, Settings) + sign out.
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
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/matches", label: "Matches", icon: "heart" },
  { href: "/messages", label: "Messages", icon: "chat" },
];

/** Sidebar group 2 — engagement + account. On mobile these live behind "Menu". */
export const appSecondaryNavItems: AppNavItem[] = [
  { href: "/feed", label: "Feed", icon: "moments" },
  { href: "/notifications", label: "Alerts", icon: "bell" },
  { href: "/subscription", label: "Subscription", icon: "crown" },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** Mobile bottom bar — two links + the "Menu" button = exactly 3 items. */
export const mobilePrimaryNavItems: AppNavItem[] = [
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/matches", label: "Matches & Messages", icon: "heart", alsoActiveFor: ["/messages"] },
];

/** Destinations inside the mobile "Menu" drawer. */
export const menuDrawerItems: AppNavItem[] = [
  { href: "/messages", label: "Messages", icon: "chat" },
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/feed", label: "Feed", icon: "moments" },
  { href: "/notifications", label: "Alerts", icon: "bell" },
  { href: "/subscription", label: "Subscription", icon: "crown" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, item: AppNavItem) {
  return [item.href, ...(item.alsoActiveFor ?? [])].some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
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
        active ? "bg-white/[0.08] text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
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
          active ? "text-orange-400" : "text-slate-400 group-hover:text-white",
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
}

/** Shared tab styling: big, crisp icons over the navy bar. */
function mobileTabClasses(active: boolean) {
  return [
    "flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 pt-2.5 pb-2",
    "text-[11px] font-medium leading-none whitespace-nowrap transition-colors",
    active ? "text-orange-300" : "text-slate-300 hover:text-white",
  ].join(" ");
}

function ActiveDot({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span
      aria-hidden
      className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-orange-400"
    />
  );
}

/**
 * Mobile chrome: the 3-item bottom bar (Discover · Matches & Messages · Menu)
 * plus the drawer the "Menu" tab opens. Hidden from `md` up, where the fixed
 * sidebar takes over.
 */
export function AppMobileNav(props: AppMobileNavProps) {
  const pathname = usePathname();
  // Reset only the navigation UI when the route changes.
  return <MobileNavigation key={pathname} {...props} />;
}

function MobileNavigation({ displayName, displayEmail, isDemo }: AppMobileNavProps) {
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

  const menuTabActive = menuDrawerItems.some((item) => isActive(pathname, item));

  return (
    <>
      <nav
        aria-label="Primary"
        className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-3">
          {mobilePrimaryNavItems.map((item) => {
            const active = isActive(pathname, item);
            // The middle tab is the shared Matches + Messages surface.
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.href === "/matches" ? "Matches & Messages" : item.label}
                  className={mobileTabClasses(active)}
                >
                  <span className="relative flex items-center justify-center">
                    <Icon name={item.icon} className="h-6 w-6" />
                    <ActiveDot active={active} />
                  </span>
                  <span className="mt-1">{item.label}</span>
                </Link>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              aria-label="Menu and profile"
              className={mobileTabClasses(menuTabActive)}
            >
              <span className="relative flex items-center justify-center">
                <Icon name="menu" className="h-6 w-6" />
                <ActiveDot active={menuTabActive} />
              </span>
              <span className="mt-1">Menu</span>
            </button>
          </li>
        </ul>
      </nav>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
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
                            : "text-slate-200 hover:bg-white/5 hover:text-white",
                        ].join(" ")}
                      >
                        <Icon
                          name={item.icon}
                          className={[
                            "h-5 w-5 shrink-0",
                            active ? "text-orange-400" : "text-slate-400 group-hover:text-white",
                          ].join(" ")}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        <Icon name="chevron" className="h-4 w-4 text-slate-500" />
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

