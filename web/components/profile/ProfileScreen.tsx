import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import { CopyIdButton } from "@/components/profile/CopyIdButton";
import { ProfileIcon, type ProfileIconName } from "@/components/profile/ProfileIcon";
import { GAMES_REGISTRY } from "@/lib/gamesData";

/**
 * THE PROFILE SCREEN ("Me").
 *
 * â”€â”€ THE LAYOUT RULE THIS FILE EXISTS TO ENFORCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
 * The menu rows that close the card: Badge Â· Certification Â· Customer service Â·
 * User feedback Â· Settings.
 *
 * ONE SHAPE FOR ALL FIVE, and every row goes through the same JSX (see the
 * `MENU_ROWS.map` below). Five hand-copied blocks is how a list like this drifts:
 * one row ends up with `py-3.5` instead of `py-3`, another loses its `shrink-0`
 * and shoves the chevron off the card, a third quietly drops its `href`. Driving
 * them from one array makes that class of bug impossible to write.
 *
 * `status` is OPTIONAL and renders nothing when absent. Certification is the only
 * row that has one ("Uncertified") â€” it is the only row whose value is a state
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

/* A status tone that reads as a LABEL, not an alarm: the old `text-rose-600` is
   a mid-red that disappears against the dark purple card. */
const STATUS_TONE_CLASS: Record<NonNullable<MenuRow["statusTone"]>, string> = {
  warn: "text-[#FFA040]",
  ok: "text-emerald-400",
};

const MENU_ROWS: MenuRow[] = [
  /* Achievements/badges. `/aristocracy` is the existing rank-and-badge screen â€”
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
     account address â€” a real, working destination that needs no new backend. */
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

/** "vip2" â†’ "VIP2"; "free" â†’ null so the VIP tile can show its empty state. */
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
 * THE SHARED SURFACE â€” one radius, one fill, one border, one shadow.
 *
 * DARK PURPLE GLASS over the navy-to-plum canvas ramp, with a hairline at
 * white/[0.08] and a shadow that is nearly black. A solid bg-white here is what
 * an earlier build used, and against a dark page it produced five white
 * rectangles with hard edges - the exact "generic white card" the brand rules
 * forbid.
 *
 * WHY THE FILL IS A TRANSLUCENT DEEP PURPLE, NOT 4% WHITE. The old value was
 * `bg-white/[0.04]`, which lifts any backdrop uniformly and therefore reads as a
 * grey wash rather than as glass — on a canvas that is itself a navy-to-plum
 * gradient it desaturated the whole screen. `bg-[#2A2438]/55` is the brand purple
 * at 55% alpha, so the gradient STILL SHOWS THROUGH the card while the card keeps
 * its own hue. That is what glassmorphism actually means: not "lighter", but
 * "tinted and see-through".
 *
 * 55% rather than something heavier or lighter, because the card has to sit over
 * the ramp's own transition: too transparent and the identity card disappears
 * against the deep top, too opaque and the whole screen flattens into one tone.
 *
 * THE BORDER CARRIES THE SEPARATION when the fill alone is too subtle, which is
 * why `border-white/[0.08]` is not omitted — and 0.08 rather than the old
 * 0.10, which on a purple fill read as a visible outline rather than a hairline.
 *
 * `overflow-hidden` stays part of the token: it is what lets a hairline `border-t`
 * between two bands stay a straight edge instead of poking out past the radius.
 */
const SURFACE =
  "overflow-hidden rounded-2xl border border-white/[0.08] bg-[#2A2438]/55 shadow-[0_1px_2px_rgba(0,0,0,0.45),0_10px_30px_-14px_rgba(0,0,0,0.75)]";

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

/**
 * THE BRAND ORANGE â€” the app's single accent, and the only colour on this screen
 * that is allowed to be saturated.
 *
 * `#FF7A00` rather than the Tailwind `amber-*` ramp this screen used to be built
 * from. Amber and orange are close enough to look like one system until they sit
 * side by side, at which point the coin tile, the VIP tile, the quick-action
 * tiles and the focus ring read as four unrelated decisions. One hue, declared
 * once, is what makes them read as an accent.
 *
 * `#FF7A00` on the `#0F0C1B` canvas is ~7.4:1, comfortably past WCAG AA for large
 * text and UI boundaries; the near-black `#0F0C1B` glyphs ON the orange clear it
 * far more strongly, which is why the tiles keep dark text rather than going
 * white-on-orange (that pairing is only ~2.6:1 and fails).
 *
 * `#C2410C` is the gradient's deep stop â€” the same value as `--brand-800`, so the
 * ramp terminates on a colour the app already ships rather than an invented one.
 */
const ORANGE = "#FF7A00";
const ORANGE_DEEP = "#C2410C";
/** One of the four quick-action tiles. */
interface QuickAction {
  label: string;
  href: string;
  icon: ProfileIconName;
}

/**
 * THE MENU-ROW / QUICK-ACTION ICON CHIP.
 *
 * One token, so the chips down the whole card cannot drift apart. It is a
 * TRANSLUCENT white tile with a near-white glyph rather than a solid orange
 * square: orange is reserved on this screen for the coin glyph, the Invite
 * button and the focus ring, and a column of solid orange chips was turning the
 * accent into the screen's general texture instead of a highlight.
 */
const ICON_CHIP =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.08] text-white";

