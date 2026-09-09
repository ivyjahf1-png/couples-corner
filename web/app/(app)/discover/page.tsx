import { requireUser } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { ProfileCard } from "@/components/app/ProfileCard";
import { DiscoverFiltersSync, parseDiscoveryFilters } from "@/components/app/DiscoverFiltersSync";
import { getDiscoverProfiles } from "@/lib/server/discovery";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const sp = await searchParams;

  const filters = parseDiscoveryFilters(sp);

  try {
    const profiles = await getDiscoverProfiles(session.uid, filters);

    return (
      <div className="flex flex-col gap-8">
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("DiscoverPage error:", error);

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
}
