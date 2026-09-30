import type { ReactNode } from "react";
import { isAdminGateConfigured, isAdminGateOpen } from "@/lib/auth/admin-gate";
import { getCurrentSessionUser } from "@/lib/server/session";
import { AdminGateCard } from "@/components/admin/AdminGateCard";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/ui/Logo";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

/**
 * FORCE RENDER PER REQUEST.
 *
 * `/admin` was relying on Next.js inferring dynamic rendering because the layout
 * happens to call `cookies()` (via `isAdminGateOpen`). That inference is a
 * side effect of an unrelated call, not a statement about this route's intent —
 * and it is exactly the kind of coupling that breaks silently: refactor the gate
 * so the cookie check is conditional, or add a static path, and the layout
 * becomes statically prerendered.
 *
 * The consequence of that is the reported symptom. A statically prerendered
 * layout evaluates `isAdminGateConfigured()` during `next build`, when the
 * environment may not carry `ADMIN_PANEL_PASSWORD` yet, and bakes the resulting
 * `false` into the HTML forever. Adding the variable afterwards and redeploying
 * changes nothing, because the cached page still says "not configured" — the
 * panel is stuck on the locked screen and nothing in the UI explains why.
 *
 * Declaring it explicitly removes the possibility rather than hoping the inference
 * holds. There is no cost: this route is a protected admin surface hit a handful
 * of times a day, and it must never be cached regardless of who is asking.
 */
export const dynamic = "force-dynamic";

/**
 * Admin / moderation zone shell.
 *
 * GATE: a single passphrase held in the environment (lib/auth/admin-gate.ts)
 * rather than a `role = 'admin'` row in the `users` table. This is deliberately
 * the simpler of the two mechanisms; see the gate module header for the trade-off
 * it accepts (a shared secret, not per-person roles) and the recommendation to
 * reinstate per-user roles later.
 *
 * The previous build of this file rendered an "Admin panel is not yet available"
 * error screen when the role check failed. That was a dead end — it explained a
 * configuration problem but gave the operator nothing to click — so the unlock
 * card replaces it. The surrounding shell renders IDENTICALLY in both states so
 * unlocking is not a jarring re-layout.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const unlocked = await isAdminGateOpen();
  const configured = isAdminGateConfigured();

  // A signed-in member is shown as the acting operator when there is one. The
  // gate itself does NOT require a session — that is the point of the simpler
  // gate — so this is commonly null and the footer falls back to a generic label.
  const session = unlocked ? await getCurrentSessionUser().catch(() => null) : null;
  const actorLabel = session?.email ?? "Administrator";

  return (
    <div className="app-canvas min-h-dvh">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r-2 border-ink-700 bg-surface px-4 py-6 lg:flex">
          <div className="mb-8 px-2">
            <Logo as="span" />
          </div>
          {/* The nav is hidden while locked so the unlock card is the only thing
              on screen. Rendering the links behind the gate would advertise the
              shape of the admin surface to anyone who can reach /admin. */}
          {unlocked ? <AdminNav /> : null}
          {unlocked ? (
            <div className="mt-auto border-t border-ink-700 p-3">
              <div className="flex items-center gap-3 rounded-xl border border-ink-700 bg-surface-muted p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/15 text-sm font-bold text-brand-300">
                  {actorLabel.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{actorLabel}</p>
                  <p className="truncate text-xs text-ink-400">Administrator</p>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
          <section data-zone="admin" className="flex flex-1 flex-col">
            <ErrorBoundary feature="Admin Panel">
              {unlocked ? children : <AdminGateCard configured={configured} />}
            </ErrorBoundary>
          </section>
        </main>
      </div>
    </div>
  );
}
