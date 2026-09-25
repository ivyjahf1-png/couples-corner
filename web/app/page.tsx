import { DiscoverCardStack } from "@/components/app/DiscoverCardStack";
import { LocationBadge } from "@/components/app/LocationBadge";
import { EmptyState } from "@/components/app/EmptyState";
import { GameCenterButton } from "@/components/app/GameCenterButton";
import { getSessionUser } from "@/lib/auth/authorization";
import { getDiscoverProfiles } from "@/lib/server/discovery";
import { demoProfileViews } from "@/lib/demo/demo-data";
import type { ProfileCardView } from "@/lib/feature/types";

export const dynamic = "force-dynamic";

/**
 * Home - immersive profile discovery.
 *
 * The root route is the primary member experience: a full-height discovery
 * card (photo background, overlaid user details, and the side action bar)
 * with a location badge pinned to the top. Data is read live and degrades to
 * the demo fixtures so the deck is never blank.
 */
export default async function HomePage() {
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

  const visible = profiles.filter((profile) => profile?.id);

  return (
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

      <GameCenterButton />
    </div>
  );
}