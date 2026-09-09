"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/landing/Icon";

interface AdminNavItem {
  href: string;
  label: string;
  icon: IconName;
}

const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: "home" },
  { href: "/admin/users", label: "Users", icon: "profile" },
  { href: "/admin/content", label: "Content", icon: "moments" },
  { href: "/admin/reports", label: "Reports", icon: "flag" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {adminNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={[
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            isActive(pathname, item.href)
              ? "bg-brand-100 text-brand-800"
              : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
          ].join(" ")}
        >
          <Icon name={item.icon} className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
