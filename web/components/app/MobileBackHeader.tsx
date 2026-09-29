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
      {/* `sticky`, in normal flow — matching AppShell's `MobileHomeHeader`.

          THE INCONSISTENCY THIS FIXES: the dashboard header was `sticky` with
          `px-4 py-3`, while this feature header was `fixed` plus a hand-maintained
          `4rem` spacer. The same number in two files that must agree by hand is
          exactly how a page ends up with a phantom gap under its header, and
          the `fixed` variant also broke the 100dvh contract: a sticky header
          occupies flow space, so a full-height AppShell below it would overflow
          the document by the header's height.

          Being in flow fixes that, and dropping the spacer removes the second
          copy of the number entirely. Both headers now measure `min-h-16` with
          `px-4` and a single `border-b`, so every screen's chrome lines up. */}
      <header className="mobile-feature-header app-top-bar sticky top-0 z-40 shrink-0 border-b border-white/5 pt-[env(safe-area-inset-top)] md:hidden">
        <nav aria-label="Page navigation" className="flex min-h-16 items-center gap-3 px-4 py-2">
          <button type="button" onClick={goBack} aria-label="Go back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
          </button>
          <p className="min-w-0 flex-1 truncate text-base font-semibold text-white">{titles[segment] ?? "Couple’s Corner"}</p>
          <Link href={fallback} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white">Home</Link>
        </nav>
      </header>
      {/* No spacer, deliberately. The header above is `sticky` in normal flow,
          so it already occupies its own space and the page starts directly
          beneath it.

          The previous arrangement was `fixed` + a hand-maintained `4rem` spacer
          — the same number duplicated in two files that had to agree by hand,
          which is how a page ends up with a phantom gap under its header. Both
          headers are now `sticky` at the same `min-h-16` height, so there is no
          spacer to keep in step.

          `app-shell-header-spacer` is retained on a zero-height element ONLY
          because the landscape block in globals.css targets that class and
          hides it alongside the header. If the header is ever changed back to
          `fixed`, the spacer must come back with it. */}
      <div aria-hidden className="app-shell-header-spacer hidden" />
    </>
  );
}
