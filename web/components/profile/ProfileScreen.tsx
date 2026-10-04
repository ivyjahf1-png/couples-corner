import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import { CopyIdButton } from "@/components/profile/CopyIdButton";
import { ProfileIcon, type ProfileIconName } from "@/components/profile/ProfileIcon";

/**
 * THE PROFILE SCREEN ("Me").
 *
 * ── THE LAYOUT RULE THIS FILE EXISTS TO ENFORCE ────────────────────────────────
 * There are exactly FOUR surfaces on this screen, and the space between them is
 * owned by ONE `gap` on the root column. Nothing nests a second `gap` around a
 * section, and no section carries its own outer margin.
 *
 * The previous version wrapped every section in its own `rounded-2xl bg-white`
 * card and separated them with a stack of one-off margins. The result was a
 * column of floating islands: separate rounded rectangles with their own
 * shadows, none reading as part of the same surface, and vertical rhythm that
 * changed from section to section. A profile is ONE document about ONE person;
 * it should read as one, and the reference design groups it that way.
 *
 *   SURFACE 1  identity + stats        profile row and stat bar share ONE card,
 *                                      split by a hairline, not by a gap
 *   SURFACE 2  wallet + VIP            two tiles side by side, equal height
 *   SURFACE 3  friend banner          full width across the content column
 *   SURFACE 4  games + actions + rows  ONE card, three bands, hairline-separated
 *
 * Inside a surface, bands are separated by `border-t` and `divide-y`, never by
 * margin. That is what makes them read as sections of one object rather than as
 * adjacent boxes.
 *
 * A Server Component: it renders what it is given and fetches nothing. Icons are
 * referenced BY NAME through `ProfileIcon` (a `"use client"` module) because
 * `lucide-react` calls `createContext` at module scope, which does not exist in
 * the RSC module graph. See that file.
 *
 * BOTTOM NAVIGATION IS NOT IN HERE. The app shell renders a fixed tab bar
 * (`BottomNavRegion`) and `AppMain` carries the matching padding. A second bar
 * inside the scroll region would draw a duplicate above the real one.
 */

/**
 * The menu rows that close the card: Badge · Certification · Customer service ·
 * User feedback · Settings.
 *
 * ONE SHAPE FOR ALL FIVE, and every row goes through the same JSX (see the
 * `MENU_ROWS.map` below). Five hand-copied blocks is how a list like this drifts:
 * one row ends up with `py-3.5` instead of `py-3`, another loses its `shrink-0`
 * and shoves the chevron off the card, a third quietly drops its `href`. Driving
 * them from one array makes that class of bug impossible to write.
 *
 * `status` is OPTIONAL and renders nothing when absent. Certification is the only
 * row that has one ("Uncertified") — it is the only row whose value is a state
 * the member can act on, so it is the only one where the answer belongs beside
 * the chevron rather than one tap away.
 *
 * `statusTone` exists so the red is DECLARED rather than hardcoded per row. There
 * is no certification-granted state in this schema yet, so only "warn" is used;
 * the indirection is what lets a green "Certified" land later without touching
 * this component's JSX.
 */
interface MenuRow {
  label: string;
  /** Every href is a real route in `app/(app)/**`. */
  href: string;
  icon: ProfileIconName;
  /** Short status shown right-aligned before the chevron. */
  status?: string;
  /** Colour intent for `status`. */
  statusTone?: "warn" | "ok";
}

const STATUS_TONE_CLASS: Record<NonNullable<MenuRow["statusTone"]>, string> = {
  warn: "text-rose-600",
  ok: "text-emerald-600",
};

