"use client";

import Link from "next/link";
import { UserMediaGallery } from "@/components/app/UserMediaGallery";
import { Avatar } from "@/components/app/Avatar";
import { ProfileIcon, type ProfileIconName } from "@/components/profile/ProfileIcon";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { formatHeightDetailed, lifestyleLabel } from "@/lib/utils/height";

/** One row of the stats bar. */
export interface ProfileStat {
  label: string;
  value: number;
  /** Optional destination; Visitors and Following both have somewhere to go. */
  href?: string | null;
}

/** Everything the redesigned screen renders. Assembled on the server. */
export interface ProfileScreenData {
  uid: string;
  name: string;
  /** Age derived from dateOfBirth server-side; null when unknown. */
  age: number | null;
  /** Resolved avatar URL, or null to fall back to initials. */
  avatarUrl: string | null;
  bio: string | null;
  stats: ProfileStat[];
  /** "Pets", "Photography" — free text, rendered as pills. */
  interests: string[];
  /** Profession, from the existing `occupation` column. */
  occupation: string | null;
  /** Height in centimetres; formatted here so the client renders no units. */
  heightCm: number | null;
  education: string | null;
  /** Lifestyle ids; labels resolved through lifestyleLabel(). */
  lifestyle: string[];
  /**
   * Token balance.
   *
   * The previous profile page was the ONLY surface in the app that read
   * `getGameWallet`, so removing it wholesale would have made a member's balance
   * invisible everywhere. It is passed in rather than fetched here so this
   * component stays presentational and the Server Component page owns the data
   * call.
   */
  tokenBalance: number;
}

/** Icon for each lifestyle id, so the tag row is not a wall of plain text. */
const LIFESTYLE_ICONS: Record<string, ProfileIconName> = {
  "pet-owner": "pet-owner",
  fitness: "fitness",
  travel: "travel",
  foodie: "foodie",
  music: "music",
  reader: "reader",
  "night-owl": "night-owl",
  "early-bird": "early-bird",
  homebody: "homebody",
  outdoors: "outdoors",
  creative: "creative",
  etelts: "etelts",
};

/* THE ONE HEADER FOR THIS SCREEN.

   Rendered into `PageLock`'s `head` slot (see `app/(app)/profile/page.tsx`), NOT
   inside the scrolling body, so it stays pinned exactly like the global bar it
   replaces.

   WHY IT REPLACES `MobileBackHeader` INSTEAD OF STACKING WITH IT: that component
   renders on `/profile` because the segment is in its allow-list, and it carries
   its own back arrow and title. Left alone, the screen had two bars — the global
   "Profile · Home" bar and this "My Profile" card header — which is the doubled
   chrome this refactor removes. `MobileBackHeader` now returns `null` for
   `/profile`, so there is exactly one header, and it is this one: back button,
   centred "Profile" title, settings gear.

   Both controls are real <Link>s to real routes — back to /dashboard (the
   post-auth landing) and settings to /settings. Neither is decorative. It is
   visible at every breakpoint, because the global bar it supersedes is
   `md:hidden` and would otherwise leave desktop with no header at all. */
export function ProfileHeader() {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-white/5 bg-slate-950/80 px-4 py-3 backdrop-blur">
      <Link
        href="/dashboard"
        aria-label="Back to home"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
      >
        <ProfileIcon name="back" className="h-5 w-5" />
      </Link>

      <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-white">
        Profile
      </h1>

      <Link
        href="/settings"
        aria-label="Settings"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
      >
        <ProfileIcon name="settings" className="h-5 w-5" />
      </Link>
    </header>
  );
}

