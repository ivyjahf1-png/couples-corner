"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronLeft,
  Copy,
  Heart,
  MapPin,
  MoreVertical,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CopyIdButton } from "@/components/profile/CopyIdButton";
import { usePresence } from "@/lib/hooks/usePresence";
import { isPresenceOnline } from "@/lib/presence";
import { notifyFailure, notifySuccess } from "@/components/ui/FailureToasts";
import { ProfileChatButton, ProfileFollowButton } from "@/components/profile/PublicProfileActions";

/**
 * THE EXTERNAL (PUBLIC) PROFILE SCREEN.
 *
 * ── WHY THIS IS A CLIENT COMPONENT ───────────────────────────────────────────
 * The previous version of this screen was a Server Component rendering a stack
 * of dark `<Card>` sections down an ordinary scrolling page. That is a fine
 * layout for a document and the wrong one for a profile: the reference design is
 * an IMMERSIVE surface — a full-bleed photo occupying the top half of the
 * viewport, a white sheet overlapping it, chrome pinned over the top of the
 * photo, and a two-button action bar that never leaves the screen. None of that
 * can be expressed in a document flow, because the photo must be POSITIONED
 * against the viewport while the sheet scrolls beneath it.
 *
 * So this is one `"use client"` component. It still receives plain, serialisable
 * data from the server page (see `PublicProfileView`), and it still fetches
 * nothing on mount except presence polling — the same split the rest of this app
 * uses. Only the presentation state the design requires lives here: which photo
 * is active, which tab is open, and whether the overflow menu is showing.
 *
 * ── WHY THE FOLLOW BUTTON IS NOT IN HERE ─────────────────────────────────────
 * See `PublicProfileActions.tsx`. This file renders layout; that file renders the
 * two controls that mutate server state.
 *
 * ── SCROLLING, AND WHY THERE IS EXACTLY ONE SCROLL REGION ────────────────────
 * The photo header is `absolute`, so it contributes NO height to the flow and
 * cannot push anything down. Everything else lives in one column that scrolls.
 * The bottom action bar is OUTSIDE that column, at the end of an `h-full` flex
 * parent — so it is always visible WITHOUT being `fixed`.
 *
 * `fixed` is deliberately avoided for one specific reason: a `fixed` bar at
 * `bottom-0` sits UNDER the app's own fixed tab bar (`BottomNavRegion`), because
 * both resolve against the viewport and the tab bar is painted later. A sibling
 * in flow cannot lose that race. The tab bar's height is reserved explicitly.
 */

/** One photo in the header carousel. `src` null means "no usable image". */
export interface PublicProfilePhoto {
  /** Stable key for React and for the pagination dot. */
  key: string;
  /** Resolved URL, or null when the row has no resolvable image. */
  src: string | null;
}

/**
 * Everything the screen renders, assembled on the server by the page.
 *
 * Deliberately a FLAT, PRE-DERIVED shape rather than a `UserProfile`. The page
 * computes age from `dateOfBirth`, resolves photo URLs and formats distance on
 * the server; the client receives facts, not raw columns. That keeps the derived
 * values identical on first paint and after any re-render, and stops this
 * component from re-implementing — and slowly drifting from — the server's rules.
 */
export interface PublicProfileView {
  /** Route id. Also the copy-to-clipboard payload shown as `ID:<uid>`. */
  uid: string;
  name: string;
  /** Full-bleed header carousel, primary photo first. */
  photos: PublicProfilePhoto[];
  /** Age in whole years, or null when it cannot be derived safely. */
  age: number | null;
  /** Display gender, or null. */
  gender: string | null;
  /** Distance label, e.g. "< 0.1 km". Null when no location is shared. */
  distanceLabel: string | null;
  country: string | null;
  /** Free-text status line. Null when the member set none. */
  status: string | null;
  /** Server-rendered presence verdict, so the pill is right on first paint. */
  initialOnline: boolean;
  /** True when the signed-in member is viewing their own profile. */
  isSelf: boolean;
  /** Signed-in member's uid, or null when signed out. */
  viewerUid: string | null;
  /** Relationship / status chip beside the name, e.g. "Single". */
  statusBadge: string | null;
  /** Bio — the long-form copy under the tabs. */
  bio: string | null;
  /** Interest chips: the "About Me" tag cloud. */
  interests: string[];
  /** Lifestyle tags, rendered as their own labelled group. */
  lifestyle: string[];
  /** Education, occupation, height and genotype, for the Honor tab. */
  honor: { label: string; value: string }[];
  /** Relationship fields, for the Relation tab. */
  relation: { label: string; value: string }[];
}

