"use client";

import { useEffect, useState } from "react";
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
   * Where the member is. Rendered as a pill under the name and age — the single
   * most-scanned fact on a dating profile, which is why it sits in the hero
   * rather than in a section the member has to scroll to find.
   */
  location: string | null;
  /** Country, shown as its own pill. Often the only place a member is from. */
  country: string | null;
  /**
   * Relationship metadata. All four are free-text columns the member fills in,
   * so each is nullable and each is rendered only when set — a card reading
   * "Relationship status — " for a member who has not answered is worse than a
   * shorter card.
   */
  relationshipStatus: string | null;
  /** "single" | "coupled" | "open" — the account type. */
  profileType: string | null;
  /** What the member is looking for, in their own words. */
  lookingFor: string | null;
  gender: string | null;
  orientation: string | null;
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
   replaces. `MobileBackHeader` returns `null` for `/profile`, so there is
   exactly one header on this route.

   ── WHY IT IS A CLIENT COMPONENT ────────────────────────────────────────────
   Only for the scroll listener. Everything it renders is otherwise static JSX,
   and the member's name arrives as a prop from the server page, so no data
   fetching and no extra client boundary is introduced.

   ── WHY THE SCROLL CONTAINER IS FOUND BY DOM, NOT ASSUMED TO BE `window` ────
   On this route `document` does not scroll. `PageLock` makes `.page-lock__body`
   the single `overflow-y-auto` region, and the app shell clamps the document to
   `h-full overflow-hidden`. A listener bound to `window` would therefore never
   fire and the title would never appear — a silent no-op that looks like a
   broken feature.

   So the header walks up to its `.page-lock` ancestor and listens on the
   `.page-lock__body` inside it. That is the element that actually moves, and it
   is discovered rather than hard-coded so a future wrapper cannot silently break
   this again.

   ── WHY THE OBSERVER TARGETS THE HERO, NOT A PIXEL COUNT ────────────────────
   `IntersectionObserver` on the hero heading fires when the NAME ITSELF leaves
   the viewport — i.e. exactly the moment the title is worth showing. A fixed
   `scrollTop > 120` threshold cannot know how tall the hero is: it would fire
   early on a member with a long bio and never at all on a short one. The
   observer is state-driven instead of position-driven, so the transition lands
   at the right moment for every profile.
