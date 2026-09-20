"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GAMES,
  REWARD_CHESTS,
  levelFromBalance,
  levelProgress,
} from "@/lib/games";
import { CATEGORY_TABS, type GameCategory } from "@/lib/gamesData";

/**
 * Game Center hub — header, reward banners and the featured game grid.
 * The coin pill polls /api/games/reward so the balance stays live while
 * chests are claimed or games pay out. Game cards render dynamically from
 * the registry (lib/gamesData.ts) with category filter tabs.
 */

type TabKey = GameCategory | "All";

export function GameCenterHub({
  coinBalance: initialBalance,
  authenticated,
}: {
  coinBalance: number;
  authenticated: boolean;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("All");

  /** Registry-driven, scalable game list filtered by the selected tab. */
  const visibleGames = useMemo(
    () =>
      activeTab === "All"
        ? GAMES
        : GAMES.filter((game) => game.category === activeTab),
    [activeTab]
  );

  const level = levelFromBalance(balance);
  const progress = levelProgress(balance);

  // Keep the coin pill live (cheap poll; also refreshed after actions).
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/games/reward", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { balance?: number };
        if (active && typeof data.balance === "number") setBalance(data.balance);
      } catch {
        // Offline — keep showing the last known balance.
      }
    };
    const id = window.setInterval(poll, 15000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [authenticated]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const claim = useCallback(
    async (rewardId: string) => {
      if (!authenticated) {
        showToast("Sign in to claim your rewards.");
        return;
      }
      try {
        const res = await fetch("/api/games/reward", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "claim", rewardId }),
        });
        const data = (await res.json()) as { balance?: number; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Claim failed");
        if (typeof data.balance === "number") setBalance(data.balance);
        showToast("Reward claimed — coins added to your wallet! 🎉");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Claim failed");
      }
    },
    [authenticated, showToast]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] pb-20 text-white">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1120]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Back to Couple's Corner home"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-lg transition hover:bg-white/10"
            >
              🧩
            </Link>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">Game Center</h1>
              <p className="text-xs text-white/50">Play together, win together</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Level badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-500/20 px-3 py-1.5 text-xs font-bold text-orange-100">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-300" aria-hidden="true" />
              Lv{level}
            </span>
            {/* Live coin balance pill */}
            <span
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-1.5 text-sm font-bold text-amber-200 shadow-lg shadow-amber-900/30"
              aria-live="polite"
            >
              <span aria-hidden="true">🪙</span>
              {balance.toLocaleString()}
            </span>
          </div>
        </div>
        {/* Level progress rail */}
        <div className="h-1 w-full bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-amber-300 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        {/* ── Reward banners ─────────────────────────────────────────── */}
        <section aria-label="Rewards" className="grid gap-4 sm:grid-cols-3">
          {/* Ranking banner */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-[#0B1120]/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Ranking</p>
            <h2 className="mt-1 text-lg font-bold">Couples Cup Leaderboard</h2>
            <p className="mt-1 text-sm text-white/60">Weekly prizes for the top 10 duos.</p>
            <span className="mt-3 inline-block rounded-full bg-indigo-400/20 px-3 py-1 text-xs font-semibold text-indigo-200">
              Season 3 · live
            </span>
            <span className="pointer-events-none absolute -right-4 -top-4 text-7xl opacity-20" aria-hidden="true">🏅</span>
          </div>

          {/* Honor banner */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-[#0B1120]/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">Honor</p>
            <h2 className="mt-1 text-lg font-bold">Hall of Fame</h2>
            <p className="mt-1 text-sm text-white/60">Earn badges for streaks and big wins.</p>
            <span className="mt-3 inline-block rounded-full bg-rose-400/20 px-3 py-1 text-xs font-semibold text-rose-200">
              12 badges to collect
            </span>
            <span className="pointer-events-none absolute -right-4 -top-4 text-7xl opacity-20" aria-hidden="true">👑</span>
          </div>

          {/* Milestone chest banner */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-600/40 via-orange-700/30 to-slate-900/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Unlock</p>
            <h2 className="mt-1 text-lg font-bold">Level 35 Benefits</h2>
            <p className="mt-1 text-sm text-white/60">Milestone chests + a 10% reward boost.</p>
            <span className="mt-3 inline-block rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200">
              {level >= 35 ? "Unlocked!" : `${Math.max(0, 35 - level)} levels to go`}
            </span>
            <span className="pointer-events-none absolute -right-4 -top-4 text-7xl opacity-20" aria-hidden="true">🎁</span>
          </div>
        </section>

        {/* ── Reward chests ──────────────────────────────────────────── */}
        <section aria-label="Reward chests" className="mt-10">
          <h2 className="text-xl font-bold tracking-tight">Reward Chests</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {REWARD_CHESTS.map((chest) => (
              <div
                key={chest.rewardId}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:border-amber-400/40"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${chest.accent} text-2xl shadow-lg`}
                    aria-hidden="true"
                  >
                    {chest.emoji}
                  </span>
                  <div>
                    <h3 className="font-bold">{chest.title}</h3>
                    <p className="text-xs text-white/50">{chest.cooldownLabel}</p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm text-white/60">{chest.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-300">
                    🪙 {chest.coins}
                  </span>
                  <button
                    type="button"
                    onClick={() => claim(chest.rewardId)}
                    className="rounded-xl bg-[#FF5722] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#F4511E] focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Featured game grid ─────────────────────────────────────── */}
        <section aria-label="Featured games" className="mt-12">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold tracking-tight">Featured Games</h2>
            <span className="text-sm text-white/50">{visibleGames.length} games</span>
          </div>

          {/* Category filter tabs — driven by the registry's categories */}
          <div
            role="tablist"
            aria-label="Filter games by category"
            className="mt-4 flex flex-wrap gap-2"
          >
            {CATEGORY_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-[#FF5722] text-white shadow-lg shadow-orange-500/25"
                      : "border border-white/15 bg-white/5 text-white/70 hover:border-orange-400/50 hover:text-orange-200",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleGames.map((game) => (
              <Link
                key={game.slug}
                href={`/games/${game.slug}`}
                aria-label={`Play ${game.title}`}
                className="group relative block overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/40 transition duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-orange-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {/* Glowing gradient banner */}
                <div className={`relative h-40 bg-gradient-to-br ${game.gradient}`}>
                  <span
                    className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.35),_transparent_55%)] opacity-60"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl drop-shadow-2xl transition duration-300 group-hover:scale-110"
                    aria-hidden="true"
                  >
                    {game.emoji}
                  </span>
                  {/* Category tag */}
                  <span
                    className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-lg ${
                      game.tag === "Hot"
                        ? "bg-red-500 text-white"
                        : game.tag === "New"
                          ? "bg-emerald-500 text-white"
                          : game.tag === "Multiplayer"
                            ? "bg-violet-500 text-white"
                            : "bg-amber-400 text-slate-900"
                    }`}
                  >
                    {game.tag}
                  </span>
                  <span className="absolute right-4 top-4 rounded-full border border-white/25 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    🪙 {game.stake} buy-in
                  </span>
                </div>

                {/* Copy */}
                <div className="bg-slate-950/60 p-5 backdrop-blur-md">
                  <h3 className="text-lg font-bold text-white transition group-hover:text-orange-200">
                    {game.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-white/60">{game.tagline}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-400 transition group-hover:gap-2 group-hover:text-orange-300">
                    Play now
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Toast */}
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/90 px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
