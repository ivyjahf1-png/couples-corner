import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/auth/authorization";
import { getDiscoverProfiles } from "@/lib/server/discovery";
import { getNearbyProfiles } from "@/lib/server/nearby";
import { demoProfileViews } from "@/lib/demo/demo-data";
import type { ProfileCardView } from "@/lib/feature/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionUser();

  // Live suggestions: prefer real discoverable profiles (storage photos render
  // via /api/photos), falling back to design-review demo cards.
  let suggestions: ProfileCardView[] = demoProfileViews;
  let usingDemo = true;
  if (session) {
    try {
      const live = await getDiscoverProfiles(session.uid);
      if (live.length > 0) {
        suggestions = live;
        usingDemo = false;
      }
    } catch {
      // Keep demo fallback when discovery is unavailable.
    }
  }

  // "Near you" — distance-ranked members from shared locations (fail-soft).
  let nearby: Awaited<ReturnType<typeof getNearbyProfiles>> = [];
  if (session) {
    try {
      nearby = (await getNearbyProfiles(session.uid)).slice(0, 8);
    } catch {
      nearby = [];
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Welcome back"
        title="Your corner"
        subtitle="A quiet home base for your relationship life — connections, chats, and moments in one place."
        actions={<Button href="/discover">Discover</Button>}
      />

      {/* Suggested members */}
      <section aria-labelledby="suggested-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="suggested-heading" className="font-semibold text-ink-100">Suggested for you</h2>
          <Button href="/discover" size="sm" variant="ghost">See all</Button>
        </div>
        <ul className="flex flex-col gap-2">
          {suggestions.slice(0, 4).map((suggestion) => (
            <li key={suggestion.id}>
              <a
                href={`/profile/${encodeURIComponent(suggestion.id)}`}
                className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-white/5"
              >
                <span className="shrink-0">
                  {suggestion.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={suggestion.avatarUrl}
                      alt={suggestion.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <Avatar name={suggestion.name} kind={suggestion.kind} size="md" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {suggestion.name}
                  </span>
                  <span className="block truncate text-xs text-ink-400">
                    {suggestion.location?.trim() || "Location not shared"}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        {usingDemo ? (
          <p className="text-xs text-ink-400">
            Suggestions use sample profiles for design review — real suggestions appear once the
            community grows.
          </p>
        ) : null}
      </section>

      {/* Near You members */}
      <section aria-labelledby="nearby-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="nearby-heading" className="font-semibold text-ink-100">Near you</h2>
          <Button href="/discover" size="sm" variant="ghost">See all</Button>
        </div>
        {nearby.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {nearby.map((member) => (
              <li key={member.id}>
                <a
                  href={`/profile/${encodeURIComponent(member.id)}`}
                  className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-white/5"
                >
                  <span className="shrink-0">
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <Avatar name={member.name} kind={member.kind} size="md" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{member.name}</span>
                    <span className="block truncate text-xs text-ink-400">
                      {member.location?.trim() || "Location not shared"}
                    </span>
                  </span>
                  {member.distanceKm != null ? (
                    <span className="shrink-0 text-xs text-brand-300">
                      {member.distanceKm < 1
                        ? "<1 km away"
                        : `${Math.round(member.distanceKm)} km away`}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-400">
            No members found nearby yet — share your location on your profile to appear here.
          </p>
        )}
      </section>

      {/* Recommended members */}
      <section aria-labelledby="recommended-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="recommended-heading" className="font-semibold text-ink-100">Recommended</h2>
          <Button href="/discover" size="sm" variant="ghost">See all</Button>
        </div>
        <ul className="flex flex-col gap-2">
          {(suggestions.length > 4 ? suggestions.slice(4, 8) : demoProfileViews).map((pick) => (
            <li key={`rec-${pick.id}`}>
              <a
                href={`/profile/${encodeURIComponent(pick.id)}`}
                className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-white/5"
              >
                <span className="shrink-0">
                  {pick.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pick.avatarUrl}
                      alt={pick.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <Avatar name={pick.name} kind={pick.kind} size="md" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {pick.name}
                  </span>
                  <span className="block truncate text-xs text-ink-400">
                    {pick.location?.trim() || "Location not shared"}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