/** Focus ring, shared by every control on this light surface. */
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

/** The three tabs. `id` is stable and is used as the panel key. */
type TabId = "about" | "honor" | "relation";

const TABS: { id: TabId; label: string }[] = [
  { id: "about", label: "About Me" },
  { id: "honor", label: "Honor" },
  { id: "relation", label: "Relation" },
];

/**
 * Glyphs for the interest / lifestyle chips, matched on the member's own text.
 *
 * WHY A LOOKUP RATHER THAN AN ICON PER ROW. Both columns are free text a member
 * typed, so there is no per-row icon in the database to read. Matching on the
 * label is the honest version of the reference's "chip with a small icon": a
 * recognised label gets its glyph, and anything unrecognised still renders as a
 * clean text chip.
 *
 * Keys are LOWERCASE because the comparison lowercases the label — members type
 * "Cooking" and "cooking" interchangeably, and a case-sensitive map would silently
 * drop the icon for half of them.
 *
 * `match` allows a prefix/substring match so "cooking & baking" or "comic books
 * fan" still resolve. Kept short and specific: a broad rule like "anything
 * containing 'a' gets a heart" would attach nonsense glyphs.
 */
const TAG_ICONS: Record<string, string> = {
  // About Me / personal-detail tags, matched on the member's own label text.
  coffee: "\u2615",
  undergraduate: "\u{1F393}",
  never: "\u{1F6AC}",
  "change the world": "\u{1F4AC}",
  no: "\u{1F47B}",
  naive: "\u{1F60A}",
  aries: "\u2648",
  // Interests / hobbies.
  cooking: "\u{1F373}",
  "comic books": "\u{1F4D6}",
  comics: "\u{1F4D6}",
  games: "\u{1F3AE}",
  gaming: "\u{1F3AE}",
  music: "\u{1F3B5}",
  travel: "\u2708\uFE0F",
  fitness: "\u{1F3CB}",
  gym: "\u{1F3CB}",
  reading: "\u{1F4D6}",
  books: "\u{1F4D6}",
  photography: "\u{1F4F7}",
  art: "\u{1F3A8}",
  coding: "\u{1F4BB}",
  pets: "\u{1F43E}",
  nature: "\u{1F33F}",
  dancing: "\u{1F483}",
  always: "\u2764\uFE0F",
};


/**
 * Resolve a tag label to its emoji, or null when the label is not recognised.
 *
 * Substring matching (`includes`) is what lets "comic books fan" resolve through
 * the "comic books" key. Returns null — not a placeholder — for an unrecognised
 * label: a chip with a mismatched glyph ("Cooking" beside a graduation cap) reads
 * worse than a clean text-only chip.
 */
function tagIcon(label: string): string | null {
  const text = label.trim().toLowerCase();
  if (!text) return null;
  const direct = TAG_ICONS[text];
  if (direct) return direct;
  for (const [key, glyph] of Object.entries(TAG_ICONS)) {
    if (text.includes(key)) return glyph;
  }
  return null;
}

