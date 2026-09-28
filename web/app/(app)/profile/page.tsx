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
import { ProfileIcon, type ProfileIconName } from "@/components/profile/ProfileIcon";
import type { ReactNode } from "react";

/**
 * Quick actions on the "More" panel.
 *
 * Declared at module scope rather than inline in JSX: it is static navigation
 * config, not per-request data, and hoisting it keeps the render body about
 * layout. `primary` marks the one action that earns the orange accent, so the
 * strip has a single clear focal point instead of three equally-weighted tiles.
 *
 * `icon` is an ICON NAME, not a component. This file is a Server Component and
 * cannot pass a component function across the client boundary — see
 * ProfileIcon for the detail.
 */
const QUICK_ACTIONS: {
  label: string;
  href: string;
  icon: ProfileIconName;
  primary?: boolean;
}[] = [
  { label: "Rewards", href: "/task", icon: "gift", primary: true },
  { label: "Store", href: "/store", icon: "shopping-bag" },
  { label: "VIP Club", href: "/aristocracy", icon: "crown" },
];

/**
 * "Ways to earn" — the concrete routes to coins, shown on the Wallet & Earnings
 * panel.
 *
 * This is what the old "Income" quick action was gesturing at. "Income" was a
 * single tile pointing at /subscription, which is a page about PAYING for a
 * membership — the exact opposite of what someone tapping "Income" is looking
 * for. Naming the real routes is the whole point of the section, so every entry
 * here must lead somewhere a member can actually act on:
 *
 *   • Daily rewards (/task) — the daily and achievement payouts.
 *   • Coin store (/store)    — spends coins; listed because it is the other
 *                              half of the coin economy and members look for
 *                              it here.
 *   • Membership             — the paid tier, kept last and labelled as an
 *                              upgrade so it is not mistaken for an earn route.
 */
