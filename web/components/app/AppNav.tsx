"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/landing/Icon";

export interface AppNavItem {
  href: string;
  label: string;
  icon: IconName;
}

export const appNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "discover" },
  { href: "/matches", label: "Matches", icon: "couple" },
  { href: "/messages", label: "Messages", icon: "chat" },
  { href: "/feed", label: "Feed", icon: "moments" },
  { href: "/notifications", label: "Alerts", icon: "bell" },
];

const secondaryItems: AppNavItem[] = [
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkClasses(active: boolean) {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
    active
      ? "bg-brand-100 text-brand-800"
      : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
  ].join(" ");
}

/** Desktop sidebar navigation (client component for active-route state). */
export function AppSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="App" className="flex flex-col gap-1">
      {appNavItems.map((item) => (
        <Link key={item.href} href={item.href} className={linkClasses(isActive(pathname, item.href))}>
          <Icon name={item.icon} className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
      <div className="my-3 border-t border-ink-200" role="presentation" />
      {secondaryItems.map((item) => (
        <Link key={item.href} href={item.href} className={linkClasses(isActive(pathname, item.href))}>
          <Icon name={item.icon} className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobile bottom navigation (thumb-friendly, icon + label). */
export function AppMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {appNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium",
                  active ? "text-brand-700" : "text-ink-600",
                ].join(" ")}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
