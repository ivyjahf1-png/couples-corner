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
  { href: "/admin/reports", label: "Reports", icon: "flag" },
  { href: "/admin/content", label: "Content", icon: "moments" },
  { href: "/admin/broadcast", label: "Broadcast", icon: "bell" },
  { href: "/admin/support", label: "Support", icon: "chat" },
  { href: "/admin/security", label: "Security", icon: "lock" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
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
              ? "bg-orange-600 text-white"
              : "text-slate-100 hover:bg-slate-800 hover:text-white",
          ].join(" ")}
        >
          <Icon name={item.icon} className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