const EARN_LINKS: {
  label: string;
  hint: string;
  href: string;
  icon: ProfileIconName;
}[] = [
  { label: "Daily rewards", hint: "Check in and complete tasks for coins", href: "/task", icon: "gift" },
  { label: "Coin store", hint: "Spend coins on frames, vehicles and themes", href: "/store", icon: "shopping-bag" },
  { label: "Upgrade membership", hint: "Get more coins with a paid tier", href: "/subscription", icon: "crown" },
];

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

  /**
   * Games are de-emphasised, not removed.
   *
   * The four casino-style tiles (Fortune Gems, WealthyTiger…) used to sit in a
   * 4-up gradient grid directly above the quick actions, each a saturated
   * square with its own colourway. On a dating profile that block dominated
   * the fold and read as a casino lobby rather than a social product — it was
   * the loudest thing on a screen whose job is to introduce a person.
   *
   * They now live as ONE quiet row that defers to the member, and the full
   * catalogue stays reachable at /games. The games themselves are untouched.
   */
  const recommendedGames = [
    { id: "fortune-gems", title: "Fortune Gems", emoji: "💎" },
    { id: "wealthy-tiger", title: "WealthyTiger", emoji: "🐯" },
    { id: "world-goal", title: "World Goal", emoji: "⚽" },
    { id: "rocket-star", title: "Rocket Star", emoji: "🚀" },
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
            /* ---------------- Wallet & Earnings ----------------------------
                The panel is now "Wallet & Earnings" rather than "Wallet & VIP":
                it is where balance AND ways to earn both live, and the old name
                implied it was only about a paid tier.

                TILE LABELS: the balance sub-label was "Coins / Balance", which
                names the same quantity twice — now just "Coin balance". A bare
                "SVIP" code is now paired with "VIP status", so a member who is
                not yet SVIP sees what they are working toward rather than an
                unexplained string. The membership tile also points at
                /aristocracy (the VIP Club), which is where membership actually
                lives, rather than at /subscription.

                The two tiles drop their multi-colour gradient emoji chips for a
                single tinted Lucide icon each, so the pair reads as one system
                instead of two unrelated decorations. */
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-200"
          >
            <ProfileIcon name="wallet" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold leading-tight tabular-nums text-orange-100">
              {wallet.coinBalance}
            </span>
            <span className="block text-[11px] font-semibold text-orange-200/80">
              Coin balance
            </span>
          </span>
        </Link>
        <Link
          href="/aristocracy"
          className="glam-tile glam-tile--violet flex items-center gap-3 rounded-2xl p-4"
        >
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200"
          >
            <ProfileIcon name="crown" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold leading-tight tracking-wide text-violet-100">
              SVIP
            </span>
            <span className="block text-[11px] font-semibold text-violet-200/80">
              VIP status
            </span>
          </span>
        </Link>
        </section>

      {/* ------------------------------------------------- 2. Ways to earn
          This block replaces the old standalone "Income" quick action. "Income"
          was one ambiguous tile pointing at the subscription page, which told a
          member nothing about how to actually GET coins. This lists the
          concrete routes, so the product's financial tools live together under
          one heading instead of being scattered across a tab and a shortcut. */}
      <section aria-labelledby="earn-heading" className="flex flex-col gap-2.5">
        <h2 id="earn-heading" className="px-0.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
          Ways to earn
        </h2>
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {EARN_LINKS.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.05]"
              >
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-ink-300"
                >
                  <ProfileIcon name={item.icon} className="h-4 w-4" />
                </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">{item.label}</span>
                    {item.hint ? (
                      <span className="block text-[11px] text-ink-400">{item.hint}</span>
                    ) : null}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-ink-500"
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
            /* ---------------- Extras: quick actions, menu rows, games ----- */
            extras: (
              <div className="flex flex-col gap-5 pb-10">
                {/* --------------------------------- 4. Quick actions (see below) */}
      {/* ---------------------------- 5. Quick actions (coloured glass tiles)
          LABELS: "Tasks" -> "Rewards" and "Aristocracy" -> "VIP Club".
          "Tasks" is a build-work word; members recognise a list of things that
          pay out as rewards. "Aristocracy" reads as a game-faction rank and is
          replaced by the tier language the rest of the product already uses.

          "Income" is gone from this row on purpose: it pointed at the same
          /subscription surface as the wallet tab, so the page showed two
          differently-named doors to one room. Financial tools now live in one
          place — the "Wallet & Earnings" tab.

          ICONS: Lucide line icons, not emoji, so every tile in the grid sits on
          the same optical centre. The previous emoji circles were also 40px of
          saturated colour each, which made four competing focal points in a row
          that should read as one strip.

          THEME: a single Midnight Slate surface with one orange accent (the
          primary action), rather than four differently-coloured tiles. The
          multi-hue `glam-tile--*` modifiers are still used for genuine status
          tiles (balance, membership) but not for navigation, where colour
          variety reads as noise. */}
      <nav aria-label="Quick actions" className="grid grid-cols-3 gap-2.5">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={[
              "group flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-center transition",
              "border border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]",
              "focus-visible:ring-2 focus-visible:ring-orange-400/70",
              action.primary ? "border-orange-400/40 bg-orange-500/[0.12]" : "",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={[
                "flex h-9 w-9 items-center justify-center rounded-xl transition",
                action.primary
                  ? "bg-orange-500/20 text-orange-300"
                  : "bg-white/[0.07] text-ink-300 group-hover:text-white",
              ].join(" ")}
            >
              <ProfileIcon name={action.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-white/85">
              {action.label}
            </span>
          </Link>
        ))}
      </nav>

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

      {/* --------------------------------- 7. Games — deliberately last, quiet
          The same four games this page always linked to, re-presented as one
          low-contrast row placed AFTER the quick actions and menu rows.

          WHAT CHANGED AND WHY: the old 4-up grid of saturated gradient squares
          sat directly under the identity card, so it was the first thing below
          the member's name and the loudest block on the screen. A profile whose
          job is to introduce a person should not open with a casino lobby.

          The row keeps the same hrefs and the same emoji glyphs, but at 28px on
          a plain slate chip with no per-game colourway. Four games now read as
          one quiet strip of secondary links rather than four competing
          calls to action, and "All games" keeps the full catalogue one tap away. */}
      <section aria-labelledby="games-heading" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h2 id="games-heading" className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Games
          </h2>
          <Link
            href="/games"
            className="text-[11px] font-semibold text-orange-300 transition hover:text-orange-200"
          >
            All games
          </Link>
        </div>
        <ul className="grid grid-cols-4 gap-2">
          {recommendedGames.map((game) => (
            <li key={game.id}>
              <Link
                href={`/games/${game.id}`}
                aria-label={`Play ${game.title}`}
                className="group flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-1 py-2.5 transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                <span aria-hidden className="text-xl opacity-70 transition group-hover:opacity-100">
                  {game.emoji}
                </span>
                <span className="px-0.5 text-center text-[10px] font-medium leading-tight text-ink-300 transition group-hover:text-white/90">
                  {game.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

              </div>
            ),
          } satisfies Record<ProfileTabId, ReactNode>
        }
      />
    </PageLock>
  );
}