/**
 * Tag pill in the "About Me" cloud and the lifestyle groups.
 *
 * `flex-wrap` is on the PARENT list, so an over-long member-authored tag wraps to
 * its own line instead of overflowing the white sheet and clipping. `break-words`
 * handles the pathological case — a member who typed a sentence into
 * "interests" — where one unbroken word would otherwise punch out of the pill.
 * THE OPTIONAL EMOJI. The reference shows every chip carrying a small glyph, so
 * `icon` is accepted and rendered ahead of the text. It is OPTIONAL on purpose:
 * `interests` and `lifestyle` are free-text columns, so most rows have no
 * sensible glyph to attach, and a chip with a mismatched emoji ("Cooking" beside a
 * graduation cap) is worse than a clean text chip. `tagIcon` resolves the label
 * through the catalogue above and returns null for anything unrecognised, so an
 * unknown tag renders as a plain text pill rather than guessing.
 *
 * `shrink-0` on the glyph stops a flex child from squeezing the icon when the
 * label is long, which would deform a circle into an oval.
 */
function TagPill({ label, icon }: { label: string; icon?: string | null }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] font-medium text-slate-700">
      {/* `aria-hidden`: the emoji is a visual shorthand for the label beside it, so
          announcing it would read the glyph's name twice. `text-[13px]` matches the
          label rather than sitting larger — an oversized emoji reads as a second,
          competing element instead of a prefix. */}
      {icon ? (
        <span aria-hidden className="shrink-0 text-[13px] leading-none">
          {icon}
        </span>
      ) : null}
      <span className="break-words">{label}</span>
    </span>
  );
}

/** A labelled detail row: caption left, value right. Used by Honor/Relation. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

/**
 * THE PHOTO HEADER.
 *
 * `absolute inset-x-0 top-0` with a fixed height, so it is taken OUT of the
 * document flow entirely. That is what lets the white sheet below overlap it
 * with a negative margin and still scroll correctly — a header in normal flow
 * cannot be overlapped by a sibling without pushing the whole column down.
 *
 * Two scrims, not one: the top scrim keeps the white back-chevron legible over a
 * bright sky, and the bottom scrim blends the photo into the white sheet so the
 * overlap reads as one continuous surface rather than a hard seam. Both are
 * `pointer-events-none`, so they can never swallow a tap meant for the photo.
 */
