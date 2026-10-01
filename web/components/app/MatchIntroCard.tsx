// MatchIntroCard.tsx
//
// A compact "who you're talking to" band for the top of a conversation thread.
//
// ── WHY THIS IS COLLAPSED BY DEFAULT ──────────────────────────────────────────
// A full summary card used to sit between the header and the first message,
// opening EXPANDED: avatar, identity chips, badges, a photo strip, an interests
// grid and a disclosure toggle. It was removed because it was a second profile
// banner 4px below a header already showing the name and avatar, and on a 320px
// phone it left almost no room for the messages it was describing — a member had
// to scroll past a stranger's photo grid to read "hi".
//
// The mistake was not HAVING the card. It was OPENING it. Collapsed, this is
// one 32px line: the member gets the headline facts without spending viewport,
// and taps for the rest.
//
// ── WHY THERE IS NO COMPATIBILITY SCORE ───────────────────────────────────────
// `ConversationParticipantSummary.personalitySimilarity` is OPTIONAL and is
// never set. It was previously hardcoded to 78 and rendered as "78% match".
// There is no compatibility engine in this product, so that number described
// nothing — it invited a member to judge a real person on a value nobody
// computed. It was deliberately removed rather than randomised.
//
// A shared-interests count WOULD be honest — it is arithmetic over two real tag
// lists — but the viewer's own tags are not loaded on this route, so there is
// nothing to compare against. Inventing a denominator to make a percentage
// appear would recreate exactly the problem above.
//
// Colours are slate literals here rather than --chat-* tokens because this card
// is deliberately theme-independent: it reads as profile identity, not as part of
// the message canvas, and on the Daylight chat theme a near-black card would
// otherwise disappear into the surface.

import { useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import type { ConversationParticipantSummary } from "@/lib/feature/types";
export function MatchIntroCard({
  summary,
}: {
  summary: ConversationParticipantSummary | null;
}) {
  const [open, setOpen] = useState(false);

  // No summary means no thread worth introducing; render nothing rather than an
  // empty bordered box that says nothing.
  if (!summary) return null;

  const photos = (summary.photos ?? []).filter((p) => p.publicUrl);
  const tags = (summary.lifestyleTags ?? []).slice(0, 4);

  // Built once and reused in the collapsed line. Age, location and relationship
  // status appear ONLY when the member actually shared them — absence is shown
  // by omission, never by a pill reading "Unknown", which reads as a bug rather
  // than as a choice the person made.
  const headline = [
    summary.age ? `${summary.age}` : null,
    summary.location?.trim() || null,
    summary.relationshipStatus?.trim() || null,
  ].filter(Boolean) as string[];

  return (
    <section
      aria-label={`About ${summary.name}`}
      className="mb-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-white/5"
      >
        <Avatar
          src={summary.avatarUrl}
          name={summary.name}
          kind={summary.kind}
          className="h-8 w-8 shrink-0 text-xs"
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-slate-100">
              {summary.name}
            </span>
            {/* Verification badge.

                GATED ON A FIELD THAT IS CURRENTLY ALWAYS FALSE. `verified` is
                hardcoded to `false` in lib/server/messaging.ts and no migration
                adds a verified column to public.profiles, so this never renders
                today. Wired rather than stubbed because the type already carries
                the field — but it is not a live signal. */}
            {summary.verified ? (
              <span className="inline-flex shrink-0 text-orange-400" title="Verified">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden>
                  <path d="M12 2.6l2.5 1.8 3.1-.2.9 3 2.5 1.8-1.2 2.8 1.2 2.8-2.5 1.8-.9 3-3.1-.2L12 21.4l-2.5-1.8-3.1.2-.9-3L3 14.8l1.2-2.8L3 9.2l2.5-1.8.9-3 3.1.2z" />
                </svg>
                <span className="sr-only">Verified member</span>
              </span>
            ) : null}
          </span>

          {headline.length > 0 ? (
            <span className="mt-0.5 block truncate text-xs text-slate-400">
              {headline.join(" · ")}
            </span>
          ) : null}
        </span>

        <span
          aria-hidden
          className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
{open ? (
        <div className="border-t border-slate-800 px-3 pb-3 pt-2.5">
          {/* Photo strip. Capped at four: this is a glanceable strip inside a
              scrolling thread, not a gallery, and more tiles would push the
              first message off a small screen for no gain. */}
          {photos.length > 0 ? (
            <div className="mb-3 flex gap-1.5">
              {photos.slice(0, 4).map((p, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={p.id ?? p.storagePath ?? i}
                  src={p.publicUrl ?? ""}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-800"
                />
              ))}
            </div>
          ) : null}

          {tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-300"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : (
            /* Interests are genuinely optional on a profile. An empty state that
               says so is honest; a blank area reads as a failed load. */
            <p className="text-xs text-slate-500">
              {summary.name.split(" ")[0]} hasn&apos;t added any interests yet.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}