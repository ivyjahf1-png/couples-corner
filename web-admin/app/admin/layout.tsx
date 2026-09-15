import type { ReactNode } from "react";
import { requireAdminDev, isDevAdminBypassActive } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isNavigationSignal } from "@/lib/utils/errors";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/ui/Logo";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

/** Admin / moderation zone shell with dark orange theme. */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabaseConfigured = getSupabaseServerClient() !== null;
  const devBypassActive = isDevAdminBypassActive();

  // Pre-flight: Supabase not configured and not in dev mode → show placeholder.
  if (!supabaseConfigured && !devBypassActive) {
    return <AdminUnavailablePlaceholder />;
  }

  let adminUser: Awaited<ReturnType<typeof requireAdminDev>> | null = null;
  let supabaseUnavailable = false;
  try {
    adminUser = await requireAdminDev();
  } catch (err: unknown) {
    // Next.js navigation signals (redirect / notFound) must always propagate —
    // never convert them into a placeholder screen or they cause infinite loops.
    if (isNavigationSignal(err)) throw err;

    // Any other error (Supabase not configured, DB error, etc.) -> show placeholder.
    supabaseUnavailable = true;
  }

  // In production, if Supabase is unreachable, show placeholder instead of crashing.
  if (supabaseUnavailable && process.env.NODE_ENV === "production") {
    return <AdminUnavailablePlaceholder />;
  }

  return (
    <div className="min-h-dvh bg-purple-950 admin-dark">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-orange-500/20 bg-purple-900 px-4 py-6 lg:flex">
          <div className="mb-8 px-2">
            <Logo as="span" />
          </div>
          <AdminNav />
          <div className="mt-auto border-t border-orange-500/20 p-3">
            <div className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-purple-800 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-600 text-sm font-bold text-white">
                {adminUser ? adminUser.email.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {adminUser ? adminUser.email : "Administrator"}
                </p>
                <p className="truncate text-xs text-orange-300">Administrator</p>
              </div>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <section data-zone="admin" className="flex flex-1 flex-col">
            <ErrorBoundary feature="Admin Panel">
              {children}
            </ErrorBoundary>
          </section>
        </main>
      </div>
    </div>
  );
}

/** Placeholder shown when Supabase is not configured or unreachable. */
function AdminUnavailablePlaceholder() {
  return (
    <div className="min-h-dvh bg-purple-950 admin-dark">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-orange-500/20 bg-purple-900 px-4 py-6 lg:flex">
          <div className="mb-8 px-2">
            <Logo as="span" />
          </div>
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <section data-zone="admin" className="flex flex-1 flex-col">
            <ErrorBoundary feature="Admin Panel">
              <div className="mx-auto flex max-w-xl flex-col gap-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/30 bg-purple-800 text-orange-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                  <p className="mt-1 text-white">
                    The admin panel is not yet available.
                  </p>
                  <p className="mt-1 text-sm text-orange-300">
                    This can mean Supabase is not configured, or your account doesn&apos;t have
                    admin privileges.
                  </p>
                </div>
                <div className="rounded-xl border border-orange-500/30 bg-purple-900 p-5 text-left text-sm text-white">
                  <p className="font-medium text-white">If you&apos;re an administrator:</p>
                  <ul className="mt-2 space-y-1.5 list-disc list-inside">
                    <li>Make sure <code className="rounded bg-purple-800 px-1.5 py-0.5 text-xs font-mono text-orange-300">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-purple-800 px-1.5 py-0.5 text-xs font-mono text-orange-300">SUPABASE_SERVICE_ROLE_KEY</code> are set.</li>
                    <li>Sign in with an account that has the <code className="rounded bg-purple-800 px-1.5 py-0.5 text-xs font-mono text-orange-300">admin</code> role.</li>
                    <li>Try refreshing after verifying both.</li>
                  </ul>
                </div>
                <p className="text-sm text-orange-300">
                  If you believe you should have access, contact the platform administrator.
                </p>
              </div>
            </ErrorBoundary>
          </section>
        </main>
      </div>
    </div>
  );
}
