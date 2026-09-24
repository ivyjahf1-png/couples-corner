import { UserMediaGallery } from "@/components/app/UserMediaGallery";

import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfile } from "@/lib/server/profiles";
import { getProfileStats } from "@/lib/server/profile-stats";
import { getGameWallet } from "@/lib/server/games";
import { computeProfileCompletion } from "@/lib/utils/profile-completion";
import { Avatar } from "@/components/app/Avatar";
import { CopyIdButton } from "@/components/profile/CopyIdButton";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * "Me" — the signed-in member's own profile.
 *
 * Visual contract: a glamorous, luxury dark-canvas interface. An aurora canvas
 * (`.glam-shell`) drifts warm orange, rose, indigo and aqua light behind a
 * metallic conic hairline frame (`.glam-frame`); stats, balances, quick actions
 * and menu rows sit on frosted glass tiles (`.glam-tile`) so every number stays
 * crisp and readable. All motion is decorative (see `prefers-reduced-motion`
 * in app/globals.css).
 *
 * PRESERVATION CONSTRAINT: the data contract is untouched — session lookup,
 * `getOwnProfile`, `getProfileStats`, `getGameWallet` and
 * `computeProfileCompletion` are the same calls in the same order, and every
 * href below is the exact route this page already linked to. Only layout,
 * tokens and ornament changed.
 */
