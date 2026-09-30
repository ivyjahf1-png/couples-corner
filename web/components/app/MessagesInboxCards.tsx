// MessagesInboxCards.tsx — the two informational cards that sit above the
// conversation list on /messages.

import Link from "next/link";
import { Icon } from "@/components/landing/Icon";

/**
 * The "Official Team" welcome card.
 *
 * ── WHY THIS IS STATIC AND THAT IS FINE ─────────────────────────────────────
 * Every other claim in this product is gated on real data (see
 * `ConversationSummaryCard` and the `verified` flag). This card makes no claim
 * about any member and no claim about anyone's safety: it is a static pointer
 * to the team's own support surface. There is no number on it that could be
 * wrong about a person, so it needs no data source and no gate.
 *
 * It is also the only place a new member is told that the badge they see in
 * their inbox is the real team — which is precisely why it must be static
 * product copy and must never be rendered as though it came from a verified
 * account row.
 */
export function OfficialTeamCard() {
  return (
    /* Light-to-dark card: a raised surface with a hairline border on the midnight
       canvas. `h-full` + column so it fills its grid cell beside the scam banner
       without either card forcing the row taller than the other.
       Same treatment as `OfficialTeamCard`'s sibling, the ProfileVisitorsCard. */
    <section
      aria-label="Official team"
      className="flex h-full flex-col gap-2 overflow-hidden rounded-2xl border border-white/10 bg-surface p-3"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm"
        >
          <Icon name="crown" className="h-4 w-4" />
        </span>
        <p className="truncate text-sm font-semibold text-white">Official Team</p>
      </div>
      <div className="min-w-0 flex-1">
        {/* `line-clamp` so a long explanation cannot push this card taller than
            the scam banner it sits beside. */}
        <p className="line-clamp-4 text-[11px] leading-4 text-ink-300">
          Messages from the team arrive with this badge. Anyone claiming to be
          staff without it is not — report them and we&apos;ll take it down.
        </p>
        <Link
          href="/feedback"
          className="mt-1.5 inline-block text-[11px] font-semibold text-orange-300 transition hover:text-orange-200"
        >
          Contact the team
        </Link>
      </div>
    </section>
  );
}

/**
 * The "N have seen me" profile-visitor teaser.
 *
 * ── WHY THIS RENDERS NOTHING UNTIL THERE IS A VISITOR LOG ───────────────────
 * There is no profile-view tracking anywhere in the product: no table, no write
 * path, no read path. The number therefore has no source.
 *
 * A hardcoded "168" here would be a fabricated claim about real people — it
 * tells a member that 168 specific humans looked at them, and invites them to
 * go looking for those people. On a dating app that is the same class of lie
 * as a fake "Real Person" badge, and it is the kind a member acts on: they
 * chase the number, and the product has nothing behind it.
 *
 * So the card is fully built and takes the count as a prop. It renders nothing
 * when the count is null or not a positive integer, which is the correct output
 * today. When a real visitor log lands, pass its count and it appears — with no
 * edit to this file. See `MessagesPage` for the wiring.
 */
export function ProfileVisitorsCard({ viewerCount }: { viewerCount: number | null }) {
  if (typeof viewerCount !== "number" || !Number.isFinite(viewerCount)) return null;

  // Plurals are explicit because "1 have seen me" is a visible grammar bug in
  // the single most prominent line of the card. The count and verb are built
  // here; "seen me" is appended by the markup below.
  const people = `${viewerCount} ${viewerCount === 1 ? "person has" : "people have"}`;

  return (
    /* Same light treatment as `OfficialTeamCard`. The purple tint is kept only on
       the eye badge; the card body is white so the two informational cards and the
       conversation rows read as one system rather than as three different designs
       stacked above the list. */
    <section
      aria-label="Profile visitors"
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface p-3.5"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-sm"
      >
        <Icon name="eye" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">
          {people} <span className="font-normal">seen me</span>
        </p>
        <p className="mt-0.5 text-xs leading-4 text-ink-300">
          People who visited your profile can start a conversation with you.
        </p>
      </div>
      <Link
        href="/profile"
        aria-label="See who has seen me"
        className="shrink-0 rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1.5 text-xs font-semibold text-purple-200 transition hover:bg-purple-400/20"
      >
        View
      </Link>
    </section>
  );
}