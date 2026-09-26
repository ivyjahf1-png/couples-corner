import { UserMediaGallery } from "@/components/app/UserMediaGallery";
import { ProfileTabs, type ProfileTabId } from "@/components/app/ProfileTabs";

import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfile } from "@/lib/server/profiles";
import { getProfileStats } from "@/lib/server/profile-stats";
import { getGameWallet } from "@/lib/server/games";
import { computeProfileCompletion } from "@/lib/utils/profile-completion";
import { Avatar } from "@/components/app/Avatar";
import { PageLock } from "@/components/app/PageHeader";
import { PersistentIdBadge } from "@/components/profile/InviteLinkButton";
import { PersistentUserId } from "@/components/profile/InviteLinkButton";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * "Me" - the signed-in member's own profile.
 *
 * Visual contract: a glamorous, luxury dark-canvas interface. An aurora canvas
 * (`.glam-shell`) drifts warm orange, rose, indigo and aqua light behind a
 * metallic conic hairline frame (`.glam-frame`); stats, balances, quick actions
 * and menu rows sit on frosted glass tiles (`.glam-tile`) so every number stays
 * crisp and readable. All motion is decorative (see `prefers-reduced-motion`
 * in app/globals.css).
 *
 * PRESERVATION CONSTRAINT: the data contract is untouched - session lookup,
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
  const shortId = profile?.userCode ?? "—";
  const level = Math.max(1, Math.floor((completion?.percentage ?? 0) / 10));

  const statCells = [
    { label: "Friends", value: stats.friends, href: null },
    { label: "Following", value: stats.following, href: "/discover" },
    { label: "Followers", value: stats.followers, href: null },
    // Visitors is the one stat with somewhere to go, so it is the one link in
    // the row. It used to ALSO render as a separate 48px tile on the right of
    // the identity row, which meant the same number appeared twice on screen.
    { label: "Visitors", value: stats.visitors, href: "/likes" },
  ];

  const recommendedGames = [
    { id: "fortune-gems", title: "Fortune Gems", emoji: "💎", gradient: "from-orange-500 via-amber-400 to-sky-600" },
    { id: "wealthy-tiger", title: "WealthyTiger", emoji: "🐯", gradient: "from-amber-500 via-orange-600 to-rose-600" },
    { id: "world-goal", title: "World Goal", emoji: "⚽", gradient: "from-emerald-500 via-teal-600 to-cyan-700" },
    { id: "rocket-star", title: "Rocket Star", emoji: "🚀", gradient: "from-sky-500 via-blue-600 to-violet-700" },
  ];

  const menuItems: { label: string; emoji: string; href: string; trailing?: ReactNode }[] = [
    { label: "Bag", emoji: "🛍️", href: "/moments" },
    { label: "Level", emoji: "⭐", href: "/subscription" },
    { label: "Badge", emoji: "🏅", href: "/subscription" },
    {
      label: "Certification",
      emoji: "🛡️",
      href: "/profile/edit",
      trailing: <span className="text-xs font-semibold text-danger-400">Uncertified</span>,
    },
    { label: "Customer service", emoji: "🎧", href: "/settings" },
    { label: "User Feedback", emoji: "💬", href: "/feedback" },
    { label: "Settings", emoji: "⚙️", href: "/settings" },
  ];

  return (
    <PageLock
      className="mx-auto w-full max-w-xl"
      bodyClassName="flex flex-col gap-4 pb-10"
      head={
        // The identity card stays pinned; the tabs, stats and gallery below it
        // are the only things that scroll.
        //
        // LAYOUT (compact horizontal): avatar hard left at 56px, everything
        // else — name, VIP, level, public ID, completion — stacked in one
        // column beside it. Nothing wraps onto a third line, and the card's own
        // padding is `px-4 py-3.5` rather than the old `p-5 sm:p-6`, because on
        // a phone this block is competing with the media gallery for vertical
        // space and every row spent here is a row of photos not seen.
        <section aria-label="Profile header" className="glam-shell px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="relative flex items-center gap-3">
          <span className="shrink-0 rounded-full bg-gradient-to-br from-amber-300 via-rose-400 to-indigo-400 p-[2px] shadow-lg shadow-rose-500/20">
            <span className="block rounded-full bg-[#0B1120] p-[2px]">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/photos/${session.uid}/${photo?.storagePath?.split("/")?.pop() ?? ""}`}
                  alt={name}
                  // h-16 exactly, matching `Avatar size="lg"`. The photo and the
                  // initials fallback must be the same size or the card visibly
                  // jumps between members; Avatar's sizes are fixed classes, so
                  // a responsive 56px photo could not be matched responsively.
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <Avatar name={name} size="lg" />
              )}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            {/* Name + VIP + level on ONE line. They used to be a wrapped block
                that could break onto two rows on a narrow phone, which is the
                main reason the old card felt tall. */}
            <div className="flex items-center gap-1.5">
              <h1 className="glam-text truncate text-lg font-extrabold tracking-display sm:text-xl">
                {name}
              </h1>
              <span className="glam-chip shrink-0 px-1.5 py-0.5 text-[10px] font-extrabold">
                VIP
              </span>
              <span className="glass-badge shrink-0 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">
                Lv.{level}
              </span>
            </div>

            {/* Public ID + completion on a single, tighter second line. */}
            <div className="mt-1.5 flex items-center gap-2">
              <PersistentIdBadge userId={session.uid} initialCode={profile?.userCode} />
              <span className="truncate text-[11px] font-medium text-ink-300">
                {completion.percentage}% complete
              </span>
            </div>
          </div>
        </div>

        {/* Completion meter. Thinned to h-1 — it reads as a hairline accent at
            this density rather than a chart, which is all it is. */}
        <div
          role="progressbar"
          aria-label="Profile completion"
          aria-valuenow={completion.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 via-rose-400 to-indigo-400"
            style={{ width: `${Math.max(4, Math.min(100, completion.percentage))}%` }}
          />
        </div>

        {/* Statistics: ONE inline row instead of four boxed tiles.
            Each cell is number-over-label with a hairline divider between, so
            the bar is ~30px tall rather than ~60px plus gaps. The tiles also
            gave every stat equal visual weight, which made a 0 and a 2,400 look
            equally important.

            MARKUP NOTES:
            • Each cell is a <div> grouping one <dt>/<dd> pair, which is what the
              HTML spec allows inside a <dl>. The link lives INSIDE the <dd>
              rather than wrapping the cell, because an <a> as a direct child of
              <dl> is invalid.
            • `dt` comes before `dd` in the DOM and the cell is
              `flex-col-reverse`, so a screen reader announces the category
              before the number while the number still renders on top. */}
        <dl className="relative mt-2.5 flex items-stretch divide-x divide-white/10">
          {statCells.map((cell) => (
            <div
              key={cell.label}
              className="flex flex-1 flex-col-reverse items-center py-1"
            >
              <dt className="mt-1 text-center text-[10px] font-medium uppercase tracking-wide text-ink-400">
                {cell.label}
              </dt>
              <dd className="flex items-center gap-1 text-sm font-extrabold leading-none tabular-nums text-white">
                {cell.href ? (
                  <Link
                    href={cell.href}
                    aria-label={`${cell.value} ${cell.label.toLowerCase()} — view ${cell.label.toLowerCase()}`}
                    className="flex items-center gap-1 rounded px-1 transition hover:bg-white/10"
                  >
                    {cell.value}
                    {cell.label === "Visitors" && cell.value > 0 ? (
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-danger-500" />
                    ) : null}
                  </Link>
                ) : (
                  cell.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      }
    >

      {/* ------------------------------------------------------------------
          TABBED BODY. One category is mounted at a time (see ProfileTabs), so
          the first screen is never the full clutter stack. The identity card
          above stays pinned in PageLock's head slot; only the active panel
          scrolls, inside PageLock's single overflow-y-auto body.
          ------------------------------------------------------------------ */}
      <ProfileTabs
        panels={
          {
            /* ---------------- Profile: media, bio, edit ---------------- */
            profile: (
              <div className="flex flex-col gap-5 pb-10">
                <div id="media" className="glam-tile rounded-2xl p-3">
                  <UserMediaGallery uid={session.uid} />
                </div>

                {profile?.bio?.trim() ? (
                  <section aria-label="About" className="glam-tile rounded-2xl p-4">
                    <h2 className="glam-text mb-1 text-sm font-bold uppercase tracking-wide">
                      About me
                    </h2>
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
            ),
            /* ---------------- Wallet & VIP --------------------------------- */
            wallet: (
              <div className="flex flex-col gap-5 pb-10">
                {/* --------------------------- Balance + membership (glass tiles) */}
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
            📛
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
          💕
        </span>
        <span aria-hidden className="absolute bottom-1 right-12 text-3xl opacity-20">
          📌
        </span>
        <p className="text-sm font-bold text-white">Friend No Relation</p>
        <p className="mt-0.5 text-xs text-ink-200">
          Connect to unlock couples features together.
        </p>
        <PersistentUserId userId={session.uid} initialCode={profile?.userCode} />
      </section>

              </div>
            ),
            /* ---------------- Extras: games, quick actions, menu rows ----- */
            extras: (
              <div className="flex flex-col gap-5 pb-10">
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
          { label: "Tasks", emoji: "📋", href: "/task", tone: "glam-tile--warm" },
          { label: "Income", emoji: "💰", href: "/subscription", tone: "glam-tile--aqua" },
          { label: "Store", emoji: "🛍️", href: "/store", tone: "glam-tile--rose" },
          { label: "Aristocracy", emoji: "🏰", href: "/aristocracy", tone: "glam-tile--violet" },
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

              </div>
            ),
          } satisfies Record<ProfileTabId, ReactNode>
        }
      />
    </PageLock>
  );
}



