import { MobileHomeHeader } from "@/components/app/MobileBackHeader";
import Link from "next/link";
import { AppSidebar, BottomNavRegion } from "@/components/app/AppNav";
import { Avatar } from "@/components/app/Avatar";
import { Logo } from "@/components/ui/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getCurrentSessionUser } from "@/lib/server/session";
import { getUnreadCountAction } from "@/lib/actions/messaging";
import { NotificationBell } from "@/components/app/NotificationBell";

/**
 * Authenticated-app shell — VISUAL LAYER ONLY.
 *
 * Chrome:
 *   • md and up (tablet / PC): one fixed left-hand deep-navy (#0F172A) rail.
 *   • below md (phone): a frosted navy top bar plus a 4-tab floating glass
 *     capsule (Home · Moments · Messages · Me). The "Menu" drawer is retained
 *     behind the app shell for secondary destinations.
 *
 * PRESERVATION CONSTRAINT: the session lookup below is unchanged and the demo
 * banner keeps its original /api/auth/logout target. Nothing in this file
 * touches route parameters, Supabase queries, auth handlers or API endpoints —
 * only layout, styling and which nav component is rendered where.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  // Parallel fetch — session and unread count resolve together instead of
  // serially, so the shell paints as soon as the session is known.
  const [user, unreadCount] = await Promise.all([
    getCurrentSessionUser(),
    getUnreadCountAction(),
  ]);
  const isDemo = user?.isDemo ?? false;
  const displayName = user?.email ? user.email.split("@")[0] : "User";
  const displayEmail = user?.email ?? "demo@couplescorner.app";

  return (
    <div className="app-canvas relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 select-none text-foreground">
      {/* Demo banner — shrink-0 so it never collapses or scrolls away. */}
      {isDemo && (
        <div className="shrink-0 border-b border-amber-400/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100">
          <span className="font-semibold">Preview mode</span> — You&apos;re using a demo account.
          <Link href="/api/auth/logout" className="ml-2 font-medium text-white underline hover:text-amber-50">
            Sign in with a real account
          </Link>
        </div>
      )}

      {/* Mobile top bar — frosted navy with high-contrast white icons. */}
      <div className="shrink-0">
        <MobileHomeHeader>
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/dashboard" aria-label="Couples Corner home">
              <Logo as="span" />
            </Link>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link
                href="/profile"
                aria-label="Your profile"
                className="rounded-full ring-2 ring-transparent transition hover:ring-brand-400 focus-visible:ring-brand-500"
              >
                <Avatar name={displayName} size="sm" />
              </Link>
            </div>
          </div>
        </MobileHomeHeader>
      </div>

      {/* Middle segment: sidebar (md+) + the single content scroll region. */}
      <div className="flex min-h-0 w-full flex-1">
        {/* Left-hand navy rail (tablet + desktop).
            In-flow rather than `fixed`: the shell owns the viewport, so a
            fixed child would escape the flex column and reintroduce the
            document-level scrolling this layout exists to prevent. */}
        <aside className="app-sidebar hidden w-72 shrink-0 flex-col overflow-hidden md:flex">
          <div className="shrink-0 px-5 pb-5 pt-6">
            <Link href="/dashboard" aria-label="Couples Corner home">
              <Logo as="span" />
            </Link>
          </div>

          <AppSidebar />

          <div className="shrink-0 border-t border-white/10 p-3">
            <div className={`flex items-center gap-3 rounded-xl border p-3 ${isDemo ? "border-amber-400/40 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
              <Avatar name={displayName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-300">{isDemo ? "Demo account" : displayEmail}</p>
              </div>
              {isDemo && (
                <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold uppercase text-slate-950">
                  Demo
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* flex-1 + min-h-0 + overflow-y-auto: the ONLY vertical scroll region
            in the app. The bottom nav is an in-flow sibling below this, so
            content is never hidden behind it and needs no compensating padding. */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-6 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          <div className="mx-auto h-full w-full max-w-[88rem]">{children}</div>
        </main>
      </div>

      {/* Bottom tab navigation. Hidden automatically inside an active
          conversation (see BottomNavRegion); when visible it is an in-flow
          shrink-0 segment directly beneath the content region. */}
      <BottomNavRegion
        displayName={displayName}
        displayEmail={displayEmail}
        isDemo={isDemo}
        unreadCount={unreadCount}
      />
    </div>
  );
}
