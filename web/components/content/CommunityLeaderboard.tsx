import "server-only";

import Link from "next/link";
import { getTopProfiles, type TopProfile } from "@/lib/server/discovery";

/**
 * Community leaderboard showcasing the most-active profiles on the platform.
 * Renders nothing when no profiles exist, so it degrades gracefully.
 */
export async function CommunityLeaderboard({ limit = 10 }: { limit?: number }) {
  const profiles = (await getTopProfiles()).slice(0, limit);

  if (profiles.length === 0) return null;

  return (
    <section className="landing-section">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-950/60 px-3 py-1 text-xs font-semibold text-brand-300 ring-1 ring-brand-700/40">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Community
          </span>
          <h2 className="text-3xl font-bold tracking-display text-foreground sm:text-4xl">
            Top connections this week
          </h2>
          <p className="text-lg leading-8 text-ink-500">
            The most-active couples and individuals leading the community.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile, index) => (
            <LeaderboardCard key={profile.id} profile={profile} rank={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LeaderboardCard({
  profile,
  rank,
}: {
  profile: TopProfile;
  rank: number;
}) {
  const isTopThree = rank <= 3;

  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-ink-700/50 bg-surface p-4 transition hover:border-brand-500/40 hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      {/* Rank badge */}
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
          isTopThree
            ? "bg-brand-600 text-white"
            : "bg-ink-800 text-ink-400"
        }`}
      >
        {rank}
      </span>

      {/* Avatar */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-900/40 text-lg font-bold text-brand-300 ring-2 ring-brand-700/30">
        {profile.name?.charAt(0)?.toUpperCase() ?? "?"}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {profile.name ?? "Member"}
        </p>
        <p className="truncate text-xs text-ink-500">
          {profile.kind === "couple" ? "Couple" : "Individual"}
          {profile.location ? ` · ${profile.location}` : ""}
        </p>
      </div>

      {/* Score indicator */}
      <span className="shrink-0 text-xs font-medium text-brand-400 group-hover:text-brand-300">
        View →
      </span>
    </Link>
  );
}
