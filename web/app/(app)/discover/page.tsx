import { requireUser, isRedirectOrNotFoundError } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { DiscoverCardStack } from "@/components/app/DiscoverCardStack";
import { DiscoverFiltersSync } from "@/components/app/DiscoverFiltersSync";
import { GameCenterButton } from "@/components/app/GameCenterButton";
import { parseDiscoveryFilters } from "@/lib/utils/filters";
import { getDiscoverProfiles } from "@/lib/server/discovery";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const sp = await searchParams;

  const filters = parseDiscoveryFilters(sp);

  let profiles: Awaited<ReturnType<typeof getDiscoverProfiles>> | null = null;
  let failed = false;
  try {
    profiles = await getDiscoverProfiles(session.uid, filters);
  } catch (error) {
    if (isRedirectOrNotFoundError(error)) throw error;
    console.error("[discover] Fetch failed", {
      message: error instanceof Error ? error.message : "Unexpected discovery fetch error",
    });
    failed = true;
  }

  if (failed || profiles === null) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow="Discover" title="Find your people" />
        <ErrorState
          title="Couldn't load profiles"
          body="Something went wrong reaching the community. Please try again."
        />
      </div>
    );
  }

  return (
    /* VIEWPORT-LOCKED, not a scrolling page.
     *
     * `h-full` rather than `h-[100dvh]`: `AppMain` is already a `flex-1 min-h-0`
     * region inside the shell, with the sticky mobile back header subtracted
     * above it. Declaring another 100dvh here would measure the viewport a
     * second time and push the bottom of this column — the action dock — below
     * the fold by exactly the header's height. `h-full` fills what is actually
     * available, which is the number that matters.
     *
     * `overflow-hidden` is load-bearing: without it the column is allowed to
     * exceed its box and the body picks up a scroll, which is the symptom being
     * fixed. The dock is visible and the page does not move.
     *
     * The bottom tab bar is `fixed` (see BottomNavRegion), so it overlays this
     * column. The inner region reserves its height with `pb-[calc(5rem+…)]`,
     * which is where `AppMain`'s `pb-20` went when this route joined
     * `isFullBleedSurface`. The two must agree — see the note in AppNav. */
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-3">
        <PageHeader
          compact
          eyebrow="Discover"
          title="Find your people"
          actions={<Button href="/explore" variant="ghost">Browse grid</Button>}
        />
      </div>

      <DiscoverFiltersSync filters={filters} resultCount={profiles.length} />

      {/* `min-h-0` is required, not decorative: without it this flex child
          refuses to shrink below its content and overflows the locked column,
          which is precisely how the dock ended up below the fold before.
          `pb-[calc(5rem+env(safe-area-inset-bottom))]` keeps the deck clear of
          the fixed tab bar; `md:pb-0` drops it where that bar is `md:hidden`
          and the sidebar rail takes over. */}
      <div className="flex min-h-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {profiles.length === 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
            <EmptyState
              icon="discover"
              title="No profiles found"
              body="No profiles match these filters yet. Try widening your search or check back soon — the community is growing."
            />
          </div>
        ) : (
          /* Couple's Corner-style deck: left/right tap zones + 5-icon action bar. */
          <DiscoverCardStack profiles={profiles.filter((p) => p?.id)} />
        )}
      </div>

      {/* Floating Game Center Button (client component boundary).
          `bottom-24` clears the 5rem tab bar; the Discover default of
          `bottom-32` sized for the 5-icon action row that this layout no longer
          stacks above the bar. */}
      <GameCenterButton bottomOffset="bottom-24" label="Game" ariaLabel="Open the game hub" />
    </div>
  );
}