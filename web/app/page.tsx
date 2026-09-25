import { DiscoverCardStack } from "@/components/app/DiscoverCardStack";
import { LocationBadge } from "@/components/app/LocationBadge";
import { MomentRail } from "@/components/app/MomentRail";
import { EmptyState } from "@/components/app/EmptyState";
import { GameCenterButton } from "@/components/app/GameCenterButton";
import { getSessionUser } from "@/lib/auth/authorization";
import { AppShell } from "@/components/app/AppShell";
import { getDiscoverProfiles } from "@/lib/server/discovery";
import { getRecentMoments } from "@/lib/server/tasks";
import { demoProfileViews } from "@/lib/demo/demo-data";
import type { ProfileCardView } from "@/lib/feature/types";

export const dynamic = "force-dynamic";

/**
 * Home - immersive profile discovery.
 *
 * The root route is the primary member experience: a full-height discovery
 * card (photo background, overlaid user details, and the side action bar)
 * with a location badge pinned to the top, followed by a rail of recently
 * published moments. No static marketing blocks or stacked widgets.
 */
export default async function HomePage() {
  // NOTE: this route is intentionally PUBLIC and must never call
  // requireUser(). requireUser() sends anonymous visitors to "/login"; that is
  // safe today, but if this route ever guarded itself the two routes would
  // bounce against each other forever (NEXT_REDIRECT loop -> blank screen).
  // Signed-out visitors get the discovery view without app chrome instead.
  const session = await getSessionUser();

  let profiles: ProfileCardView[] = demoProfileViews;
  if (session) {
    try {
      const live = await getDiscoverProfiles(session.uid);
      if (Array.isArray(live) && live.length > 0) profiles = live;
    } catch {
      profiles = demoProfileViews;
    }
  }

  const moments = await getRecentMoments(12).catch(() => []);
  const visible = profiles.filter((profile) => profile?.id);

  const view = (
    <section data-zone="app" className="inner-surface flex flex-1 flex-col">
    <div className="relative flex min-h-[calc(100dvh-9rem)] flex-col gap-4 pb-28">
      {/* Top bar: brand + live location badge */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-wide text-white">Couple&apos;s Corner</h1>
        <LocationBadge />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="discover"
          title="No profiles yet"
          body="New members are joining every day. Check back soon to start connecting."
        />
      ) : (
        <DiscoverCardStack profiles={visible} />
      )}

      <MomentRail moments={moments} />

      <GameCenterButton />
    </div>
    </section>
  );

  // Signed-in members get the full app chrome (sidebar + fixed bottom nav).
  // Signed-out visitors get the same discovery view without app chrome.
  return session ? <AppShell>{view}</AppShell> : view;
}