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

  // `/explore` is a BROWSING LIST and owns the same locked-column contract as
  // the feed: `AppMain` hands it a bounded `h-full` box (see its `h-full`
  // inner wrapper), so `h-full min-h-0 overflow-hidden` fills exactly that box
  // and the inner region is the ONE scroll surface. Without this the page
  // scrolled the shell's `<main>` behind the fixed tab bar instead of its own
  // region.
  //
  // THE BOTTOM RESERVE IS BREATHING ROOM ONLY — NOT THE NAV. `/explore` is not
  // one of AppMain's full-bleed routes, so `<main>` itself already carries the
  // tab bar's exact height plus the gesture-bar inset as a single calc() reserve.
  // This scroller previously added a SECOND, larger reserve on top, stacking two
  // independent insets into a ~12rem dead band between the last card and the nav
  // (both env() lookups count the same inset twice). `pb-8` is just scroll
  // clearance at the end of the list; the nav clearance lives in ONE place, AppMain.
  return (
    <div className="flex h-full max-h-[100dvh] min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-1 pb-8 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] sm:gap-6">
      {/* Header title, directly above the search row */}
      <PageHeader
        eyebrow="Explore"
        title="Discover: Find your people"
        subtitle=""
      />

      {/* SEARCH + BROWSE GRID — ONE ROW, NEVER STACKED.

          Both controls share a single flex row directly under the page header, so
          "Browse grid" sits on the same horizontal line as the search input rather
          than on its own line above it.

          `min-w-0` on the input wrapper IS the responsiveness fix. A flex item
          defaults to `min-width: auto`, so without it the input refused to shrink
          below its placeholder's intrinsic width on a 320px phone and pushed the
          button out of the row — which is what read as the controls "wrapping".
          `shrink-0` + `whitespace-nowrap` on the button pins its width so the
          input absorbs all the give instead. */}
      <div className="flex w-full items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            placeholder="Search by 6-letter ID or username"
            className="h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-ink-100 placeholder:text-ink-400 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
        <Button
          href="/discover"
          size="sm"
          variant="secondary"
          className="h-12 shrink-0 whitespace-nowrap rounded-2xl border-white/10 bg-white/[0.05] px-4 text-ink-100 hover:bg-white/10"
        >
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
            vertically (tall immersive card) to fill the remaining space above the
            fixed bottom nav, while the rest flow in the responsive grid. */}
        {suggestions.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* THE HERO FILLS THE SPACE UNDER THE SEARCH ROW.

                The wrapper is `flex-1 min-h-0` in a bounded column, so it takes
                every pixel left after the header, the search/grid row and the
                section heading — its bottom edge lands at the top of the bottom
                nav. The inner anchor inherits that height with `h-full`, so the
                photo bleeds to all four edges of the glass card.

                THE FIXED FLOORS ARE GONE. `min-h-[480px] sm:min-h-[540px]` on the
                inner anchor was a floor, not a target: on a tall phone it was
                satisfied by content and the card stopped short of the nav, and on
                a short landscape screen it forced the box PAST the viewport,
                clipping the card and stranding the dead band the reserve is
                supposed to own. A viewport-derived floor cannot drift in either
                direction — it shrinks with the window and still guarantees a
                usable card on a very short screen.

                THE SELECTOR TARGETS `<a>`, NOT `<div>`: `ProfileCard`'s root is a
                next/link anchor, so a `[&>div]` compound matches nothing. */}
            <div className="flex min-h-0 w-full flex-1 flex-col">
              {/* `100dvh_-_22rem` — THE UNDERSCORES ARE LOAD-BEARING. Tailwind
                  turns `_` into a space in arbitrary values, and CSS `calc()`
                  REQUIRES whitespace around `-`. Writing `calc(100dvh-22rem)`
                  produces invalid CSS that every browser silently discards, so the
                  whole `min-height` declaration vanishes and the floor is lost.

                  `min(100%, …)` caps the floor at the parent's own height, so this
                  can never force the card taller than the space available and push
                  the box past the viewport. */}
              <div className="min-h-0 w-full flex-1 overflow-hidden rounded-3xl border border-orange-500/20 bg-white/[0.02] shadow-xl backdrop-blur-md [&>a]:flex [&>a]:h-full [&>a]:w-full [&>a]:flex-col [&>a]:min-h-[min(100%,calc(100dvh_-_22rem))]">
                <ProfileCard profile={suggestions[0]} />
              </div>
            </div>
            {suggestions.length > 1 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {suggestions.slice(1, 9).map((profile) => (
                  <li key={profile.id} className="min-w-0 [&>a]:h-full [&>a]:min-h-[420px] bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
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
              <li key={`nearby-${profile.id}`} className="min-w-0 [&>a]:h-full [&>a]:min-h-[420px] bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
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
    </div>
  );
}