*/
export function ProfileHeader({ name }: { name: string }) {
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("profile-hero-name");
    if (!hero) return;

    // Resolve the scroll region the same way the observer's root does: if the
    // hero is inside a `.page-lock__body`, observe against THAT element, so
    // "left the viewport" means "left the scroll region" rather than the window.
    const body = hero.closest(".page-lock__body");

    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      {
        root: body,
        // Fire only once the heading is genuinely gone, not as its last pixel
        // clips the edge — otherwise the title flickers while the avatar is
        // still on screen.
        threshold: 0,
        rootMargin: "0px 0px -24px 0px",
      }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // The settings gear keeps the bar's right-hand slot. The back button is
  // REMOVED, not hidden: `Profile` is a primary tab in the bottom nav, so a
  // back arrow implied somewhere more important exists, and an invisible 44px
  // target would eat the row's gutter and swallow taps with no affordance.
  // Navigation is one tap away in the nav directly below.
  // `relative` on the heading is REQUIRED: the two stacked spans below are
  // `absolute`, so without a positioned ancestor they would resolve against the
  // header and paint over the settings gear.
  const title = (
    <h1
      className={[
        /* LEFT-ALIGNED, not centred. The bar is now "Profile" on the left and the
           gear on the right, so a centred title would float between two things
           that are not symmetrical — it read as unanchored. `text-left` plus
           `min-w-0 flex-1 truncate` keeps a long member name ellipsizing in
           place rather than shoving the gear off the edge. */
        "relative min-w-0 flex-1 truncate text-left font-semibold text-white transition-all duration-300 ease-out motion-reduce:transition-none",
        condensed ? "text-base" : "text-lg",
      ].join(" ")}
    >
      {/* The name CROSS-FADES in over "Profile" rather than replacing it in the
          DOM, so the bar never changes width and the gear never shifts. Both
          are always mounted and stacked; only opacity and vertical offset move,
          which is what makes it read as a transition rather than a swap.

          The name is still centred WITHIN its own left-aligned slot via
          `absolute inset-0 text-center` on the condensed span, so it stays
          optically centred against the gear while "Profile" itself sits hard
          left. */}
      <span
        className={[
          "block transition-all duration-300 ease-out motion-reduce:transition-none",
          condensed ? "absolute inset-0 translate-y-0 text-center opacity-100" : "pointer-events-none absolute translate-y-2 opacity-0",
        ].join(" ")}
      >
        {name}
      </span>
      <span
        className={[
          "block transition-all duration-300 ease-out motion-reduce:transition-none",
          condensed ? "pointer-events-none absolute translate-y-2 opacity-0" : "translate-y-0 opacity-100",
        ].join(" ")}
        aria-hidden={condensed}
      >
        Profile
      </span>
    </h1>
  );

  return (
    /* THE STICKY BAR.

       `sticky top-0 z-50` is REQUIRED by the spec, and it is also what makes the
       bar behave correctly now that this header carries the full glass treatment:
       it must stay above the media grid's hover overlays and above the sticky
       cards further down. `z-50` matches the shell's nav tier, so the bar sits at
       the same level as the app chrome rather than punching through it.

       `bg-slate-950/80` + `backdrop-blur-md` gives the frosted-glass read while
       the content scrolls beneath it. The CONDENSED state raises the opacity to
       /95 and adds a shadow: at /80 the cards passing underneath stay faintly
       legible through the blur, which reads as a rendering fault rather than a
       deliberate surface. Exactly as on the Messages screen. */
    <header
      className={[
        "sticky top-0 z-50 flex items-center gap-3 border-b bg-slate-950/80 px-4 py-2.5 backdrop-blur-md transition-colors duration-300 motion-reduce:transition-none",
        condensed ? "border-orange-500/30 bg-slate-950/95 shadow-lg shadow-black/40" : "border-white/5",
      ].join(" ")}
    >
      {/* `aria-live="polite"` so the title change is announced once, not on every
          scroll frame. `sr-only` text keeps a screen-reader user informed of which
          member's profile they are on without relying on the visual cross-fade. */}
      <p aria-live="polite" className="sr-only">
        {condensed ? `${name} profile` : "Profile"}
      </p>

      {title}

      <Link
        href="/settings"
        aria-label="Settings"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-white transition hover:border-orange-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
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

  /* RELATIONSHIP GOALS, BUILT BY FILTERING, for the same reason as `aboutRows`:
     a "Relationship status —" row with nothing after it is worse than an absent
     section. These four columns are free text, so each is checked and trimmed
     individually and the card simply shrinks as members answer less. */
  const relationshipRows: { label: string; value: string; icon: ProfileIconName }[] = [];
  /* Icons are drawn from the ALREADY-REGISTERED set rather than adding three
     near-duplicate glyphs. `ProfileIconName` is a union with a `Record` behind
     it, so an unregistered name is a compile error rather than a blank square —
     which is how "profile" was caught here. Status and orientation share the
     heart; profile type takes the crown; gender reuses the profession mark. */
  if (data.relationshipStatus?.trim())
    relationshipRows.push({ label: "Status", value: data.relationshipStatus, icon: "heart-goal" });
  if (data.profileType?.trim())
    relationshipRows.push({ label: "Profile type", value: data.profileType, icon: "crown" });
  if (data.gender?.trim())
    relationshipRows.push({ label: "Gender", value: data.gender, icon: "profession" });
  if (data.orientation?.trim())
    relationshipRows.push({ label: "Orientation", value: data.orientation, icon: "heart-goal" });

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
          {/* `id` is the CONTRACT with `ProfileHeader`'s IntersectionObserver,
              which watches this exact node to decide when the member's name has
              scrolled out of view. Both halves must change together: renaming the
              id here without updating the observer leaves the sticky title
              permanently off, and it fails silently because the observer simply
              never finds its target. */}
          <h2 id="profile-hero-name" className="text-xl font-bold text-white">
            {name}
            {/* Comma-separated age, and only when known — omitting it beats
                printing a dangling comma. */}
            {typeof age === "number" ? <span className="text-ink-300">, {age}</span> : null}
          </h2>

          {/* LOCATION PILLS, directly under the name.

              Location and country are SEPARATE PILLS, not one joined string. They
              are independent columns and a member may well have set only one, so
              each is filtered individually: someone who typed "Lagos" and nothing
              else gets exactly one pill rather than "Lagos, " with a dangling
              comma. `key` is the value itself, which is safe here because the
              same text in both columns is the same pill.

              Rendered only when at least one exists: a member who has not set a
              location gets no row at all, rather than a row of placeholder
              chips that advertises a field without answering it. */}
          {data.location || data.country ? (
            <ul className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {[data.location, data.country].filter(Boolean).map((place) => (
                <li
                  key={place}
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-100"
                >
                  <ProfileIcon name="location" className="h-3.5 w-3.5 shrink-0 text-orange-300" />
                  {place}
                </li>
              ))}
            </ul>
          ) : null}

          {data.bio?.trim() ? (
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-300">{data.bio}</p>
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
          table. A bespoke grid here would have been a second, weaker uploader.

          It is now a NON-collapsible section that is always open. It was a
          disclosure before, which meant the grid — the most visually persuasive
          part of a dating profile — sat behind a tap on every visit, and the
          spec explicitly asks for it expanded into a real gallery. The upload
          affordance inside is the only control a member needs here, so there is
          nothing left for a chevron to toggle. */}
      <ProfileSection title="Photos & videos" icon="camera">
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

      {/* `outdoors`, not `sparkle`: "sparkle" is a name in the landing `Icon`
          set, not in `ProfileIconName`, and the union makes that a type error
          rather than a blank square. `outdoors` is the registered sparkles
          glyph, so the interests header still gets its amber mark. */}
      {data.interests.length > 0 ? (
        <ProfileSection title="Interests" icon="outdoors">
          {/* `break-words` on each pill: interests are free text typed by the
              member, so a long one like "Distributed systems and espresso" must
              wrap inside its own pill rather than stretching the row. */}
          <ul className="flex flex-wrap gap-2">
            {data.interests.map((interest) => (
              <li
                key={interest}
                className="max-w-full break-words rounded-full border border-orange-500/25 bg-orange-500/[0.08] px-3.5 py-1.5 text-sm text-orange-100"
              >
                {interest}
              </li>
            ))}
          </ul>
        </ProfileSection>
      ) : null}

      {/* ── RELATIONSHIP GOALS & PREFERENCES ──────────────────────────────────
          The spec's third rich card. Every field is BUILT BY FILTERING, exactly
          as `aboutRows` is, so a member who has answered nothing gets no card
          rather than a card of empty labels.

          `lookingFor` is set apart from the rest because it is the only field
          here written in the member's own words — it is their sentence, not a
          taxonomy value — so it gets its own full-width block instead of a
          label/value tile that would truncate it. */}
      {relationshipRows.length > 0 ? (
        <ProfileSection title="Relationship goals" icon="heart-goal">
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {relationshipRows.map((row) => (
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
                  <span className="block truncate text-sm font-medium capitalize text-white">
                    {row.value}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {data.lookingFor?.trim() ? (
            <div className="mt-2.5 rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] px-3.5 py-3">
              <span className="block text-[11px] uppercase tracking-wide text-orange-300/80">
                Looking for
              </span>
              {/* Not truncated — this is the member's own sentence and is the
                  most human line on the whole card. */}
              <p className="mt-1 text-sm leading-6 text-orange-50">{data.lookingFor}</p>
            </div>
          ) : null}
        </ProfileSection>
      ) : data.lookingFor?.trim() ? (
        /* `lookingFor` alone still earns a card. The `else` branch means a
           member whose only answered field is the one thing they wrote in their
           own words still sees it, instead of having it silently dropped
           because no taxonomy value was set. */
        <ProfileSection title="Relationship goals" icon="heart-goal">
          <p className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] px-3.5 py-3 text-sm leading-6 text-orange-50">
            {data.lookingFor}
          </p>
        </ProfileSection>
      ) : null}

      {data.lifestyle.length > 0 ? (
        <ProfileSection title="Lifestyle" icon="travel">
          {/* THE SPEC ASKS FOR "LIFESTYLE VERIFICATION BADGES". THERE IS NO
              VERIFICATION IN THIS PRODUCT.

              There is no verification column, no review queue, and no admin action
              that sets one — `ConversationParticipantSummary.verified` is
              hard-coded `false` with a comment saying exactly that, and the
              hero's verified badge was removed from this file for the same reason
              (see the HERO comment). Rendering a tick beside a self-declared tag
              would be the unearned trust signal verification exists to prevent:
              the member picks their own tags and could pick any of them, so a
              "verified" tick would be a lie the product cannot back.

              So the tags render as badges — visually strong, orange, the shape
              the brief asked for — without a verification claim attached. The
              `verified` icon stays registered in ProfileIcon, so if a real
              verification source ever lands this is a one-line change. */}
          <ul className="flex flex-wrap gap-2">
            {data.lifestyle.map((id) => (
              <li
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/[0.10] px-3 py-1.5 text-xs font-medium text-orange-100"
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