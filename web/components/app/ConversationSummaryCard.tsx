// ConversationSummaryCard.tsx
//
// The bright-yellow intro / compatibility card that opens a conversation.
//
// It is the first thing a member reads about a stranger, and it is the one
// surface where inventing a detail does real harm — so the LAYOUT is complete
// while every fact on it is bound to a field that was actually read.

"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import type { ConversationParticipantSummary } from "@/lib/feature/types";

/**
 * Whether a real verification flow exists that can back the "Real Person" tag.
 *
 * FALSE today, and it must stay false until a genuine flow lands.
 *
 * `summary.verified` is not the result of checking anything — it is a literal
 * `false` written in `getConversationChatDataAction` precisely so it cannot be
 * mistaken for a real check. Rendering the badge from its truthiness would tell
 * every member that every stranger had been verified. In a dating app that is
 * the most consequential untruth this UI could tell, because it is exactly the
 * signal a member would act on when deciding whether to meet someone.
 *
 * The badge and its styling are built and ready below. The gate is a single
 * constant so enabling it is a deliberate, reviewed act — flip this to true AND
 * make `summary.verified` reflect an actual verification result.
 */
const HAS_REAL_VERIFICATION = false;

/**
 * How many photo thumbnails to show before collapsing into a "+N" overflow.
 *
 * Five fits across a 320px phone at this size with the name column intact; more
 * turns the row into a second scroll region.
 */
const MAX_THUMBNAILS = 5;

/**
 * A temperature readout for the card's top-right corner.
 *
 * ── WHY IT RENDERS NOTHING TODAY ─────────────────────────────────────────────
 * The product has no weather data source: no table, no API client, no
 * geocoding, and no stored coordinates beyond the free-text `location` string a
 * member typed. There is therefore nothing to display, and the component is
 * called with `null`.
 *
 * A hardcoded "22°C" would be a fabricated fact about a specific place, shown
 * beside a real person's name and location — the same class of invented detail
 * as the "Real Person" badge this file already refuses to render. It would also
 * be actively misleading: a member reading "18°C" next to a real location would
 * reasonably believe the app knows something about where that person lives,
 * and it knows nothing.
 *
 * The markup, the layout slot and the prop are all in place, so wiring a real
 * forecast means passing `weather` and nothing else changing.
 */
function WeatherChip({ weather }: { weather: WeatherSummary | null }) {
  if (!weather) return null;
  return (
    <span
      // `title` carries the place name so the icon is never the only signal.
      title={weather.place}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#3B2A05]/12 px-2.5 py-1 text-[11px] font-bold text-[#3B2A05]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {weather.temperatureC}°
    </span>
  );
}

/**
 * A temperature reading for the intro card's weather slot.
 *
 * Declared here rather than in `lib/feature/types` because nothing in the data
 * layer produces one yet — see `WeatherChip`. It is a shape, not a feature.
 */
export interface WeatherSummary {
  /** Whole degrees Celsius, already rounded by whoever fetched it. */
  temperatureC: number;
  /**
   * The place the reading is FOR, used as the chip's tooltip.
   *
   * Required rather than derived: the card shows a real member's location
   * beside this, and a bare number next to a name implies the two are related.
   * Naming the place keeps each claim separable and checkable.
   */
  place: string;
}

interface ConversationSummaryCardProps {
  summary: ConversationParticipantSummary | null;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /**
   * Temperature for the card's top-right slot, or null for none.
   *
   * Null is the correct value until a real forecast source exists. See
   * `WeatherChip`.
   */
  weather?: WeatherSummary | null;
}

