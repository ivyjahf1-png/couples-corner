import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/authorization";
import { getDiscoverProfiles } from "@/lib/server/discovery";
import { getNearbyProfiles, type NearbyProfileView } from "@/lib/server/nearby";
import { demoProfileViews } from "@/lib/demo/demo-data";
import { ProfileCard } from "@/components/app/ProfileCard";
import { PageHeader } from "@/components/app/PageHeader";
import { GameCenterButton } from "@/components/app/GameCenterButton";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/Button";
import type { ProfileCardView } from "@/lib/feature/types";

export const metadata: Metadata = {
  title: "Explore — Couple's Corner",
  description: "Browse suggested connections and members near you.",
};

export const dynamic = "force-dynamic";

function distanceLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${Math.round(km)} km`;
}

function toNearbyCard(p: NearbyProfileView): ProfileCardView {
  const bits = [
    p.location?.trim() || "",
    p.distanceKm != null ? `${distanceLabel(p.distanceKm)} away` : "",
  ].filter(Boolean);
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    location: bits.join(" · ") || "Location not shared",
    bio: "",
    interests: [],
    connection: "none",
    age: p.age,
    country: p.country,
  };
}

export default async function ExplorePage() {
  const session = await getSessionUser();

  let suggestions: ProfileCardView[] = demoProfileViews;
  let usingDemo = true;
  if (session) {
    try {
      const live = await getDiscoverProfiles(session.uid);
      if (live.length > 0) {
        suggestions = live;
        usingDemo = false;
      }
    } catch {}
  }

  let nearby: ProfileCardView[] = [];
  if (session) {
    try {
      nearby = (await getNearbyProfiles(session.uid)).map(toNearbyCard);
    } catch {
      nearby = [];
    }
  }

  // `/explore` is a BROWSING LIST and stays scrollable in `AppMain`'s own
  // scroll region. Tighter mobile rhythm so more cards are reachable per
  // swipe without changing what the page shows.
  return (
    <div className="flex w-full flex-col gap-4 pb-28 sm:gap-6 md:pb-8">
      {/* Header title, directly above the search row */}
      <PageHeader
        eyebrow="Explore"
        title="Discover: Find your people"
        subtitle=""
      />

      {/* Search engine shifted up immediately below header, with Browse grid beside it */}
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by 6-letter ID or username"
            className="w-full h-12 bg-white/[0.04] border border-white/10 rounded-2xl px-4 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <Button href="/discover" size="sm" variant="secondary" className="shrink-0 rounded-2xl border-white/10 bg-white/[0.05] text-ink-100 hover:bg-white/10 px-4 py-3 h-12">
          Browse grid
        </Button>
      </div>

      {/* Suggested connections with taller, immersive full-bleed photo cards.
          The grid stretches (`flex-1`) so the cards absorb the remaining
          viewport height above the fixed tab bar; each card holds at least
          420px and grows from there instead of clipping. */}
      <section aria-labelledby="explore-suggested-heading" className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="explore-suggested-heading" className="font-semibold text-ink-100 text-sm uppercase tracking-wider text-amber-400/90">
            Suggested connections
          </h2>
          <Button href="/discover" size="sm" variant="ghost" className="text-xs text-ink-300">
            Swipe deck →
          </Button>
        </div>

        {usingDemo ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-ink-300">
            Showing sample profiles — sign in to see real suggestions.
          </p>
        ) : null}

        {/* HERO + GRID. The first profile is the main photo card: it stretches
            vertically (tall immersive card) to fill the remaining space above
            the fixed bottom nav, while the rest flow in the responsive grid. */}
        {suggestions.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-w-0 overflow-hidden rounded-3xl border border-orange-500/20 bg-white/[0.02] shadow-xl backdrop-blur-md [&>div]:h-full [&>div]:min-h-[480px] sm:[&>div]:min-h-[540px]">
              <ProfileCard profile={suggestions[0]} />
            </div>
            {suggestions.length > 1 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {suggestions.slice(1, 9).map((profile) => (
                  <li key={profile.id} className="min-w-0 [&>div]:h-full [&>div]:min-h-[420px] bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
                    <ProfileCard profile={profile} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Near you section */}
      <section aria-labelledby="explore-nearby-heading" className="flex flex-col gap-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 id="explore-nearby-heading" className="font-semibold text-ink-100 text-sm uppercase tracking-wider text-amber-400/90">
            Near you
          </h2>
          {nearby.length > 0 ? (
            <span className="text-xs text-ink-400">{nearby.length} members</span>
          ) : null}
        </div>

        {nearby.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {nearby.slice(0, 9).map((profile) => (
              <li key={`nearby-${profile.id}`} className="min-w-0 [&>div]:h-full [&>div]:min-h-[420px] bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
                <ProfileCard profile={profile} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="sparkle"
            title="No one nearby yet"
            body="Share your location from your profile to see members closest to you, or browse everyone in the swipe deck."
            action={
              <Button href="/discover" size="sm" variant="secondary">
                Open the swipe deck
              </Button>
            }
          />
        )}
      </section>

      <GameCenterButton
        bottomOffset="bottom-28 md:bottom-24"
        label="Game"
        ariaLabel="Open the game hub"
      />
    </div>
  );
}