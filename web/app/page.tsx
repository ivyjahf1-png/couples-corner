import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/authorization";
import { AppShell } from "@/components/app/AppShell";
import { ImmersiveFeed } from "@/components/app/ImmersiveFeed";
import { getRecentMoments } from "@/lib/server/tasks";
import { searchMembers } from "@/lib/server/profiles";
import { GuestLandingPage } from "@/components/landing/GuestLandingPage";
import type { MomentView } from "@/lib/moments";

export const dynamic = "force-dynamic";

/**
 * Home — the conditional entry point.
 *
 * ── THE SPLIT ───────────────────────────────────────────────────────────────
 * This route used to render the immersive MediaFeed to EVERYONE and treated
 * marketing as "removed legacy blocks". A signed-out visitor landed straight
 * on a full-bleed video player with reaction buttons, a sponsored card and an
 * ad-reward counter, before learning what the product is. That is a bad first
 * impression and a bad conversion, so the root now branches on the session:
 *
 *   • SIGNED IN  → the app. The feed renders in AppShell exactly as before.
 *   • SIGNED OUT → GuestLandingPage, a static marketing page.
 *
 * WHY THE SIGNED-IN BRANCH RENDERS INSTEAD OF REDIRECTING: the immersive
 * MediaFeed lives only at `/`, and moving it to /feed would silently change
 * what every existing share link points at. Rendering keeps the URL stable
 * while still satisfying "a signed-in member lands in the app". A redirect
 * would also cost an extra round trip and flash a redirect frame on every cold
 * open — which is exactly the path a Capacitor launch takes.
 *
 * WHY THIS ROUTE MUST NEVER CALL requireUser(): requireUser() sends anonymous
 * visitors to /login, which would (a) make the marketing page unreachable and
 * (b) bounce against the login page's own guard forever — a NEXT_REDIRECT loop
 * that renders as a blank screen. getSessionUser() returns null instead, which
 * is the correct read for a route serving both audiences.
 *
 * The signed-in branch is still a full-bleed, single-card-at-a-time viewer over
 * the public `moments` table. The Task Center upload form
 * (`/task/upload-moment`) writes to that same table via publishMoment(), so any
 * image or video a member uploads is syndicated here immediately.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; moment?: string }>;
}) {
  const session = await getSessionUser();
  const { q, moment } = await searchParams;

  // Search: an exact 6-character code or a single unambiguous name goes
  // straight to the profile; anything with several candidates lands on
  // the dedicated results page so the user can pick.
  //
  // This runs BEFORE the guest branch deliberately. The search box is app
  // chrome, so a guest only reaches it by arriving with a `?q=` deep link;
  // honouring that link is the difference between landing on their profile and
  // being silently discarded onto a marketing page.
  const query = q?.trim() ?? "";
  if (query) {
    const result = await searchMembers(query).catch(() => null);
    if (result?.kind === "exact") redirect(`/profile/${result.userId}`);
    if (result?.kind === "results" && result.users.length === 1) {
      redirect(`/profile/${result.users[0].userId}`);
    }
    redirect(`/search?q=${encodeURIComponent(query)}`);
  }

  /* ── GUEST: the marketing landing page ────────────────────────────────────
     Returned before ANY feed data is fetched. That is the point of the split:
     a guest page load costs one session lookup and zero database queries, so it
     stays fast and cannot be slowed by a heavy feed payload or a failing
     moments table.

     The invite wall is deliberately NOT mounted here. It raises a modal after a
     timer against a video the visitor is watching, which presumes the feed
     underneath it; on a marketing page there is no video, and a modal that
     interrupts a page someone has only just opened reads as a pop-up ad.
     Invited visitors still get their referral cookie set, and the auth modal
     reads the code from storage. */
  if (!session) {
    return <GuestLandingPage />;
  }

  // Fail-soft: an unconfigured or unreachable database still renders the
  // player shell rather than erroring the whole route. The viewer id lets the
  // feed mark which moments this member has already reacted to.
  const moments: MomentView[] = await getRecentMoments(12, session.uid).catch(() => []);

  /* The player itself lives in ImmersiveFeed, shared with /feed. Both routes
     render the same component so the vertical snap player, its overlay chrome
     and the sponsored card cannot drift apart between them — which is exactly
     the regression that sent the "Moment" tab to a static blog list. */
  return (
    <AppShell>
      <ImmersiveFeed
        viewerId={session.uid}
        deepLinkMomentId={moment?.trim().slice(0, 64) || null}
        moments={moments}
      />
    </AppShell>
  );
}
