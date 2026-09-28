import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/authorization";

/**
 * Real-time surfaces (calls, live rooms) render OUTSIDE the app shell.
 *
 * This route group deliberately has no `AppShell`: no sidebar, no mobile top
 * bar, no bottom tab bar. A call or a live broadcast that renders inside
 * normal navigation offers the user somewhere to wander off to mid-session,
 * which is the single most common complaint about in-app calling. Here the
 * screen owns the full dynamic viewport and the only exits are the hang-up /
 * leave button and the browser back gesture.
 *
 * Authentication is still enforced (`requireUser`) — these surfaces are for
 * signed-in members only.
 */
export default async function RealtimeLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
