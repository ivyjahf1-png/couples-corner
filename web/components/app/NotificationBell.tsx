"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/landing/Icon";
import { demoActivity, demoNotificationViews } from "@/lib/demo/demo-data";

/**
 * Header notification bell — opens a dropdown that consolidates recent
 * activity and notices (previously two cards on the Home page). Unread
 * notices surface a brand dot on the bell; "View all" links to the full
 * /notifications page. Closes on outside click / Escape.
 */

type Entry = {
  id: string;
  icon: IconName;
  text: string;
  at: string;
  href: string;
  unread?: boolean;
};

const activityIcon: Record<string, IconName> = {
  message: "chat",
  connection: "couple",
};

function buildEntries(): Entry[] {
  const notices: Entry[] = demoNotificationViews.map((n) => ({
    id: `notice-${n.id}`,
    icon: n.kind === "message" ? "chat" : n.kind === "system" ? "bell" : "couple",
    text: n.text,
    at: n.at,
    href: n.href ?? "/notifications",
    unread: n.unread,
  }));
  const activities: Entry[] = demoActivity.map((a) => ({
    id: `activity-${a.id}`,
    icon: activityIcon[a.kind] ?? "sparkle",
    text: a.text,
    at: a.at,
    href: a.kind === "message" ? "/messages" : a.kind === "connection" ? "/matches" : "/feed",
  }));
  // Newest first (notices carry their own order already; activities follow).
  return [...notices, ...activities];
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const entries = buildEntries();
  const unreadCount = entries.filter((e) => e.unread).length;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className="nm-icon nm-raised nm-tone-blue relative h-11 w-11 text-white"
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-500" aria-hidden />
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Recent activity and notices"
          className="absolute right-0 top-11 z-[100] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0F172A] shadow-2xl shadow-black/40"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Activity & notices</p>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium text-brand-300 hover:underline">
              View all
            </Link>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={entry.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "flex items-start gap-3 px-4 py-3 transition hover:bg-white/5",
                    entry.unread ? "bg-brand-500/10" : "",
                  ].join(" ")}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
                    <Icon name={entry.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-100">{entry.text}</span>
                    <span className="block text-xs text-ink-400">{entry.at}</span>
                  </span>
                  {entry.unread ? (
                    <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}