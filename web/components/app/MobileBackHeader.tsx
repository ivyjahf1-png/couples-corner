"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isActiveConversationPath } from "@/components/app/AppNav";

const titles: Record<string, string> = {
  discover: "Discover", explore: "Explore", matches: "Matches", messages: "Messages",
  notifications: "Alerts", feed: "Community feed", profile: "Profile", settings: "Settings",
  subscription: "VIP Membership", onboarding: "Get started", couple: "Your couple",
  u: "Member profile", chat: "Chat", community: "Community", events: "Events",
  insights: "Insights", about: "About us", login: "Sign in", register: "Create account",
  "forgot-password": "Reset password", "verify-email": "Verify email", legal: "Legal",
  admin: "Administration", auth: "Account",
};

/** Keep the existing dashboard chrome without duplicating feature-page headers. */
export function MobileHomeHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname !== "/dashboard") return null;
  return <header className="app-top-bar sticky top-0 z-30 border-b border-white/5 border-white/5 pt-[env(safe-area-inset-top)] md:hidden">{children}</header>;
}

/** Shared mobile-only recovery navigation; never depends on session or database data. */
export function MobileBackHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const segment = pathname?.split("/").filter(Boolean)[0] ?? "";
  if (!segment || pathname === "/dashboard") return null;

  // Inside an ACTIVE conversation the chat's own ChatHeader is the visible
  // header: it already carries the back arrow, avatar, name/status and call
  // buttons, and it is laid out inside the page's 100dvh column. Rendering the
  // global header here as well would stack two bars, and its fixed positioning
  // plus 4rem spacer would push that 100dvh column past the viewport.
  if (isActiveConversationPath(pathname)) return null;

  const isAppPage = ["discover", "explore", "matches", "messages", "notifications", "feed", "profile", "settings", "subscription", "onboarding", "couple", "u", "chat"].includes(segment);
  const fallback = (isAppPage ? "/dashboard" : "/") as never;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.replace(fallback);
  }

  return (
    <>
      {/* `fixed` + a matching spacer rather than `sticky` in normal flow.
          A sticky header still occupies flow space, so a 100dvh AppShell
          rendered below it would overflow the document by the header's height
          and reintroduce window-level scrolling. Taking the header out of flow
          and reserving the space with a sibling spacer keeps every page at
          exactly 100dvh. */}
      <header className="mobile-feature-header app-top-bar fixed inset-x-0 top-0 z-40 shrink-0 border-b border-white/5 pt-[env(safe-area-inset-top)] md:hidden">
        <nav aria-label="Page navigation" className="flex min-h-16 items-center gap-3 px-4 py-2">
          <button type="button" onClick={goBack} aria-label="Go back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
          </button>
          <p className="min-w-0 flex-1 truncate text-base font-semibold text-white">{titles[segment] ?? "Couple’s Corner"}</p>
          <Link href={fallback} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white">Home</Link>
        </nav>
      </header>
      {/* Spacer reserving the fixed header's flow space (mobile only). */}
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-top))] shrink-0 md:hidden" />
    </>
  );
}