function ProfilePhotoHeader({
  photos,
  activeIndex,
  onSelect,
  onBack,
  onMenu,
  name,
}: {
  photos: PublicProfilePhoto[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onBack: () => void;
  onMenu: () => void;
  name: string;
}) {
  /* `active` is clamped rather than trusted. `photos` can be empty (a member with
     no photos), in which case the fallback below takes over — but an out-of-range
     index would otherwise paint a blank frame. */
  const active = photos[activeIndex] ?? photos[0] ?? null;

  return (
    <header className="absolute inset-x-0 top-0 h-[42vh] min-h-[280px] max-h-[420px]">
      {active?.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={active.key}
          src={active.src}
          alt={`${name} — photo ${activeIndex + 1} of ${photos.length}`}
          /* `key` on the image is deliberate: it forces a fresh element per photo,
             so the browser cannot keep painting the previous photo while the next
             one decodes. */
          className="absolute inset-0 h-full w-full bg-slate-200 object-cover"
        />
      ) : (
        /* No usable photo: a designed gradient + initial rather than an empty grey
           box, so the sheet still has something to overlap. */
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-200 via-slate-200 to-slate-300">
          <span className="text-5xl font-bold text-slate-500/60" aria-hidden>
            {name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        </div>
      )}

      {/* Legibility scrims. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 to-transparent"
      />

      {/* TOP NAV OVERLAY. `absolute` INSIDE the header rather than `fixed` to the
          viewport, so the bar scrolls away with the photo exactly as the design
          shows and can never drift out of sync with the sheet's scroll. */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/50 ${FOCUS}`}
        >
          <ChevronLeft className="h-6 w-6" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onMenu}
          aria-label="More options"
          aria-haspopup="menu"
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/50 ${FOCUS}`}
        >
          <MoreVertical className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {/* THUMBNAIL STRIP, sitting across the LOWER portion of the photo.
          `overflow-x-auto` on a container that is NOT the page is what keeps a
          twelve-photo strip from producing a sideways page scroll on a phone. */}
      {photos.length > 1 ? (
        <div className="absolute inset-x-0 bottom-12 px-4">
          <ul
            className="scrollbar-none flex snap-x snap-mandatory items-center gap-2 overflow-x-auto pb-1"
            aria-label="Photos"
          >
            {photos.map((photo, index) => (
              <li key={photo.key} className="shrink-0 snap-center">
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-label={`Show photo ${index + 1} of ${photos.length}`}
                  aria-current={index === activeIndex}
                  className={`h-14 w-14 overflow-hidden rounded-xl border-2 transition ${FOCUS} ${
                    index === activeIndex
                      ? "border-amber-400 opacity-100"
                      : "border-white/70 opacity-60 hover:opacity-90"
                  }`}
                >
                  {photo.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.src}
                      alt=""
                      /* The full photo is already the header, so thumbnails are
                         decorative repeats of it: `alt=""` rather than announced
                         a second time. */
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="block h-full w-full bg-slate-300" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* PAGINATION DOTS, directly beneath the thumbnails. The active dot is
              WIDER rather than a different colour, which is the one pagination cue
              that survives greyscale and colour-blindness. */}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {photos.map((photo, index) => (
              <span
                key={`dot-${photo.key}`}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex ? "w-4 bg-amber-400" : "w-1.5 bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

/**
 * THE WHITE SHEET'S IDENTITY BLOCK — name, badges, details, ID + presence.
 *
 * This is the content that overlaps the photo. Every row is a single
 * `flex-wrap` line, so a member with a long country name, a missing field, or a
 * narrow 320px viewport reflows instead of clipping. Nothing here has a fixed
 * width and every text node can shrink.
 */
function ProfileIdentity({ view, online }: { view: PublicProfileView; online: boolean }) {
  return (
    <section aria-label="Profile summary" className="flex flex-col gap-3">
      {/* NAME + BADGES. The hearts are the reference's way of showing a member's
          own self-rating and are decorative, so they are `aria-hidden`; the
          verified tick carries a real label instead. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="text-xl font-bold text-slate-900">{view.name}</h1>
        <span aria-hidden className="text-base leading-none tracking-tight">
          ❤️❤️❤️
        </span>
        <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-500" aria-label="Verified profile" />
        {view.statusBadge ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            {view.statusBadge}
          </span>
        ) : null}
      </div>

      {/* DETAIL TAG ROW: age + gender, distance, country. Each item is omitted
          entirely when unknown rather than rendered as an empty pill, so the row
          never shows a stray divider or the word "null". */}
      {view.age !== null || view.gender || view.distanceLabel || view.country ? (
        <ul className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
          {view.age !== null || view.gender ? (
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="font-medium capitalize">
                {[view.gender, view.age !== null ? view.age : null]
                  .filter((part) => part !== null && part !== "")
                  .join(", ")}
              </span>
            </li>
          ) : null}
          {view.distanceLabel ? (
            <li className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="font-medium">{view.distanceLabel}</span>
            </li>
          ) : null}
          {view.country ? (
            <li className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
              {view.country}
            </li>
          ) : null}
        </ul>
      ) : null}

      {/* ID + ONLINE, the last row of the identity block. `justify-between` with
          the presence pill `shrink-0` keeps "Online" pinned right even when the ID
          is long. */}
      <div className="flex items-center justify-between gap-3">
        <CopyIdButton value={view.uid} />
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`}
          />
          {online ? "Online" : "Offline"}
        </span>
      </div>
    </section>
  );
}

export function PublicProfileScreen({ view }: { view: PublicProfileView }) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState<TabId>("about");
  const [menuOpen, setMenuOpen] = useState(false);

  /* PRESENCE, polled through the shared `usePresence` hook exactly as the discover
     deck does, so a member's online state here agrees with theirs there. The
     server verdict (`initialOnline`) is the seed, so the pill is correct on FIRST
     PAINT rather than flashing "Offline" and correcting a beat later. */
  const ids = useMemo(() => (view.uid ? [view.uid] : []), [view.uid]);
  const { presence } = usePresence(ids, Boolean(view.uid));
  const entry = presence[view.uid];
  const online = entry ? entry.online && isPresenceOnline(entry.lastSeenAt) : view.initialOnline;

  /* Clamped so the thumbnail strip and the header can never disagree after a
     photos list shrinks. */
  const safeIndex = Math.min(activeIndex, Math.max(view.photos.length - 1, 0));

  function goBack() {
    /* History first, so the member returns to the list they came from rather
       than being dumped on the app landing screen. `replace` is the fallback for
       a cold deep link, where there IS no history to go back to. */
    if (window.history.length > 1) router.back();
    else router.replace("/discover");
  }

  return (
    /* THE LOCKED COLUMN. `h-full min-h-0` + `overflow-hidden` on the outer box,
       with exactly one scroll region inside it. This is the same contract
       `AppNav`'s `isFullBleedSurface` assumes for /discover, which is why this
       route is registered there: the photo bleeds to the screen edge and the
       action bar must not be shoved around by the sheet's content. */
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-100">
      <ProfilePhotoHeader
        photos={view.photos}
        activeIndex={safeIndex}
        onSelect={setActiveIndex}
        onBack={goBack}
        onMenu={() => setMenuOpen((open) => !open)}
        name={view.name}
      />

      {/* THE SCROLLING SHEET. `-mt-10` creates the overlap with the photo; the
          `pt-12` inside puts the name back below the sheet's rounded corner so it
          can never collide with the photo's bottom edge. */}
      <div className="relative z-10 -mt-10 flex min-h-0 flex-1 flex-col rounded-t-3xl bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-12 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
          <ProfileIdentity view={view} online={online} />

          {/* TABS. A real `tablist` with `aria-selected`, so the active state is
              announced rather than being conveyed by the yellow dot alone. The dot
              is an `absolute` child of each TAB — not of the tablist — so it tracks
              the label's width instead of stretching across it. */}
          <div className="mt-4 border-b border-slate-100">
            <div role="tablist" aria-label="Profile sections" className="flex gap-6">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`profile-tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls={`profile-panel-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={`relative pb-3 text-sm font-bold transition ${FOCUS} ${
                    tab === item.id ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {item.label}
                  {tab === item.id ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px mx-auto h-1 w-6 rounded-full bg-amber-400"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* PANELS. Only the active one is mounted, rather than all three with the
              inactive ones hidden — a hidden panel is still in the DOM, and three
              of these is three times the tag nodes for assistive tech to walk
              through on a screen with nothing to show. */}
          <div
            role="tabpanel"
            id={`profile-panel-${tab}`}
            aria-labelledby={`profile-tab-${tab}`}
            className="pt-4"
          >
            {tab === "about" ? (
              <div className="flex flex-col gap-5">
                <section aria-labelledby="profile-status-heading" className="flex flex-col gap-1.5">
                  <h2 id="profile-status-heading" className="text-sm font-bold text-slate-900">
                    Status
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {view.status?.trim() || "No status yet."}
                  </p>
                </section>

                {/* BIO. `whitespace-pre-line` so a member-authored multi-line bio
                    keeps its own line breaks instead of collapsing into a wall. */}
                {view.bio?.trim() ? (
                  <section aria-labelledby="profile-bio-heading" className="flex flex-col gap-1.5">
                    <h2 id="profile-bio-heading" className="text-sm font-bold text-slate-900">
                      About Me
                    </h2>
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                      {view.bio.trim()}
                    </p>
                  </section>
                ) : null}

                <section aria-labelledby="profile-interests-heading" className="flex flex-col gap-2">
                  <h2 id="profile-interests-heading" className="text-sm font-bold text-slate-900">
                    Interests
                  </h2>
                  {view.interests.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {view.interests.map((interest) => (
                        <li key={interest} className="max-w-full">
                          <TagPill label={interest} icon={tagIcon(interest)} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">No interests shared yet.</p>
                  )}
                </section>

                {/* LIFESTYLE is a separate, member-editable column, kept visually
                    distinct from interests because they answer different questions:
                    what you enjoy versus how you live. */}
                {view.lifestyle.length > 0 ? (
                  <section aria-labelledby="profile-lifestyle-heading" className="flex flex-col gap-2">
                    <h2 id="profile-lifestyle-heading" className="text-sm font-bold text-slate-900">
                      Lifestyle
                    </h2>
                    <ul className="flex flex-wrap gap-2">
                      {view.lifestyle.map((tag) => (
                        <li key={tag} className="max-w-full">
                          <TagPill label={tag} icon={tagIcon(tag)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}

            {tab === "honor" ? (
              <section aria-labelledby="profile-honor-heading" className="flex flex-col gap-3">
                <h2
                  id="profile-honor-heading"
                  className="flex items-center gap-2 text-sm font-bold text-slate-900"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" aria-hidden />
                  Honor
                </h2>
                {view.honor.length > 0 ? (
                  <div className="flex flex-col">
                    {view.honor.map((row) => (
                      <DetailRow key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Nothing to show here yet.</p>
                )}
              </section>
            ) : null}

            {tab === "relation" ? (
              <section aria-labelledby="profile-relation-heading" className="flex flex-col gap-3">
                <h2
                  id="profile-relation-heading"
                  className="flex items-center gap-2 text-sm font-bold text-slate-900"
                >
                  <Heart className="h-4 w-4 text-rose-500" aria-hidden />
                  Relation
                </h2>
                {view.relation.length > 0 ? (
                  <div className="flex flex-col">
                    {view.relation.map((row) => (
                      <DetailRow key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Nothing shared here yet.</p>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {/* THE BOTTOM ACTION BAR. A SIBLING of the scroll region inside the locked
          column, so it is always on screen without being `fixed` — and so it can
          never be painted underneath the app's own fixed tab bar.

          THE NAV RESERVE IS A CALC, NOT A GUESS. `pb-[calc(4.5rem+env(safe-area-inset-bottom))]`
          reserves 72px, which is the real measured height of the bottom capsule
          (52px tab min-height + 2x 8px capsule padding + 2px border ≈ 70px) plus
          the gesture-bar inset. The earlier `4rem` figure was 8px short and let
          the capsule's rounded top edge clip the buttons' bottom row.

          `md:pb-0` drops the reserve where that bar is `md:hidden` and the
          sidebar rail takes over — without it the buttons would float 72px above
          the screen edge on a surface that has nothing beneath them.

          The self view hides the bar entirely: there is no one to Chat with or
          Follow, and an inert primary action is noise, not a feature. */}
      {!view.isSelf ? (
        <div className="relative z-20 shrink-0 border-t border-slate-100 bg-white px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-3 md:pb-4">
          <div className="flex items-center gap-3">
            <ProfileChatButton recipientId={view.uid} recipientName={view.name} />
            <ProfileFollowButton targetUserId={view.uid} viewerUid={view.viewerUid} />
          </div>
        </div>
      ) : null}

      {/* OVERFLOW MENU, opened by the three-dot button. Rendered last so it paints
          above the sheet, with a full-bleed dismiss target behind it. */}
      {menuOpen ? (
        <div className="absolute inset-0 z-30">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div
            role="menu"
            aria-label="More options"
            className="absolute right-3 top-14 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                void navigator.clipboard
                  ?.writeText(view.uid)
                  .then(() => notifySuccess("Profile ID copied"))
                  .catch(() => notifyFailure("Couldn't copy. The ID is shown above the tabs."));
              }}
              className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${FOCUS}`}
            >
              <Copy className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              Copy profile ID
            </button>
            <a
              role="menuitem"
              href={`mailto:?body=${encodeURIComponent(
                `Join me on Couple's Corner: ${view.name} (ID:${view.uid})`,
              )}`}
              onClick={() => setMenuOpen(false)}
              className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${FOCUS}`}
            >
              <Share2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              Share profile
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
