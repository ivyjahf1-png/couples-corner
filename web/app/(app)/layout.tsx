import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/authorization";
import { AppShell } from "@/components/app/AppShell";

/**
 * Authenticated app zone shell (dashboard, explore, messages, profiles, ...).
 *
 * Requires an authenticated session; anonymous visitors are redirected to sign
 * in so no private app UI or user data is ever rendered publicly. App chrome
 * (sidebar/nav) renders inside this wrapper once the UI is built.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <AppShell>
      <section data-zone="app" className="flex flex-1 flex-col">
        {children}
      </section>
    </AppShell>
  );
}