/** Tasks Â· Income Â· Store Â· Aristocracy. Every href is a real route. */
const QUICK_ACTIONS: QuickAction[] = [
  { label: "Tasks", href: "/task", icon: "tasks" },
  { label: "Income", href: "/task", icon: "wallet" },
  { label: "Store", href: "/store", icon: "store" },
  { label: "Aristocracy", href: "/aristocracy", icon: "crown" },
];

/** A game tile in the Recommended Games grid. */
interface GameTile {
  id: string;
  title: string;
  /** Absolute route — the game is genuinely playable at this path. */
  href: string;
  /** The game's own accent gradient, from the registry. */
  gradient: string;
  /** The game's own glyph, from the registry. */
  emoji: string;
  /** Short registry tagline, used as the tile's accessible description. */
  tagline: string;
}

/**
 * The four titles promoted into the profile's Recommended Games row.
 *
 * THESE ARE NOT INVENTED. Every id below is a real entry in `GAMES_REGISTRY`,
 * which is the same catalogue `GameCenterHub` renders and that `/games/[id]`
 * resolves — so each tile now opens a game that actually loads and plays,
 * instead of the `/store` dead link these tiles carried before.
 *
 * They are resolved BY ID rather than re-declared so the title, gradient, glyph
 * and tagline cannot drift out of step with the hub: change a name in
 * `gamesData.ts` and both surfaces follow.
 *
 * ORDER is deliberate rather than registry order — these four are the
 * Slots/Action titles the hub hides behind its category filter, promoted here as
 * the profile's showcase.
 */
const FEATURED_GAME_IDS = [
  "fortune-gems",
  "wealthy-tiger",
  "world-goal",
  "rocket-star",
] as const;

const GAMES: GameTile[] = FEATURED_GAME_IDS.map((id) => {
  const entry = GAMES_REGISTRY.find((game) => game.id === id);
  /* A missing id is a programming error, not a runtime condition: the ids above
     are compile-time literals checked against a literal array. Returning a
     visible placeholder beats rendering an empty tile with no href. */
  if (!entry) {
    return { id, title: id, href: "/games", gradient: "from-slate-500 to-slate-700", emoji: "🎮", tagline: "Game" };
  }
  return {
    id: entry.id,
    title: entry.title,
    href: `/games/${entry.id}`,
    gradient: entry.gradient,
    emoji: entry.emoji,
    tagline: entry.tagline,
  };
});

/**
 * Header bar pinned above the scroll region.
 *
 * Rendered into `PageLock`'s `head` slot so it stays fixed while the body
 * scrolls. `MobileBackHeader` returns null on `/profile`, so this is the screen's
 * only header rather than a second one stacked under a global bar.
 */
