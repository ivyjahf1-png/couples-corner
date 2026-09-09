import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/authorization";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/ui/Logo";

/**
 * Admin / moderation zone shell.
 *
 * Server-side guard only: requires an authenticated user whose role custom
 * claim is "admin". Non-admins get a 404 (anti-enumeration). When moderation
 * actions are implemented they must also be recorded via `ModerationAction`
 * for a full audit trail.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-ink-200 bg-surface px-4 py-6 lg:flex">
          <div className="mb-8 px-2">
            <Logo as="span" />
          </div>
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <section data-zone="admin" className="flex flex-1 flex-col">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