export function ProfileScreen({ data }: { data: ProfileScreenData }) {
  const { name, age } = data;
  const height = formatHeightDetailed(data.heightCm);

  /* The About-Me attributes are BUILT BY FILTERING, not by hand-writing three
     rows. Every one is optional, and a row reading "Height — Add" for a member who
     has not set it is worse than a shorter section: it advertises the field
     without answering it. Filtering means an empty member simply gets a shorter
     (possibly absent) block and nothing renders a placeholder. */
  const aboutRows: { label: string; value: string; icon: ProfileIconName }[] = [];
  if (height) aboutRows.push({ label: "Height", value: height, icon: "height" });
  if (data.occupation) aboutRows.push({ label: "Profession", value: data.occupation, icon: "profession" });
  if (data.education) aboutRows.push({ label: "Education", value: data.education, icon: "education" });

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── HERO ─────────────────────────────────────────────────────────────
          Avatar, name, bio and stats.

          THE VERIFIED BADGE IS NOT RENDERED, deliberately. There is no
          verification column, no review queue and no admin action that sets one —
          `certified` in the edit page already reads a field that does not exist.
          Printing a tick beside an unverified member is exactly the unearned trust
          signal verification exists to prevent, so it stays out until there is a
          real source to bind it to. The "verified" icon is registered in
          ProfileIcon so adding the badge later is a one-line change here. */}
      <section aria-label="Profile" className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* GOLD/BRONZE GRADIENT RING.
              Two nested spans: the outer carries the gradient and a 2px pad, the
              inner supplies the dark canvas behind a transparent PNG so the ring
              reads as a BORDER rather than a wash over the photo. `p-[2px]` on both
              keeps the ring hairline-thin at any avatar size. */}
          <span
            aria-hidden
            className="block rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-rose-400 p-[2px] shadow-lg shadow-amber-500/20"
          >
            <span className="block rounded-full bg-[#0B1120] p-[2px]">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.avatarUrl}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <Avatar name={name} size="lg" />
              )}
            </span>
          </span>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white">
            {name}
            {/* Comma-separated age, and only when known — omitting it beats
                printing a dangling comma. */}
            {typeof age === "number" ? <span className="text-ink-300">, {age}</span> : null}
          </h2>
          {data.bio?.trim() ? (
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-ink-300">{data.bio}</p>
          ) : null}
        </div>

        {/* STATS. A <dl> because it is genuinely a description list.
            Each cell groups one <dt>/<dd> pair — an <a> may not be a direct child
            of a <dl>, so the link lives INSIDE the <dd>. `flex-col-reverse` puts
            the number on top visually while <dt> still comes first in the DOM, so
            a screen reader announces "Friends, 12" rather than "12, Friends".

            GLASSMORPHIC CARD, not bare `border-y` rules: this row, the Edit
            button and the wallet card below it all use the same
            `bg-slate-900/60` + `border-white/10` + `rounded-2xl` recipe, so the
            three read as one family instead of three different surfaces. */}
        <dl className="grid w-full grid-cols-4 divide-x divide-white/10 rounded-2xl border border-white/10 bg-slate-900/60 px-2 py-1">
          {data.stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse items-center px-1 py-3">
              <dt className="mt-1 text-center text-[10px] font-medium uppercase tracking-wide text-ink-400">
                {stat.label}
              </dt>
              <dd className="text-sm font-bold leading-none tabular-nums text-white">
                {stat.href ? (
                  <Link
                    href={stat.href}
                    aria-label={`${stat.value} ${stat.label.toLowerCase()}`}
                    className="rounded px-1 transition hover:text-orange-300"
                  >
                    {stat.value}
                  </Link>
                ) : (
                  stat.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        {/* EDIT PROFILE. Same glass recipe and the same `px-6` horizontal rhythm
            as the wallet card, so the two controls do not read as different
            weights. `w-full` on mobile: the button used to shrink-wrap, which left
            it visibly narrower than the stats row directly above it. */}
        <Link
          href="/profile/edit"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
        >
          <ProfileIcon name="edit" className="h-4 w-4" />
          Edit Profile
        </Link>
      </section>
      {/* WALLET STRIP.

          Kept because deleting the previous page removed the app's only reader of
          `getGameWallet` — without this, a member's token balance is not visible
          anywhere in the product. It is ONE row linking to a route that already
          exists, rather than the old four-tile financial hub, so the redesign stays
          a profile screen instead of growing a wallet back into it. */}
      <Link
        href="/subscription"
        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-4 transition hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
      >
        <span className="min-w-0">
          <span className="block text-[11px] uppercase tracking-wide text-ink-400">
            Token balance
          </span>
          <span className="block text-lg font-bold leading-tight tabular-nums text-orange-100">
            {data.tokenBalance}
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-orange-300">Manage</span>
      </Link>

      {/* MEDIA. The existing UserMediaGallery is reused wholesale rather than
          reimplemented: it already owns upload, pagination, per-item share to the
          feed and delete-with-confirmation, all against the real `user_media`
          table. A bespoke grid here would have been a second, weaker uploader. */}
      <ProfileSection title="Photos & videos" icon="camera" collapsible defaultOpen>
        <UserMediaGallery uid={data.uid} />
      </ProfileSection>

      {aboutRows.length > 0 ? (
        <ProfileSection title="About Me">
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {aboutRows.map((row) => (
              <li
                key={row.label}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300"
                >
                  <ProfileIcon name={row.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] uppercase tracking-wide text-ink-400">
                    {row.label}
                  </span>
                  {/* `truncate` keeps one long occupation or degree from wrapping
                      to three lines and knocking the grid out of rhythm. */}
                  <span className="block truncate text-sm font-medium text-white">{row.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </ProfileSection>
      ) : null}

      {data.interests.length > 0 ? (
        <ProfileSection title="My Interests">
          <ul className="flex flex-wrap gap-2">
            {data.interests.map((interest) => (
              <li
                key={interest}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm text-ink-200"
              >
                {interest}
              </li>
            ))}
          </ul>
        </ProfileSection>
      ) : null}

      {data.lifestyle.length > 0 ? (
        <ProfileSection title="Lifestyle">
          <ul className="flex flex-wrap gap-2">
            {data.lifestyle.map((id) => (
              <li
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-orange-500/[0.10] px-3 py-1.5 text-xs font-medium text-orange-100"
              >
                {LIFESTYLE_ICONS[id] ? (
                  <ProfileIcon name={LIFESTYLE_ICONS[id]} className="h-3.5 w-3.5 shrink-0" />
                ) : null}
                {lifestyleLabel(id)}
              </li>
            ))}
          </ul>
        </ProfileSection>
      ) : null}
    </div>
  );
}