export function ConversationSummaryCard({
  summary,
  expanded = false,
  onToggleExpand,
  weather = null,
}: ConversationSummaryCardProps) {
  const [activePhoto, setActivePhoto] = useState(0);

  if (!summary) return null;

  // Only photos that actually resolved to a URL can be rendered. The old
  // version fell back to an initials Avatar inside a thumbnail frame, which
  // rendered as a grey square identical to a broken image — a member could not
  // tell "no photo" from "photo failed to load". Filtering here means the
  // overflow count and the row itself always describe the same set.
  const photoUrls = summary.photos
    .map((photo) => photo.publicUrl)
    .filter((url): url is string => Boolean(url));

  const visible = photoUrls.slice(0, MAX_THUMBNAILS);
  const overflow = photoUrls.length - visible.length;

  // Clamp the selection. Live message/profile updates can shrink the photo
  // list, and an out-of-range `activePhoto` would leave the ring on nothing —
  // the card would look like it had a selection with no selected item. `% len`
  // is deliberately not used: it would silently jump the selection to a
  // DIFFERENT photo, which is worse than clearing it.
  const selected = photoUrls.length > 0 ? Math.min(activePhoto, photoUrls.length - 1) : 0;

  // Single source for the badge condition so the markup and the intent cannot
  // disagree. See HAS_REAL_VERIFICATION.
  const showVerified = summary.verified && HAS_REAL_VERIFICATION;

  return (
    <div className="rounded-t-2xl border-x border-b border-amber-300/40 bg-[#FFC93C] text-[#3B2A05] shadow-[0_8px_28px_-12px_rgba(255,201,60,0.55)]">
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Avatar
            src={photoUrls[0] ?? summary.avatarUrl}
            name={summary.name}
            kind={summary.kind}
            size="lg"
            className="shrink-0 ring-2 ring-[#3B2A05]/15"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="truncate font-semibold text-[#3B2A05]">
                {summary.name}
              </h2>

              {/* Age. OMITTED ENTIRELY when not shared — see `ageFromDateOfBirth`.
                  A default here would put a number on a real person that they
                  never gave us, and in a dating app that is exactly the kind of
                  detail a member is entitled to rely on. */}
              {typeof summary.age === "number" ? (
                <span className="inline-flex shrink-0 items-center rounded-full bg-[#3B2A05]/12 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#3B2A05]">
                  {summary.age}
                </span>
              ) : null}

              {/* Location badge. */}
              {summary.location ? (
                <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-[#3B2A05]/12 px-2 py-0.5 text-[11px] font-semibold text-[#3B2A05]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden>
                    <path d="M12 2 C8 2 4 5 4 9 C4 13 8 16 12 16 C16 16 20 13 20 9 C20 5 16 2 12 2 Z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  <span className="truncate">{summary.location}</span>
                </span>
              ) : null}

              {/* Their own relationship status, verbatim. Shown only when they
                  have actually set one, and never reworded or interpreted. */}
              {summary.relationshipStatus ? (
                <span className="shrink-0 rounded-full bg-[#3B2A05]/12 px-2 py-0.5 text-[11px] font-semibold capitalize text-[#3B2A05]">
                  {summary.relationshipStatus}
                </span>
              ) : null}
            </div>

            {/* ── HONESTY GATES ────────────────────────────────────────────
                Both badges below are hidden unless there is real data behind
                them, and neither currently has any.

                "Real Person" is NOT a safety guarantee. `summary.verified` is
                written as a literal `false` in `getConversationChatDataAction`
                precisely so nothing can read as a check that was never run.
                Rendering it would assert a verification the product has never
                performed — in a dating app that is a serious claim, because it
                is exactly the signal a member would rely on to decide a
                stranger is safe to meet.

                The similarity score is likewise hidden unless genuinely computed.
                It was previously a hardcoded 78, which told members to judge a
                real person on a number the product invented.

                Both slots are fully built and styled. A real backend switches
                them on by populating the field — not by editing this file. */}
            {showVerified ? (
              <span className="mt-1.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1F7A4D] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                  <path d="M9 12 L11 14 L15 10" />
                </svg>
                Real Person
              </span>
            ) : null}
            {typeof summary.personalitySimilarity === "number" ? (
              <span className="mt-1.5 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#3B2A05] px-2.5 py-1 text-[11px] font-bold text-[#FFC93C] shadow-inner">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M12 2 L15 9 L22 9 L17 14 L19 22 L12 17 L5 22 L7 14 L2 9 L9 9 Z" />
                </svg>
                Personality similarity: {summary.personalitySimilarity}%
              </span>
            ) : null}
          </div>
          {/* Weather sits in the card's top-right, ahead of the expand toggle, and
              is `shrink-0` so a long name never pushes it off the row. Renders
              nothing until a real forecast source exists — see `WeatherChip`. */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <WeatherChip weather={weather} />
            {onToggleExpand ? (
              <button
                type="button"
                aria-label={expanded ? "Collapse profile summary" : "Expand profile summary"}
                aria-expanded={expanded}
                className="rounded-full p-1.5 text-[#3B2A05]/60 transition hover:bg-[#3B2A05]/10 hover:text-[#3B2A05]"
                onClick={onToggleExpand}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transform transition-transform ${expanded ? "-rotate-90" : "rotate-90"}`}
                  aria-hidden
                >
                  <path d="M15 18L9 12L15 6" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {expanded ? (
          <div className="flex flex-col gap-3">
            {summary.lifestyleTags.length > 0 ? (
              /* Interest tags. Keyed by `tag` + index because profiles can
                 legitimately carry the same interest twice, and a bare index
                 key makes React reuse the wrong node on reorder. */
              <div className="flex flex-wrap gap-1.5">
                {summary.lifestyleTags.map((tag, i) => (
                  <span key={`${tag}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#3B2A05]/12 px-2.5 py-1 text-xs font-semibold text-[#3B2A05]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                      <path d="M12 3 L12 21 M3 12 L21 12 M7 7 L17 17 M7 17 L17 7" />
                      <circle cx="12" cy="12" r="1.4" />
                    </svg>
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-[#3B2A05]/65">No interests shared yet</p>
            )}

            {photoUrls.length > 0 ? (
              /* A FIXED row, not a horizontal scroller. This card lives inside
                 the thread's single vertical scroll region, and the old
                 `overflow-x-auto` here created a nested scroll axis inside it —
                 the exact two-container arrangement that causes scroll chaining.
                 It also silently truncated: a row that scrolled read as "these
                 are all their photos". The explicit "+N" tile says otherwise. */
              <div className="flex items-center gap-1.5">
                {visible.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    aria-label={`View ${summary.name}'s photo ${i + 1}`}
                    aria-pressed={i === selected}
                    className={[
                      "h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 bg-[#3B2A05]/10 transition",
                      i === selected
                        ? "border-[#3B2A05] ring-2 ring-[#3B2A05]/25"
                        : "border-[#3B2A05]/20 hover:border-[#3B2A05]/50",
                    ].join(" ")}
                  >
                    <img
                      src={url}
                      alt={`${summary.name} — photo ${i + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
                {overflow > 0 ? (
                  <span
                    aria-label={`${overflow} more ${overflow === 1 ? "photo" : "photos"} not shown`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#3B2A05]/20 bg-[#3B2A05]/10 text-xs font-bold tabular-nums text-[#3B2A05]"
                  >
                    +{overflow}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
