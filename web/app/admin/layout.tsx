import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireAdminDev } from "@/lib/auth/authorization";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/ui/Logo";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

/**
 * Admin / moderation zone shell.
 *
 * Uses requireAdminDev which grants immediate access in development to:
 *   - any authenticated user (promoted to admin), OR
 *   - a synthetic admin session when no Supabase/Session is available
 *
 * In production, the real admin role in the users table is authoritative;
 * allowlisted emails (e.g. 8gregwilliams@gmail.com) are also promoted.
 * See lib/auth/authorization.ts for the source of that logic.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  let adminUser: Awaited<ReturnType<typeof requireAdminDev>> | null = null;
  let supabaseUnavailable = false;
  let authRedirect = false;

  try {
    adminUser = await requireAdminDev();
  } catch (err: unknown) {
    // Check if this is a Next.js notFound() — let it propagate as a 404.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_NOT_FOUND")
    ) {
      notFound();
    }

    // Check for redirect errors
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      // In production, let the redirect propagate.
      // In development (Supabase not configured), show placeholder instead.
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      authRedirect = true;
    }

    // Any other error (Supabase not configured, DB error, etc.) -> show placeholder.
    if (!authRedirect) {
      supabaseUnavailable = true;
    }
  }

  // Only show placeholder in production when Supabase is truly unavailable
  if (supabaseUnavailable && process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto flex w-full max-w-7xl">
          <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r-2 border-ink-200 bg-surface px-4 py-6 lg:flex">
            <div className="mb-8 px-2">
              <Logo as="span" />
            </div>
            <AdminNav />
          </aside>
          <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <section data-zone="admin" className="flex flex-1 flex-col">
              <ErrorBoundary feature="Admin Panel">
                <div className="mx-auto flex max-w-xl flex-col gap-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-200 bg-surface-muted text-ink-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-ink-900">Admin Panel</h1>
                    <p className="mt-1 text-ink-600">
                      The admin panel is not yet available.
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      This can mean Supabase is not configured, or your account doesn&apos;t have
                      admin privileges.
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-200 bg-surface p-5 text-left text-sm text-ink-600">
                    <p className="font-medium text-ink-900">If you&apos;re an administrator:</p>
                    <ul className="mt-2 space-y-1.5 list-disc list-inside">
                      <li>Make sure <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">SUPABASE_SERVICE_ROLE_KEY</code> are set in your environment.</li>
                      <li>Sign in with an account that has the <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">admin</code> role in the <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">users</code> table.</li>
                      <li>Try refreshing the page after verifying both.</li>
                    </ul>
                  </div>
                  <p className="text-sm text-ink-500">
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

  // Admin user — render the full admin shell.
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r-2 border-ink-200 bg-surface px-4 py-6 lg:flex">
          <div className="mb-8 px-2">
            <Logo as="span" />
          </div>
          <AdminNav />
          <div className="mt-auto border-t border-ink-200 p-3">
            <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-surface-muted p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {adminUser ? adminUser.email.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {adminUser ? adminUser.email : "Administrator"}
                </p>
                <p className="truncate text-xs text-ink-500">Administrator</p>
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
