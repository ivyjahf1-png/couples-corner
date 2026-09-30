import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/authorization";
import { getDiscoverProfiles } from "@/lib/server/discovery";
import { getNearbyProfiles, type NearbyProfileView } from "@/lib/server/nearby";
import { demoProfileViews } from "@/lib/demo/demo-data";
import { ProfileCard } from "@/components/app/ProfileCard";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/Button";
import type { ProfileCardView } from "@/lib/feature/types";

export const metadata: Metadata = {
  title: "Explore — Couple's Corner",
  description: "Browse suggested connections and members near you.",
};

export const dynamic = "force-dynamic";

/** Human-readable distance label ("850 m" / "12 km"). */
function distanceLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${Math.round(km)} km`;
}

/** Map a NearbyProfileView onto the shared ProfileCard shape, surfacing distance. */
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
  };
}

/**
 * Explore / Discovery re-layout (item 2).
 *
 * Structured card-grid alternative to the /discover swipe deck:
 *   1. Suggested connections — discoverable profiles (demo fallback signed out).
 *   2. Near you — distance-ranked members from shared locations.
 * Server Component: all queries run server-side; ProfileCard handles actions.
 *
 * ── WHY THIS PAGE STILL SCROLLS, AND /discover DOES NOT ─────────────────────
 * These two routes were reported together as "must fit on a phone without
 * scrolling", but they are different surfaces and only one of them can honour
 * that.
 *
 * `/discover` is the swipe deck: ONE card, a bounded set of five action buttons
 * and a progress counter. That has a natural fit — lock the column to the
 * viewport and let the card absorb the leftover height. It is now
 * viewport-locked; see that page and `AppMain`'s `isFullBleedSurface`.
 *
 * `/explore` is a BROWSING LIST. It renders up to nine suggested profiles plus
 * up to nine nearby ones, each a full card with an avatar, name, bio, interests
 * and its own connect actions. Eighteen of those cannot be shown on a phone at
 * a readable size without either scrolling or shrinking them past use. Removing
 * the scroll would mean hiding results the member asked to see, or rendering
 * cards roughly 40px tall — both worse than the scroll it would fix.
 *
 * So this page keeps `AppMain`'s single scroll region, and what it does instead
 * is tighten the mobile rhythm: smaller section and grid gaps below `sm`, so
 * more cards are reachable per swipe. That is the honest part of the request;
 * the non-scrolling part is not available on this surface.
 */
export default async function ExplorePage() {
  const session = await getSessionUser();

  // Suggested connections — live discovery, falling back to design-review demos.
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
      // Fail soft — demo grid below keeps the page presentable.
    }
  }

  // Near you — distance-ranked (degrades to recently-active worldwide).
  let nearby: ProfileCardView[] = [];
  if (session) {
    try {
      nearby = (await getNearbyProfiles(session.uid)).map(toNearbyCard);
    } catch {
      nearby = [];
    }
  }

  return (
    /* `/explore` is a BROWSING LIST and stays scrollable — see the note below.
       What is tightened here is the mobile rhythm, so more cards are reachable
       per swipe without changing what the page shows. */
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        eyebrow="Explore"
        title="Discover people"
        subtitle="Browse suggested connections and members near you — then start a conversation."
      />

      {/* ------------------------------------------------ Suggested connections */}
      <section aria-labelledby="explore-suggested-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="explore-suggested-heading" className="font-semibold text-ink-100">
            Suggested connections
          </h2>
          <Button href="/discover" size="sm" variant="ghost">
            Swipe deck →
          </Button>
        </div>

        {usingDemo ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-ink-300">
            Showing sample profiles — sign in to see real suggestions.
          </p>
        ) : null}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {suggestions.slice(0, 9).map((profile) => (
            <li key={profile.id} className="min-w-0">
              <ProfileCard profile={profile} />
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ Near you */}
      <section aria-labelledby="explore-nearby-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="explore-nearby-heading" className="font-semibold text-ink-100">
            Near you
          </h2>
          {nearby.length > 0 ? (
            <span className="text-xs text-ink-400">{nearby.length} members</span>
          ) : null}
        </div>

        {nearby.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {nearby.slice(0, 9).map((profile) => (
              <li key={`nearby-${profile.id}`} className="min-w-0">
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
    </div>
  );
}