export function ProfileHeader({ name }: { name: string }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-white/10 bg-[#0F0C1B]/80 backdrop-blur-md">
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
       * SURFACE 1 â€” identity and stats, ONE card.
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
            {/* THE NAME WRAPS TO TWO LINES RATHER THAN TRUNCATING. `truncate`
                produced "Greg Willia..." on a narrow phone, which looks like a
                rendering bug rather than a deliberate abbreviation â€” and a member
                cannot recognise a cut-off name on a profile whose entire purpose is
                showing who they are talking to.

                `min-w-0` is what makes wrapping possible at all: without it a flex
                item refuses to shrink below its content width and the line overflows
                instead. `break-words` is the pathological guard for a single
                unbroken handle. The badges beside it are `shrink-0`, so they hold
                their size and the name absorbs the squeeze. */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <p className="line-clamp-2 min-w-0 break-words text-lg font-bold leading-tight text-white">
                {data.name}
              </p>
              {/* A null tier renders nothing rather than a "VIP0" pill â€” "VIP0"
                  would read as a rank the member had earned. */}
              {vip ? (
                <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundImage: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DEEP} 100%)` }}
              >
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
                 non-interactive cell is deliberate â€” `href="#"` would look
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
       * SURFACE 2 â€” wallet and VIP, flush side by side.
       *
       * Equal height comes from BOTH tiles carrying the same `h-[88px]`, not
       * from `items-stretch` (which would stretch content inside them and leave
       * the shorter one's artwork misaligned). The 8px gutter is the only
       * separation, so they read as a pair rather than two cards.
       * ================================================================ */}
      <div className="grid grid-cols-2 gap-2">
        {/* Coin balance. GLASS like every other surface, with the brand orange
            reserved for the coin DISC alone — so the balance reads as white
            primary type with an accent beside it, and the page gradient still
            shows through the tile.

            `hover:bg-[#332B45]/65` rather than `brightness`: the fill is
            translucent, and `brightness` would brighten the gradient behind it
            too, which flickered against the ramp as it scrolled. */}
        <Link
          href="/store"
          aria-label={`Coin balance ${data.coinBalance}. Open store`}
          className={`flex h-[88px] items-center gap-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#2A2438]/55 px-3.5 transition hover:bg-[#332B45]/65 ${FOCUS}`}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: ORANGE }}>
            <ProfileIcon name="coin" className="h-5 w-5 text-[#0F0C1B]" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-2xl font-bold tabular-nums leading-none text-white">
              {data.coinBalance}
            </span>
            <span className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-[#A09AB0]">
              Coins
            </span>
          </span>
        </Link>

        {/* VIP tier. The same GLASS as the coin tile rather than a second solid
            orange block: two saturated fills side by side is what made this pair
            read as two loud buttons rather than one wallet strip. The accent is
            now a low-alpha wash and the tier name is white, so the tile stays
            legible and the gradient still shows through. The gem bleeds off the
            right edge; `overflow-hidden` is what clips it, so it reads as part of
            the artwork rather than a floating icon.

            The gem is white at 85% rather than the pale gold it was: a warm
            highlight ON the purple glass would have been too close to the card's
            own hue and disappeared. White separates by hue, not just lightness. */}
        <Link
          href="/subscription"
          aria-label={vip ? `${vip} membership. Manage subscription` : "Upgrade to VIP"}
          className={`relative flex h-[88px] items-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[#2A2438]/55 px-3.5 transition hover:bg-[#332B45]/65 ${FOCUS}`}
          style={{
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            /* An orange WASH at low alpha, not a solid fill: the tile keeps the
               glass surface and only carries a hint of the accent, so the coin
               glyph stays the loudest element on the pair. */
            backgroundImage: `linear-gradient(135deg, ${ORANGE}22 0%, ${ORANGE_DEEP}33 100%)`,
          }}
        >
          <span className="relative z-10 flex min-w-0 flex-col">
            <span className="text-base font-bold leading-none text-white">
              {vip ?? "Upgrade"}
            </span>
            <span className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-[#A09AB0]">
              {vip ? "Membership" : "Go VIP"}
            </span>
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-1 flex h-16 w-16 items-center justify-center text-white/85"
          >
            <ProfileIcon name="gem" className="h-14 w-14 drop-shadow-lg" />
          </span>
        </Link>
      </div>

      {/* ================================================================ *
       * SURFACE 3 â€” friend relationship banner, full width.
       *
       * Full-bleed across the content column like every other surface, so the
       * left and right edges line up with the cards above and below it. That
       * shared edge is most of what makes a column read as designed rather than
       * assembled.
       * ================================================================ */}
      <section
        aria-label="Friend relationship"
        className={`${SURFACE} relative flex items-center justify-between gap-3 px-4 py-3.5`}
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
          {/* The second heart is VIOLET, not sky. It was `sky-400` when this card
              had a sky-blue fill, where the two hearts read as pink-against-blue.
              On the purple glass the sky sat too close to the card's own hue and
              the pair stopped separating; violet keeps the cool-warm contrast the
              design wants while staying in the screen's palette. */}
          <span className="absolute right-0 top-5 flex h-11 w-11 rotate-6 items-center justify-center text-violet-400">
            <ProfileIcon name="heart" className="h-11 w-11 fill-current" />
          </span>
        </span>
      </section>
       {/* ================================================================ *
       * SURFACE 4 â€” games, quick actions and the two list rows, ONE card.
       *
       * This is where the "lonely boxes" were worst: six separately-bordered
       * cards in a column, each with its own radius and shadow, reading as
       * unrelated fragments. They are now three BANDS of a single surface:
       *
       *     band 1  Recommended Games
       *     â”€â”€â”€â”€â”€â”€â”€ hairline â”€â”€â”€â”€â”€â”€â”€
       *     band 2  Tasks Â· Income Â· Store Â· Aristocracy
       *     â”€â”€â”€â”€â”€â”€â”€ hairline â”€â”€â”€â”€â”€â”€â”€
       *     band 3  Bag Â· Level
       *
       * `border-t` on bands 2 and 3, `divide-y` inside band 3. No margins
       * between them anywhere.
       * ================================================================ */}
      <section aria-label="Games and features" className={SURFACE}>
        {/* Band 1 — Recommended Games. A 4-up grid, not a scroll rail: with
            four titles a rail would clip the fourth and imply content that does
            not exist.
            The tiles are real catalogue entries with real routes (see GAMES),
            not placeholders pointing at the store. */}
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

          {/* `min-w-0` ON THE LIST ITEM IS THE FIX FOR THE CLIPPED RIGHT EDGE.

              A grid item defaults to `min-width: auto`, which means it refuses to
              shrink below its content's width. One long game title therefore widened
              its whole track, and because the grid is `1fr` x 4 the extra width was
              pushed out of the right edge and the fourth tile was cut off - the row
              looked broken rather than scrolled.

              `min-w-0` lets the track shrink to its `1fr` share, the title's
              `line-clamp-1` ellipsizes inside it, and all four tiles stay on screen.
              It is a containment fix, not a layout change: the 4-up grid is kept
              deliberately, because with exactly four titles a scroll rail would clip
              the fourth AND imply content that does not exist. */}
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {GAMES.map((game) => (
              <li key={game.id} className="min-w-0">
                <Link
                  href={game.href}
                  /* The tagline is the tile's accessible name: a screen reader
                     otherwise announces four identical bare numbers-of-a-game with
                     no idea which is which or what playing one involves. */
                  aria-label={`${game.title} — ${game.tagline}`}
                  className={`group flex w-full min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 transition hover:bg-white/[0.06] ${FOCUS}`}
                >
                  {/* THE TILE ARTWORK.

                     Three layers rather than a flat gradient block, because a bare
                     gradient is what made these read as empty placeholders:

                       1. the game's OWN gradient from the registry (distinct per
                          title, and the same one the hub card uses);
                       2. a radial bloom behind the glyph, which stops the middle
                          of the tile reading as flat colour;
                       3. the game's own emoji glyph from the registry, centred.

                     `aria-hidden` because the tile's `aria-label` already names it
                     and an emoji read aloud as a character is noise.

                     HONEST LIMITATION: there are no screenshot or photo assets in
                     this repository — `public/` holds only the three app icons — so
                     this is designed artwork built from the catalogue's own data,
                     not photography. Drop PNGs at `public/games/<id>.png` and add
                     an `image` field to `GameRegistryEntry` to swap in real
                     screenshots; the tile is one `<img>` away from it. */}
                  <span
                    aria-hidden
                    className={`relative block aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br ${game.gradient} shadow-[0_4px_12px_-4px_rgba(15,23,42,0.35)]`}
                  >
                    <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.38),transparent_62%)]" />
                    <span className="absolute inset-0 flex items-center justify-center text-[34px] leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-110">
                      {game.emoji}
                    </span>
                    {/* Bottom vignette so the glyph keeps its contrast against the
                        lighter part of any gradient. */}
                    <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
                  </span>
                  {/* `line-clamp-1` + `title`: a long title ellipsizes to one line
                      rather than wrapping and breaking the row's baseline. */}
                  <span
                    title={game.title}
                    className="line-clamp-1 w-full text-center text-[11px] font-semibold text-white/90"
                  >
                    {game.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* Band 2 — quick actions. Four-up on phone, three-up from `sm`, which is
            what keeps the rows the same visual weight as the game tiles above.
            Hairline-bordered translucent tiles on the shared surface rather than in
            their own floating card, and the chip colour comes from `ICON_CHIP` so
            these match the menu rows below. */}
        <div className="grid grid-cols-4 gap-2 border-t border-white/[0.08] px-4 py-4 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-1 py-2.5 transition hover:bg-[#FF7A00]/10 ${FOCUS}`}
            >
              <span className={`${ICON_CHIP} h-8 w-8 rounded-lg`}>
                <ProfileIcon name={action.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[11px] font-bold text-white">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Band 3 â€” Bag and Level. `divide-y` rules BETWEEN rows only; the band
            above it is separated by its own `border-t`, so there is never a
            doubled line where two rules land on top of each other. */}
        <ul className="divide-y divide-white/[0.08] border-t border-white/[0.08]">
          <li>
            <Link
              href="/store"
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A00] focus-visible:ring-offset-0"
            >
              <span className={ICON_CHIP}>
                <ProfileIcon name="bag" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                Bag
              </span>
              <span className="shrink-0 rounded-full bg-[#FF7A00]/15 px-2 py-0.5 text-[10px] font-bold text-[#FFA040]">
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
              <span className={ICON_CHIP}>
                <ProfileIcon name="level" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                Level
              </span>
              <ProfileIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#A09AB0]/60" />
            </Link>
          </li>
        </ul>

        {/* MENU ROWS â€” Badge, Certification, Customer service, User feedback,
            Settings.

            WHY THESE ARE IN THE *SAME* `<ul>` AND NOT A NEW ONE. This is the whole
            point of the band: `divide-y` rules BETWEEN rows only, so adding rows
            here means each is separated from its neighbour by exactly one
            hairline. Starting a second `<ul>` â€” or a second `<section>` â€” would
            put a `border-t` from the new container directly against the last
            `divide-y` rule of this one, producing a visibly DOUBLED line where
            the two meet. One list is also why the card has no isolated boxes:
            `SURFACE` above carries the radius and `overflow-hidden`, so every row
            added to this list is automatically clipped by the card's own radius.

            THE ICON TILE. Every chip comes from the single `ICON_CHIP` token above, so
            the column of chips reads as one system down the whole card rather than as
            "the first two rows are styled and the rest are not". Each row reuses the
            identical markup via the shared `MENU_ROWS` map below rather than five
            hand-copied blocks — which is what previously let a row drift out of step
            with its neighbours. */}
        <ul className="mt-0">
          {MENU_ROWS.map((row) => (
            <li key={row.label} className="border-t border-white/[0.08]">
            <Link
              href={row.href}
              className={`flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A00] focus-visible:ring-offset-0 ${FOCUS}`}
            >
              <span className={ICON_CHIP}>
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
