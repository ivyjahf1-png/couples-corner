import Link from "next/link";
import { AppSidebar, AppMobileNav } from "@/components/app/AppNav";
import { Avatar } from "@/components/app/Avatar";
import { Logo } from "@/components/ui/Logo";
import { getCurrentSessionUser } from "@/lib/server/session";

/**
 * Authenticated-app shell: desktop sidebar + mobile top bar and bottom nav.
 * Layout only — pages render inside <main>.
 *
 * Shows a prominent demo badge when the current user is a demo/preview account.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentSessionUser();
  const isDemo = user?.isDemo ?? false;
  const displayName = user?.email ? user.email.split("@")[0] : "User";
  const displayEmail = user?.email ?? "demo@couplescorner.app";

  return (
    <div className="min-h-dvh bg-background">
      {/* Demo banner */}
      {isDemo && (
        <div className="sticky top-0 z-50 border-b border-warning-300 bg-warning-100 px-4 py-2 text-center text-sm text-warning-800">
          <span className="font-semibold">Preview mode</span> — You&apos;re using a demo account.
          <Link href="/api/auth/logout" className="ml-2 font-medium underline hover:text-warning-900">
            Sign in with a real account
          </Link>
        </div>
      )}

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-background/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" aria-label="Couples Corner home">
            <Logo as="span" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              aria-label="Your profile"
              className="rounded-full ring-2 ring-transparent transition hover:ring-brand-300 focus-visible:ring-brand-500"
            >
              <Avatar name={displayName} size="sm" />
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-surface text-ink-700 hover:bg-ink-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3 L12 6 M12 18 L12 21 M3 12 L6 12 M18 12 L21 12 M5.6 5.6 L7.7 7.7 M16.3 16.3 L18.4 18.4 M18.4 5.6 L16.3 7.7 M7.7 16.3 L5.6 18.4" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-ink-200 bg-surface px-4 py-6 lg:flex">
          <Link href="/dashboard" className="mb-8 px-2">
            <Logo as="span" />
          </Link>
          <AppSidebar />
          <div className={`mt-auto flex items-center gap-3 rounded-xl border p-3 ${isDemo ? "border-warning-300 bg-warning-50" : "border-ink-200 bg-surface-muted"}`}>
            <Avatar name={displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{displayName}</p>
              <p className="truncate text-xs text-ink-600">{isDemo ? "Demo account" : displayEmail}</p>
            </div>
            {isDemo && (
              <span className="shrink-0 rounded-full bg-warning-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning-800">
                Demo
              </span>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-12">
          {children}
        </main>
      </div>

      <AppMobileNav />
    </div>
  );
}