const MENU_ROWS: MenuRow[] = [
  /* Achievements/badges. `/aristocracy` is the existing rank-and-badge screen —
     the same destination the desktop sidebar links to for the same concept, so
     the two entry points cannot drift apart. */
  { label: "Badge", href: "/aristocracy", icon: "badge" },
  /* Certification. The status is hardcoded because there is no certification
     column in `profiles` to read yet: claiming a state the database cannot
     support would be a lie. When a real column lands, this becomes a prop on
     `ProfileScreenData` exactly like `vipTier`. */
  {
    label: "Certification",
    href: "/aristocracy",
    icon: "certification",
    status: "Uncertified",
    statusTone: "warn",
  },
  /* No support route exists in this app. Rather than link to something that is
     not support, this row opens the member's own mail client addressed to the
     account address — a real, working destination that needs no new backend. */
  { label: "Customer service", href: "mailto:support@couplescorner.app", icon: "support" },
  /* `/feedback` is a real screen in this app. */
  { label: "User feedback", href: "/feedback", icon: "feedback" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

/** One column of the stats bar. */
export interface ProfileStat {
  label: string;
  value: number;
  /** Optional destination; a stat with no list screen is not a link. */
  href?: string | null;
  /** Renders the red unread dot beside the value. */
  notify?: boolean;
}

/** Everything the screen renders. Assembled on the server by the page. */
export interface ProfileScreenData {
  /** Stable member id, shown as "ID:<uid>" and copied verbatim. */
  uid: string;
  name: string;
  /** Resolved avatar URL, or null to fall back to initials. */
  avatarUrl: string | null;
  /** Friends / Following / Followers / Visitors, in that order. */
  stats: ProfileStat[];
  /**
   * Coin balance. This page was the ONLY reader of `getGameWallet` in the whole
   * app, so dropping the call would make a member's balance invisible on every
   * surface. It now drives the yellow wallet tile.
   */
  coinBalance: number;
  /** Subscription tier, e.g. "free" | "vip1" | "vip2". Drives the VIP tile. */
  vipTier: string;
  /**
   * Friend relationship with the account being viewed, e.g. "No Relation".
   * Rendered verbatim; this product has no mutual-friend state to derive.
   */
  relation: string;
}

/** "vip2" → "VIP2"; "free" → null so the VIP tile can show its empty state. */
function vipLabel(tier: string): string | null {
  const match = /^vip\s*(\d+)$/i.exec(tier.trim());
  return match ? `VIP${match[1]}` : null;
}

/**
 * The shared surface: one radius, one shadow, one background.
 *
 * Declared once and reused by every surface. The previous version repeated the
 * same long class string on each section, which is exactly how two of them drifted
 * apart and started reading as different surfaces. `overflow-hidden` is part of the
 * token rather than an afterthought: it is what lets a hairline `border-t` between
 * two bands stay a straight edge instead of poking out past the radius.
 */
/**
 * THE SHARED SURFACE — one radius, one fill, one border, one shadow.
 *
 * DARK GLASS. `bg-white/[0.04]` over the `#0F0C1B` canvas, with a hairline at
 * `white/10` and a shadow that is nearly black. A solid `bg-white` here is what
 * the previous build used, and against a dark page it produced five white
 * rectangles with hard edges — the exact "generic white card" the brand rules
 * forbid.
 *
 * WHY THE FILL IS 4% WHITE AND NOT `#1A1429`. A flat `#1A1429` is indistinguishable
 * from the canvas at low contrast on cheap panels, so the cards stop reading as
 * cards. Translucent white lifts the fill proportionally on every display while
 * keeping the underlying hue, which is what "glassmorphism" actually means. The
 * BORDER is what carries the separation when the fill alone is too subtle, which
 * is why it is not omitted.
 *
 * `overflow-hidden` stays part of the token: it is what lets a hairline `border-t`
 * between two bands stay a straight edge instead of poking out past the radius.
 */
const SURFACE =
  "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_-12px_rgba(0,0,0,0.6)]";

/**
 * Focus ring on the brand orange.
 *
 * ORANGE rather than amber-yellow: `#FF7A00` against `#0F0C1B` is ~7.4:1, while
 * `#fbbf24` sits at ~11:1 but is the same hue as the gold wallet tile and so
 * stopped reading as "you are focused here" the moment that tile was on screen.
 * `ring-offset` in the canvas colour keeps the ring visible against a dark card
 * instead of merging into it.
 */
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0C1B]";
/** One of the four quick-action tiles. */
interface QuickAction {
  label: string;
  href: string;
  icon: ProfileIconName;
}

/** Tasks · Income · Store · Aristocracy. Every href is a real route. */
const QUICK_ACTIONS: QuickAction[] = [
  { label: "Tasks", href: "/task", icon: "tasks" },
  { label: "Income", href: "/task", icon: "wallet" },
  { label: "Store", href: "/store", icon: "store" },
  { label: "Aristocracy", href: "/aristocracy", icon: "crown" },
];

/** A game tile in the Recommended Games grid. */
interface GameTile {
  title: string;
  href: string;
  /** Tailwind gradient classes standing in for the game's artwork. */
  gradient: string;
}

/**
 * Recommended Games.
 *
 * Presentation tiles, not a live catalogue: there is no games table in this
 * schema to read and no per-game route, so every tile points at the store. Swap
 * `href` for a real route when one exists.
 */
const GAMES: GameTile[] = [
  { title: "Fortune Gems", href: "/store", gradient: "from-fuchsia-500 to-purple-700" },
  { title: "WealthyTiger", href: "/store", gradient: "from-amber-400 to-orange-600" },
  { title: "World Goal", href: "/store", gradient: "from-sky-400 to-blue-700" },
  { title: "Rocket Star", href: "/store", gradient: "from-rose-400 to-red-700" },
];

/**
 * Header bar pinned above the scroll region.
 *
 * Rendered into `PageLock`'s `head` slot so it stays fixed while the body
 * scrolls. `MobileBackHeader` returns null on `/profile`, so this is the screen's
 * only header rather than a second one stacked under a global bar.
 */
export function ProfileHeader({ name }: { name: string }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-white/10 bg-[#0F0C1B]">
      <h1 className="truncate px-4 text-base font-bold text-white">{name}</h1>
      <Link
        href="/settings"
        aria-label="Settings"
        className={`mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#A09AB0] transition hover:bg-white/10 hover:text-white ${FOCUS}`}
      >
        <ProfileIcon name="settings" className="h-5 w-5" />
      </Link>
    </div>
  );
}
export function ProfileScreen({ data }: { data: ProfileScreenData }) {
  const vip = vipLabel(data.vipTier);

  return (
    /* THE ONLY GAP ON THIS SCREEN. Every vertical rhythm decision is made here;
       no descendant adds an outer margin of its own. */
    <div className="flex flex-col gap-3 pb-2">
      {/* ================================================================ *
       * SURFACE 1 — identity and stats, ONE card.
       *
       * The profile row and the stat bar are separated by `border-t`, NOT by a
       * gap. That single change is what stops them reading as two boxes: they
       * share one radius, one shadow and one background, so the eye reads one
       * panel with a rule inside it.
       * ================================================================ */}
      <section aria-label="Profile" className={SURFACE}>
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/profile/edit"
            aria-label="Edit profile"
            className={`shrink-0 rounded-full transition hover:opacity-80 ${FOCUS}`}
          >
            <Avatar name={data.name} src={data.avatarUrl} size="lg" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-lg font-bold text-white">{data.name}</p>
              {/* A null tier renders nothing rather than a "VIP0" pill — "VIP0"
                  would read as a rank the member had earned. */}
              {vip ? (
                <span className="shrink-0 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {vip}
                </span>
              ) : null}
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <ProfileIcon name="leaf" className="h-2.5 w-2.5" />
              </span>
            </div>
            <CopyIdButton value={data.uid} />
          </div>

          <Link
            href="/profile/edit"
            aria-label="View and edit profile"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#A09AB0] transition hover:bg-white/10 hover:text-white ${FOCUS}`}
          >
            <ProfileIcon name="chevron-right" className="h-5 w-5" />
          </Link>
        </div>

        {/* `divide-x` gives each stat a hairline without a wrapper per cell, so
            the four columns stay ONE grid rather than four floating items. */}
        <div className="grid grid-cols-4 divide-x divide-white/[0.08] border-t border-white/[0.08]">
          {data.stats.map((stat) => {
            const body = (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-base font-bold tabular-nums text-white">
                    {stat.value}
                  </span>
                  {/* `aria-hidden`: the value above is already announced, so the
                      dot is a peripheral cue and a node would just repeat it. */}
                  {stat.notify ? (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  ) : null}
                </span>
                <span className="mt-0.5 text-[11px] font-medium text-[#A09AB0]">
                  {stat.label}
                </span>
              </>
            );

            return stat.href ? (
              <Link
                key={stat.label}
                href={stat.href}
                aria-label={`${stat.value} ${stat.label}`}
                className={`flex flex-col items-center gap-0.5 py-3 transition hover:bg-white/[0.06] ${FOCUS}`}
              >
                {body}
              </Link>
            ) : (
              /* Friends and Followers have no dedicated list screen in this app. A
                 non-interactive cell is deliberate — `href="#"` would look
                 tappable and do nothing. */
              <div
                key={stat.label}
                className="flex flex-col items-center gap-0.5 px-0.5 py-3"
              >
                {body}
              </div>
            );
          })}
        </div>
      </section>
{/* ================================================================ *
       * SURFACE 2 — wallet and VIP, flush side by side.
       *
       * Equal height comes from BOTH tiles carrying the same `h-[88px]`, not
       * from `items-stretch` (which would stretch content inside them and leave
       * the shorter one's artwork misaligned). The 8px gutter is the only
       * separation, so they read as a pair rather than two cards.
       * ================================================================ */}
      <div className="grid grid-cols-2 gap-2">
        {/* Coin balance. Bright yellow with a black glyph — the loudest element
            on the screen, which is why the number is 2xl rather than body size. */}
        <Link
          href="/store"
          aria-label={`Coin balance ${data.coinBalance}. Open store`}
          className={`flex h-[88px] items-center gap-2 overflow-hidden rounded-2xl bg-amber-400 px-3.5 transition hover:bg-amber-500 ${FOCUS}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/15 text-[#0F0C1B]">
            <ProfileIcon name="coin" className="h-5 w-5" />
          </span>
          <span className="text-2xl font-bold tabular-nums text-[#0F0C1B]">
            {data.coinBalance}
          </span>
        </Link>

        {/* VIP tier. Dark bronze/gold with the gem bleeding off the right edge;
            `overflow-hidden` is what clips it, so the gem reads as part of the
            artwork rather than a floating icon. */}
        <Link
          href="/subscription"
          aria-label={vip ? `${vip} membership. Manage subscription` : "Upgrade to VIP"}
          className={`relative flex h-[88px] items-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-yellow-900 px-3.5 transition hover:brightness-110 ${FOCUS}`}
        >
          <span className="relative z-10 text-sm font-bold text-amber-50">
            {vip ?? "Upgrade"}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-1 flex h-16 w-16 items-center justify-center text-amber-200/90"
          >
            <ProfileIcon name="gem" className="h-14 w-14 drop-shadow-lg" />
          </span>
        </Link>
      </div>

      {/* ================================================================ *
       * SURFACE 3 — friend relationship banner, full width.
       *
       * Full-bleed across the content column like every other surface, so the
       * left and right edges line up with the cards above and below it. That
       * shared edge is most of what makes a column read as designed rather than
       * assembled.
       * ================================================================ */}
      <section
        aria-label="Friend relationship"
        className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 bg-sky-500/[0.12] px-4 py-3.5"
      >
        <div className="relative z-10 min-w-0">
          <p className="text-sm font-bold text-white">
            Friend: <span className="font-semibold">{data.relation}</span>
          </p>
          <Link
            href="/invite"
            className="mt-2 inline-flex min-h-9 items-center rounded-full bg-[#FF7A00] px-5 py-1.5 text-xs font-bold text-[#0F0C1B] transition hover:bg-[#FF9500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0C1B]"
          >
            Invite
          </Link>
        </div>

        {/* Overlapping pink/blue hearts. Decorative and behind the copy, hence
            `aria-hidden` plus `pointer-events-none` so the Invite button stays
            tappable where the shapes overlap it. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-1 top-1/2 -translate-y-1/2"
        >
          <span className="absolute right-5 top-0 flex h-9 w-9 -rotate-12 items-center justify-center text-pink-400">
            <ProfileIcon name="heart" className="h-9 w-9 fill-current" />
          </span>
          <span className="absolute right-0 top-5 flex h-11 w-11 rotate-6 items-center justify-center text-sky-400">
            <ProfileIcon name="heart" className="h-11 w-11 fill-current" />
          </span>
        </span>
      </section>
{/* ================================================================ *
       * SURFACE 4 — games, quick actions and the two list rows, ONE card.
       *
       * This is where the "lonely boxes" were worst: six separately-bordered
       * cards in a column, each with its own radius and shadow, reading as
       * unrelated fragments. They are now three BANDS of a single surface:
       *
       *     band 1  Recommended Games
       *     ─────── hairline ───────
       *     band 2  Tasks · Income · Store · Aristocracy
       *     ─────── hairline ───────
       *     band 3  Bag · Level
       *
       * `border-t` on bands 2 and 3, `divide-y` inside band 3. No margins
       * between them anywhere.
       * ================================================================ */}
      <section aria-label="Games and features" className={SURFACE}>
        {/* Band 1 — Recommended Games. A 4-up grid, not a scroll rail: with
            exactly four titles a rail would clip the fourth and imply content
            that does not exist. */}
        <div className="px-4 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Recommended Games</h2>
            <Link
              href="/store"
              aria-label="See all games"
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[#A09AB0] transition hover:bg-white/10 hover:text-white ${FOCUS}`}
            >
              <ProfileIcon name="chevron-right" className="h-5 w-5" />
            </Link>
          </div>

          <ul className="mt-3 grid grid-cols-4 gap-2">
            {GAMES.map((game) => (
              <li key={game.title}>
                <Link
                  href={game.href}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition hover:bg-white/[0.06] ${FOCUS}`}
                >
                  <span
                    aria-hidden
                    className={`block aspect-square w-full rounded-xl bg-gradient-to-br ${game.gradient} shadow-[0_4px_12px_-4px_rgba(15,23,42,0.35)]`}
                  />
                  {/* `line-clamp-1` + `title`: a long title ellipsizes to one line
                      rather than wrapping and breaking the row's baseline. */}
                  <span
                    title={game.title}
                    className="line-clamp-1 w-full text-center text-[11px] font-semibold text-[#E0E0E0]"
                  >
                    {game.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Band 2 — quick actions. Bold black outlines, yellow icon chips, on
            the shared surface rather than in their own floating card. */}
        <div className="grid grid-cols-4 gap-2 border-t border-white/[0.08] px-4 py-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-white/15 bg-white/[0.06] px-1 py-2.5 transition hover:bg-[#FF7A00]/10 ${FOCUS}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-[#0F0C1B]">
                <ProfileIcon name={action.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[11px] font-bold text-white">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Band 3 — Bag and Level. `divide-y` rules BETWEEN rows only; the band
            above it is separated by its own `border-t`, so there is never a
            doubled line where two rules land on top of each other. */}
        <ul className="divide-y divide-white/[0.08] border-t border-white/[0.08]">
          <li>
            <Link
              href="/store"
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A00] focus-visible:ring-offset-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-[#0F0C1B]">
                <ProfileIcon name="bag" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                Bag
              </span>
              <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                Game
              </span>
              <ProfileIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#A09AB0]/60" />
            </Link>
          </li>

          <li>
            <Link
              href="/task"
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A00] focus-visible:ring-offset-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-[#0F0C1B]">
                <ProfileIcon name="level" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                Level
              </span>
              <ProfileIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#A09AB0]/60" />
            </Link>
          </li>
        </ul>

        {/* MENU ROWS — Badge, Certification, Customer service, User feedback,
            Settings.

            WHY THESE ARE IN THE *SAME* `<ul>` AND NOT A NEW ONE. This is the whole
            point of the band: `divide-y` rules BETWEEN rows only, so adding rows
            here means each is separated from its neighbour by exactly one
            hairline. Starting a second `<ul>` — or a second `<section>` — would
            put a `border-t` from the new container directly against the last
            `divide-y` rule of this one, producing a visibly DOUBLED line where
            the two meet. One list is also why the card has no isolated boxes:
            `SURFACE` above carries the radius and `overflow-hidden`, so every row
            added to this list is automatically clipped by the card's own radius.

            THE ICON TILE. `bg-amber-400` matches Bag and Level above, so the
            column of yellow tiles reads as one system down the whole card rather
            than as "the first two rows are styled and the rest are not". Each
            row reuses the identical markup via the shared `MENU_ROWS` map below
            rather than five hand-copied blocks — which is what previously let a
            row drift out of step with its neighbours. */}
        <ul className="mt-0">
          {MENU_ROWS.map((row) => (
            <li key={row.label} className="border-t border-white/[0.08]">
            <Link
              href={row.href}
              className={`flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A00] focus-visible:ring-offset-0 ${FOCUS}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-[#0F0C1B]">
                <ProfileIcon name={row.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                {row.label}
              </span>
              {/* INLINE INDICATOR, before the chevron. `shrink-0` keeps the
                  chevron pinned right no matter how long the status text is; the
                  label above is `flex-1 truncate`, so a long translation of either
                  text ellipsizes instead of pushing the chevron off the card. */}
              {row.status ? (
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    STATUS_TONE_CLASS[row.statusTone ?? "warn"]
                  }`}
                >
                  {row.status}
                </span>
              ) : null}
              <ProfileIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#A09AB0]/60" />
            </Link>
          </li>
        ))}
          </ul>
      </section>
    </div>
  );
}