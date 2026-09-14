import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  isDevAdminBypassActive,
} from "@/lib/auth/authorization";

/**
 * Admin root — the entry point of this package.
 *
 * - Authenticated admins (session cookie resolved server-side) are routed
 *   straight to the admin dashboard at /admin.
 * - In development the dev-bypass sends everyone to /admin, where
 *   `requireAdminDev` issues the dev-admin session.
 * - Everyone else (production visitors without an admin session) sees an
 *   admin sign-in gate — never the public Couples Corner landing page, which
 *   does not belong to this package.
 */
export default async function AdminRootPage() {
  const user = await getSessionUser();
  const isAdmin = user?.role === "admin";

  if (isAdmin || isDevAdminBypassActive()) {
    redirect("/admin");
  }

  return <AdminRootGate signedIn={Boolean(user)} />;
}

function AdminRootGate({ signedIn }: { signedIn: boolean }): ReactNode {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-200 bg-surface-muted text-ink-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <div>
            <h1 className="text-3xl font-semibold tracking-display text-foreground">
              Couples Corner Admin
            </h1>
            <p className="mt-2 text-base leading-relaxed text-ink-600">
              This is the moderation &amp; administration panel for the Couples
              Corner platform.
            </p>
          </div>

          <div className="w-full rounded-xl border border-ink-200 bg-surface p-5 text-left text-sm text-ink-600">
            {signedIn ? (
              <p>
                Your account is signed in but does not have the{" "}
                <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">
                  admin
                </code>{" "}
                role. Ask the platform administrator to grant admin access in
                the{" "}
                <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">
                  users
                </code>{" "}
                table, then refresh this page.
              </p>
            ) : (
              <ul className="space-y-1.5 list-disc list-inside">
                <li>
                  Sign in through the main Couples Corner app first — the admin
                  panel shares the platform session cookie.
                </li>
                <li>
                  Your account must have the{" "}
                  <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">
                    admin
                  </code>{" "}
                  role in the{" "}
                  <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">
                    users
                  </code>{" "}
                  table.
                </li>
                <li>
                  Make sure{" "}
                  <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  and{" "}
                  <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs font-mono text-ink-800">
                    SUPABASE_SERVICE_ROLE_KEY
                  </code>{" "}
                  are set for this deployment.
                </li>
              </ul>
            )}
          </div>

          <a
            href="https://couplescorner.app"
            className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(249,115,22,0.4)] transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            Go to Couples Corner to sign in
          </a>

          <p className="text-sm text-ink-500">
            If you believe you should have access, contact the platform
            administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