export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) return null; // requireUser() at the layout level already redirects.

  const { user, profile } = await getOwnProfile(session.uid);
  const [stats, wallet] = await Promise.all([
    getProfileStats(session.uid),
    getGameWallet(session.uid),
  ]);
  const completion = computeProfileCompletion(profile);

  const name = profile?.displayName || user?.displayName || "Your name";
  const photo = profile?.photos?.[0];
  const shortId = session.uid.slice(0, 8).toUpperCase();
  const level = Math.max(1, Math.floor((completion?.percentage ?? 0) / 10));

  const statCells = [
    { label: "Friends", value: stats.friends },
    { label: "Following", value: stats.following },
    { label: "Followers", value: stats.followers },
    { label: "Visitors", value: stats.visitors },
  ];

  const recommendedGames = [
    { id: "fortune-gems", title: "Fortune Gems", emoji: "💎", gradient: "from-orange-500 via-amber-400 to-sky-600" },
    { id: "wealthy-tiger", title: "WealthyTiger", emoji: "🐯", gradient: "from-amber-500 via-orange-600 to-rose-600" },
    { id: "world-goal", title: "World Goal", emoji: "⚽", gradient: "from-emerald-500 via-teal-600 to-cyan-700" },
    { id: "rocket-star", title: "Rocket Star", emoji: "🚀", gradient: "from-sky-500 via-blue-600 to-violet-700" },
  ];

  const menuItems: { label: string; emoji: string; href: string; trailing?: ReactNode }[] = [
    { label: "Bag", emoji: "🎒", href: "/moments" },
    { label: "Level", emoji: "📈", href: "/subscription" },
    { label: "Badge", emoji: "🎖️", href: "/subscription" },
    {
      label: "Certification",
      emoji: "🛡️",
      href: "/profile/edit",
      trailing: <span className="text-xs font-semibold text-danger-400">Uncertified</span>,
    },
    { label: "Customer service", emoji: "🎧", href: "/settings" },
    { label: "User Feedback", emoji: "💬", href: "/settings" },
    { label: "Settings", emoji: "⚙️", href: "/settings" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-10">
      {/* ------------------------------------------------ 1. Glamour header */}
      <section aria-label="Profile header" className="glam-shell p-5 sm:p-6">
        <div className="relative flex items-start gap-3">
          <span className="shrink-0 rounded-full bg-gradient-to-br from-amber-300 via-rose-400 to-indigo-400 p-[2px] shadow-lg shadow-rose-500/20">
            <span className="block rounded-full bg-[#0B1120] p-[2px]">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/photos/${session.uid}/${photo?.storagePath?.split("/")?.pop() ?? ""}`}
                  alt={name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <Avatar name={name} size="lg" />
              )}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="glam-text truncate text-xl font-extrabold tracking-display">{name}</h1>
              <span className="glam-chip px-2 py-0.5 text-[10px] font-extrabold">VIP</span>
              <span className="glass-badge px-2 py-0.5 text-[10px] font-bold text-sky-200">
                Lv.{level}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CopyIdButton value={session.uid} label={`ID: ${shortId}`} />
              <span className="text-[11px] font-medium text-ink-300">
                {completion.percentage}% profile complete
              </span>
            </div>

            {/* Completion meter — a multi-hue sheen instead of a flat bar. */}
            <div
              role="progressbar"
              aria-label="Profile completion"
              aria-valuenow={completion.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-rose-400 to-indigo-400"
                style={{ width: `${Math.max(4, Math.min(100, completion.percentage))}%` }}
              />
            </div>
          </div>

          {/* Visitor counter with notification dot */}
          <Link
            href="/likes"
            aria-label={`${stats.visitors} visitors — view visitors`}
            className="glam-tile relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-white"
          >
            <span aria-hidden className="text-base">👣</span>
            <span className="text-[10px] font-bold text-ink-200">{stats.visitors}</span>
            {stats.visitors > 0 ? (
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-[#0B1120]"
              />
            ) : null}
          </Link>
        </div>

        {/* 4-column statistics bar — frosted tiles with a coloured aura each. */}
        <dl className="relative mt-4 grid grid-cols-4 gap-2">
          {statCells.map((cell) => (
            <div
              key={cell.label}
              className="glam-tile flex flex-col items-center gap-0.5 rounded-2xl py-3"
            >
              <dd className="text-base font-extrabold tabular-nums text-white">{cell.value}</dd>
              <dt className="text-[11px] text-ink-300">{cell.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* --------------------------- 2. Balance + membership (glass tiles) */}
      <section aria-label="Wallet and membership" className="grid grid-cols-2 gap-3">
        <Link
          href="/subscription"
          className="glam-tile glam-tile--warm flex items-center gap-3 rounded-2xl p-4"
        >
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 text-xl shadow-md shadow-amber-500/25"
          >
            🪙
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold tabular-nums text-amber-100">
              {wallet.coinBalance}
            </span>
            <span className="block text-[11px] font-semibold text-amber-200/80">
              Coins / Balance
            </span>
          </span>
        </Link>
        <Link
          href="/subscription"
          className="glam-tile glam-tile--violet flex items-center gap-3 rounded-2xl p-4"
        >
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-fuchsia-500 text-xl shadow-md shadow-indigo-500/25"
          >
            👑
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold tracking-wide text-violet-100">SVIP</span>
            <span className="block text-[11px] font-semibold text-violet-200/80">Membership</span>
          </span>
        </Link>
      </section>

      {/* --------------------------------------------- 3. Relationship card */}
      <section
        aria-label="Relationship"
        className="glam-tile glam-tile--aqua relative overflow-hidden rounded-2xl p-4"
      >
        <span aria-hidden className="absolute -right-2 -top-3 text-5xl opacity-25">
          💖
        </span>
        <span aria-hidden className="absolute bottom-1 right-12 text-3xl opacity-20">
          💕
        </span>
        <p className="text-sm font-bold text-white">Friend No Relation</p>
        <p className="mt-0.5 text-xs text-ink-200">
          Connect to unlock couples features together.
        </p>
        <Link
          href="/discover"
          className="mt-3 inline-flex items-center rounded-full border border-white/15 bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-orange-900/30 transition hover:brightness-110"
        >
          Invite
        </Link>
      </section>

      {/* --------------------------------------- 4. Recommended games row */}
      <section aria-labelledby="recommended-games-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recommended-games-heading" className="font-semibold text-white">
            Recommended Games
          </h2>
          <Link
            href="/games"
            aria-label="See all games"
            className="glass-action glass-action--quiet h-8 w-8 justify-center p-0"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <ul className="grid grid-cols-4 gap-3">
          {recommendedGames.map((game) => (
            <li key={game.id}>
              <Link
                href={`/games/${game.id}`}
                aria-label={`Play ${game.title}`}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br ${game.gradient} shadow-lg ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:brightness-110`}
              >
                <span aria-hidden className="text-2xl">
                  {game.emoji}
                </span>
                <span className="px-1 text-center text-[10px] font-bold leading-tight text-white">
                  {game.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------- 5. Quick actions (coloured glass tiles) */}
      <section aria-label="Quick actions" className="grid grid-cols-4 gap-3">
        {[
          { label: "Tasks", emoji: "📋", href: "/moments", tone: "glam-tile--warm" },
          { label: "Income", emoji: "💰", href: "/subscription", tone: "glam-tile--aqua" },
          { label: "Store", emoji: "🛍️", href: "/subscription", tone: "glam-tile--rose" },
          { label: "Aristocracy", emoji: "🏰", href: "/subscription", tone: "glam-tile--violet" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`glam-tile ${action.tone} flex flex-col items-center gap-1.5 rounded-2xl p-3`}
          >
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg shadow-md"
            >
              {action.emoji}
            </span>
            <span className="text-[11px] font-semibold text-white/90">{action.label}</span>
          </Link>
        ))}
      </section>

      {/* --------------------------- 6. Menu rows (metallic hairline frame) */}
      <nav aria-label="Profile menu" className="glam-frame">
        <ul className="glam-frame__inner divide-y divide-white/5 overflow-hidden">
          {menuItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.05]"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-gradient-to-br from-white/12 to-white/[0.02] text-base shadow-sm"
                >
                  {item.emoji}
                </span>
                <span className="flex-1 text-sm font-medium text-white">{item.label}</span>
                {item.trailing ?? null}
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-ink-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ------------------- 7. Media gallery + about (kept from previous layout) */}
      <div id="media" className="glam-tile rounded-2xl p-3">
        <UserMediaGallery uid={session.uid} />
      </div>

      {profile?.bio?.trim() ? (
        <section aria-label="About" className="glam-tile rounded-2xl p-4">
          <h2 className="glam-text mb-1 text-sm font-bold uppercase tracking-wide">About me</h2>
          <p className="text-sm leading-6 text-ink-200">{profile.bio}</p>
        </section>
      ) : null}

      <Link
        href="/profile/edit"
        className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-gradient-to-r from-amber-400/20 via-rose-400/20 to-indigo-400/20 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/30 backdrop-blur-md transition hover:from-amber-400/30 hover:via-rose-400/30 hover:to-indigo-400/30"
      >
        ✏️ Edit personal information
      </Link>
    </div>
  );
}

