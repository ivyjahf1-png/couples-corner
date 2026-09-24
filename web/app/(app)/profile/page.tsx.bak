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
      {/* ------------------------------------------------ 1. Header & stats */}
      <section aria-label="Profile header" className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-5 shadow-card">
        <div className="flex items-start gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photos/${session.uid}/${photo?.storagePath?.split("/")?.pop() ?? ""}`}
              alt={name}
              className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-brand-500/40"
            />
          ) : (
            <Avatar name={name} size="lg" className="shrink-0" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-lg font-bold text-white">{name}</h1>
              <span className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">VIP</span>
              <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-300">Lv.{Math.max(1, Math.floor((completion?.percentage ?? 0) / 10))}</span>
            </div>
            <div className="mt-1.5">
              <CopyIdButton value={session.uid} label={`ID: ${shortId}`} />
            </div>
          </div>

          {/* Visitor counter with notification dot */}
          <Link
            href="/likes"
            aria-label={`${stats.visitors} visitors — view visitors`}
            className="relative flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/10"
          >
            <span aria-hidden className="text-base">👣</span>
            <span className="text-[10px] font-bold text-ink-300">{stats.visitors}</span>
            {stats.visitors > 0 ? (
              <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-[#0F172A]" />
            ) : null}
          </Link>
        </div>

        {/* 4-column statistics bar */}
        <dl className="mt-4 grid grid-cols-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {statCells.map((cell, i) => (
            <div key={cell.label} className={`flex flex-col items-center gap-0.5 py-3 ${i > 0 ? "border-l border-white/10" : ""}`}>
              <dd className="text-base font-bold text-white">{cell.value}</dd>
              <dt className="text-[11px] text-ink-400">{cell.label}</dt>
            </div>
          ))}
        </dl>
      </section>
      {/* --------------------------------- 2. Action cards + relationship */}
      <section aria-label="Wallet and membership" className="grid grid-cols-2 gap-3">
        <Link
          href="/subscription"
          className="flex items-center gap-3 rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-300 to-yellow-500 p-4 shadow-lg shadow-amber-500/20 transition hover:brightness-105"
        >
          <span aria-hidden className="text-2xl">🪙</span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold text-amber-950">{wallet.coinBalance}</span>
            <span className="block text-[11px] font-semibold text-amber-900/80">Coins / Balance</span>
          </span>
        </Link>
        <Link
          href="/subscription"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-4 shadow-card transition hover:border-amber-300/40"
        >
          <span aria-hidden className="text-2xl">👑</span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold tracking-wide text-amber-300">SVIP</span>
            <span className="block text-[11px] text-ink-400">Membership</span>
          </span>
        </Link>
      </section>

      <section aria-label="Relationship" className="relative overflow-hidden rounded-2xl border border-sky-300/30 bg-gradient-to-br from-sky-200 to-sky-300 p-4 text-sky-950">
        <span aria-hidden className="absolute -right-2 -top-2 text-5xl opacity-30">💖</span>
        <span aria-hidden className="absolute bottom-1 right-10 text-3xl opacity-25">💕</span>
        <p className="text-sm font-bold">Friend No Relation</p>
        <p className="mt-0.5 text-xs text-sky-900/80">Connect to unlock couples features together.</p>
        <Link
          href="/discover"
          className="mt-3 inline-flex items-center rounded-full bg-slate-950 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-slate-900"
        >
          Invite
        </Link>
      </section>

      {/* --------------------------------------- 3. Recommended games row */}
      <section aria-labelledby="recommended-games-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recommended-games-heading" className="font-semibold text-white">Recommended Games</h2>
          <Link href="/games" aria-label="See all games" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-ink-300 transition hover:bg-white/10 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
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
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br ${game.gradient} shadow-lg transition hover:-translate-y-0.5 hover:brightness-110`}
              >
                <span aria-hidden className="text-2xl">{game.emoji}</span>
                <span className="px-1 text-center text-[10px] font-bold leading-tight text-white">{game.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------ 4. Quick actions + list menu */}
      <section aria-label="Quick actions" className="grid grid-cols-4 gap-3">
        {[
          { label: "Tasks", emoji: "📋", href: "/moments" },
          { label: "Income", emoji: "💰", href: "/subscription" },
          { label: "Store", emoji: "🛍️", href: "/subscription" },
          { label: "Aristocracy", emoji: "🏰", href: "/subscription" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-amber-300/25 bg-gradient-to-b from-amber-400/15 to-transparent p-3 transition hover:border-amber-300/50 hover:bg-amber-400/10"
          >
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-lg shadow-md shadow-amber-500/25">{action.emoji}</span>
            <span className="text-[11px] font-semibold text-amber-200">{action.label}</span>
          </Link>
        ))}
      </section>

      <nav aria-label="Profile menu" className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1E293B] to-[#0F172A] shadow-card">
        <ul className="divide-y divide-white/5">
          {menuItems.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.04]">
                <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-base">{item.emoji}</span>
                <span className="flex-1 text-sm font-medium text-white">{item.label}</span>
                {item.trailing ?? null}
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-500" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Media gallery + about summary (kept from previous layout) */}
      <div id="media">
        <UserMediaGallery uid={session.uid} />
      </div>

      {profile?.bio?.trim() ? (
        <section aria-label="About" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-1 font-semibold text-white">About me</h2>
          <p className="text-sm leading-6 text-ink-300">{profile.bio}</p>
        </section>
      ) : null}

      <Link
        href="/profile/edit"
        className="mx-auto inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-6 py-2.5 text-sm font-semibold text-orange-300 transition hover:border-orange-400 hover:bg-orange-500/20"
      >
        ✏️ Edit personal information
      </Link>
    </div>
  );
}