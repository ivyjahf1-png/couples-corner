import { requireUser, isRedirectOrNotFoundError } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { DiscoverCardStack } from "@/components/app/DiscoverCardStack";
import { DiscoverFiltersSync } from "@/components/app/DiscoverFiltersSync";
import { GameCenterButton } from "@/components/app/GameCenterButton";
import { parseDiscoveryFilters } from "@/lib/utils/filters";
import { getDiscoverProfiles } from "@/lib/server/discovery";

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
    <div className="relative flex flex-col gap-8 pb-20">
      <PageHeader
        eyebrow="Discover"
        title="Find your people"
        subtitle="Real profiles from the Couples Corner community, filtered your way. Connections always start with a request."
      />

      <DiscoverFiltersSync filters={filters} resultCount={profiles.length} />

      {profiles.length === 0 ? (
        <EmptyState
          icon="discover"
          title="No profiles found"
          body="No profiles match these filters yet. Try widening your search or check back soon — the community is growing."
        />
      ) : (
        /* Couple's Corner-style deck: left/right tap zones + 5-icon action bar. */
        <DiscoverCardStack profiles={profiles.filter((p) => p?.id)} />
      )}

      {/* Floating Game Center Button (client component boundary) */}
      <GameCenterButton />
    </div>
  );
}