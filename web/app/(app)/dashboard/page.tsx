import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/landing/Icon";
import { HomeMemberRow } from "@/components/app/HomeMemberRow";
import { getSessionUser } from "@/lib/auth/authorization";
import { getDiscoverProfiles } from "@/lib/server/discovery";
import { getNearbyProfiles } from "@/lib/server/nearby";
import { demoProfileViews } from "@/lib/demo/demo-data";
import type { ProfileCardView } from "@/lib/feature/types";

export const dynamic = "force-dynamic";

/**
 * Home ("Your corner").
 *
 * Layout contract (reference layout):
 *   1. Glass hero — "Your corner", the description line, and the prominent
 *      Discover CTA.
 *   2. Quick glass actions — the four destinations of the discovery loop.
 *   3. "Suggested for you" — discoverable members.
 *   4. "Near you" — distance-ranked members from shared locations.
 *
 * Performance contract: every read happens in ONE parallel round-trip, so the
 * page streams as soon as the slowest query resolves — there is no serial
 * await waterfall and therefore no blocking spinner. Both reads are fail-soft
 * (a failure degrades to the demo fixtures / the existing empty copy).
 */
/** Quick glass actions — the four destinations of the discovery loop. */
const quickActions: {
  href: string;
  label: string;
  hint: string;
  icon: IconName;
  tone: string;
}[] = [
  {
    href: "/discover",
    label: "Discover",
    hint: "Swipe profiles",
    icon: "compass",
    tone: "from-orange-500/30 to-amber-400/10 text-orange-200",
  },
  {
    href: "/likes",
    label: "Likes",
    hint: "Who likes you",
    icon: "flame",
    tone: "from-rose-500/30 to-pink-400/10 text-rose-200",
  },
  {
    href: "/messages",
    label: "Messages",
    hint: "Your chats",
    icon: "chat",
    tone: "from-sky-500/30 to-cyan-400/10 text-sky-200",
  },
  {
    href: "/feed",
    label: "Moments",
    hint: "Community feed",
    icon: "moments",
    tone: "from-violet-500/30 to-fuchsia-400/10 text-violet-200",
  },
];

export default async function DashboardPage() {
  const session = await getSessionUser();

  const [liveSuggestions, liveNearby] = await Promise.all([
    session
      ? getDiscoverProfiles(session.uid).catch(() => [] as ProfileCardView[])
      : Promise.resolve([] as ProfileCardView[]),
    session
      ? getNearbyProfiles(session.uid).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Live suggestions first; the design-review demo cards keep the section
  // useful while the community is still growing.
  const usingDemo = liveSuggestions.length === 0;
  const suggestions: ProfileCardView[] = usingDemo ? demoProfileViews : liveSuggestions;
  const nearby = liveNearby.slice(0, 8);

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* ------------------------------------------------ 1. Hero: Your corner */}
      <section
        aria-labelledby="corner-heading"
        className="glass-panel glass-panel--glow relative overflow-hidden p-6 sm:p-8"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-orange-500/20 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-4">
          <div>
            <Chip tone="brand">Welcome back</Chip>
          </div>
          <h1
            id="corner-heading"
            className="cc-fluid-title text-3xl font-bold tracking-display text-white sm:text-4xl"
          >
            Your corner
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-ink-300 sm:text-base">
            A quiet home base for your relationship life — connections, chats, and moments in
            one place.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button href="/discover" size="lg" className="shadow-lg shadow-orange-900/30">
              <Icon name="compass" className="h-5 w-5" />
              Discover
            </Button>
            <Button href="/likes" size="lg" variant="secondary">
              See who liked you
            </Button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------- 2. Quick glass actions */}
      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="glass-panel group flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-white/25"
          >
            <span
              aria-hidden
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.tone}`}
            >
              <Icon name={action.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{action.label}</span>
              <span className="block truncate text-xs text-ink-400">{action.hint}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* ------------------------------------------- 3. Suggested for you */}
      <section aria-labelledby="suggested-heading" className="flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="suggested-heading" className="text-lg font-semibold text-white">
              Suggested for you
            </h2>
            <span className="glass-badge px-2 py-0.5 text-[11px] font-semibold text-brand-200">
              {suggestions.length}
            </span>
          </div>
          <Button href="/discover" size="sm" variant="ghost">
            See all
          </Button>
        </header>

        <ul className="flex flex-col gap-2">
          {suggestions.slice(0, 4).map((suggestion) => (
            <li key={suggestion.id}>
              <HomeMemberRow
                id={suggestion.id}
                name={suggestion.name}
                kind={suggestion.kind}
                location={suggestion.location}
                avatarUrl={suggestion.avatarUrl}
                href={`/profile/${encodeURIComponent(suggestion.id)}`}
                meta={
                  typeof suggestion.sharedInterests === "number" && suggestion.sharedInterests > 0
                    ? `${suggestion.sharedInterests} shared interest${suggestion.sharedInterests === 1 ? "" : "s"}`
                    : null
                }
              />
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

      {/* ------------------------------------------------- 4. Near you */}
      <section aria-labelledby="nearby-heading" className="flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="nearby-heading" className="text-lg font-semibold text-white">
              Near you
            </h2>
            <span className="glass-badge px-2 py-0.5 text-[11px] font-semibold text-brand-200">
              {nearby.length}
            </span>
          </div>
          <Button href="/discover" size="sm" variant="ghost">
            See all
          </Button>
        </header>

        {nearby.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {nearby.map((member) => (
              <li key={member.id}>
                <HomeMemberRow
                  id={member.id}
                  name={member.name}
                  kind={member.kind}
                  location={member.location}
                  avatarUrl={member.avatarUrl}
                  href={`/profile/${encodeURIComponent(member.id)}`}
                  distanceKm={member.distanceKm}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-400">
            No members found nearby yet — share your location on your profile to appear here.
          </p>
        )}
      </section>
    </div>
  );
}
