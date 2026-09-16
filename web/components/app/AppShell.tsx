import Link from "next/link";
import { AppSidebar, AppMobileNav } from "@/components/app/AppNav";
import { Avatar } from "@/components/app/Avatar";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/landing/Icon";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getCurrentSessionUser } from "@/lib/server/session";

/**
 * Authenticated-app shell — VISUAL LAYER ONLY.
 *
 * Chrome:
 *   • md and up (tablet / PC): one fixed left-hand deep-navy (#0F172A) rail.
 *   • below md (phone): a frosted navy top bar plus a strictly 3-item bottom
 *     bar whose "Menu" tab opens the secondary-navigation drawer.
 *
 * PRESERVATION CONSTRAINT: the session lookup below is unchanged and the demo
 * banner keeps its original /api/auth/logout target. Nothing in this file
 * touches route parameters, Supabase queries, auth handlers or API endpoints —
 * only layout, styling and which nav component is rendered where.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentSessionUser();
  const isDemo = user?.isDemo ?? false;
  const displayName = user?.email ? user.email.split("@")[0] : "User";
  const displayEmail = user?.email ?? "demo@couplescorner.app";

  return (
    <div className="app-canvas min-h-dvh text-foreground">
      {/* Demo banner — scrolls away so the sticky mobile top bar owns the top slot. */}
      {isDemo && (
        <div className="border-b border-amber-400/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100">
          <span className="font-semibold">Preview mode</span> — You&apos;re using a demo account.
          <Link href="/api/auth/logout" className="ml-2 font-medium text-white underline hover:text-amber-50">
            Sign in with a real account
          </Link>
        </div>
      )}

      {/* Mobile top bar — frosted navy with high-contrast white icons. */}
      <header className="app-top-bar sticky top-0 z-30 border-b md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" aria-label="Couples Corner home">
            <Logo as="span" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              aria-label="Alerts"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            >
              <Icon name="bell" className="h-5 w-5" />
            </Link>
            <Link
              href="/profile"
              aria-label="Your profile"
              className="rounded-full ring-2 ring-transparent transition hover:ring-brand-400 focus-visible:ring-brand-500"
            >
              <Avatar name={displayName} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex w-full md:pl-72">
        {/* Fixed left-hand navy rail (tablet + desktop) */}
        <aside className="app-sidebar fixed inset-y-0 left-0 z-40 hidden w-72 flex-col md:flex">
          <div className="px-5 pb-5 pt-6">
            <Link href="/dashboard" aria-label="Couples Corner home">
              <Logo as="span" />
            </Link>
          </div>

          <AppSidebar />

          <div className="border-t border-white/10 p-3">
            <div className={`flex items-center gap-3 rounded-xl border p-3 ${isDemo ? "border-amber-400/40 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
              <Avatar name={displayName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-300">{isDemo ? "Demo account" : displayEmail}</p>
              </div>
              {isDemo && (
                <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-950">
                  Demo
                </span>
              )}
            </div>
            <LogoutButton className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-12 lg:px-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <AppMobileNav displayName={displayName} displayEmail={displayEmail} isDemo={isDemo} />
    </div>
  );
}
