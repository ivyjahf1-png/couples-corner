import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/authorization";
import { AppShell } from "@/components/app/AppShell";
import { PromoOverlay } from "@/components/content/PromoOverlay";
import { getPublishedForPlacement } from "@/lib/server/content";

/**
 * Authenticated app zone shell (dashboard, explore, messages, profiles, ...).
 *
 * Requires an authenticated session; anonymous visitors are redirected to sign
 * in so no private app UI or user data is ever rendered publicly. App chrome
 * (sidebar/nav) renders inside this wrapper once the UI is built.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const promo = (await getPublishedForPlacement("dashboard").catch(() => []))[0] ?? null;
  return (
    <AppShell>
      {/* h-full + min-h-0: this wrapper must not add height of its own, or a
          child page that locks itself to 100dvh (the conversation view) would
          overflow the shell and reintroduce page-level scrolling. */}
      <section data-zone="app" className="inner-surface flex h-full min-h-0 flex-1 flex-col">
        {children}
      </section>
      {promo ? <PromoOverlay item={promo} /> : null}
    </AppShell>
  );
}