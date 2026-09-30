// ChatSafetyBanner.tsx — the anti-scam reminder shown above a conversation.
"use client";

import { Icon } from "@/components/landing/Icon";

/**
 * A short scam-safety reminder for the messaging surface.
 *
 * ── WHY IT COLLAPSES BUT IS NOT FORGETTABLE ─────────────────────────────────
 * It collapses, but the collapsed state is a visible "Safety reminder" chip
 * rather than nothing at all. A plain dismiss would mean a member who read it
 * once never saw it again — while a stranger is free to message them in a new
 * thread tomorrow. The advice is only useful when a conversation is starting,
 * which is exactly when a scam arrives.
 *
 * ── WORDING ─────────────────────────────────────────────────────────────────
 * Advisory, never accusatory. It does NOT claim we verify anyone, and it does
 * not warn that strangers are dangerous — the overwhelming majority are not. It
 * names the specific behaviour that precedes a scam, which is actionable, rather
 * than inducing fear. The safety page draws the same line carefully ("flagged
 * for review - never as an automatic ban") and this must not overstate what the
 * product does.
 */
export function ChatSafetyBanner({
  /**
   * `inbox` renders the loud, all-caps version for the conversation LIST.
   * `thread` keeps the softer advisory used inside a live conversation.
   *
   * The two differ because they answer different questions. In the thread the
   * member has already chosen to talk to this person, so the useful message is
   * calm advice. On the list the member has not chosen anything yet and this is
   * the surface an unsolicited scam arrives on — so it leads with the specific
   * fraud pattern this product actually sees (offers of coins in exchange for
   * money or codes) rather than a generic "be careful".
   *
   * The wording names a CONDUCT, never a category of person: it does not say
   * strangers are dangerous, and it does not claim we verify anyone. It says
   * what the scammer will do, which is the part a member can act on.
   */
  variant = "thread",
}: {
  variant?: "thread" | "inbox";
}) {
  const loud = variant === "inbox";

  /* ── THE BANNER IS NO LONGER DISMISSIBLE ────────────────────────────────────
     It used to carry an "x" that collapsed it to a small "Scam warning" chip.
     That chip has been removed too, so the banner is now unconditionally shown.

     Removing the collapse is deliberate, not a side effect. This is the surface
     an unsolicited scam actually arrives on, and the original design note was
     explicit: a dismissible warning on a scrolling surface is a warning that
     gets dismissed once and never seen again — which is worse than none, because
     it leaves the member believing they were told something. In a half-width
     grid cell the banner now sits directly beside the Official Team card, and a
     collapse toggle there was both easy to hit by accident and inconsistent with
     the "read this before you read anything" role the notice strip now has.

     `onDismiss` went with it. No caller passed one, so it was dead API surface;
     the only remaining use was the button that no longer exists. */
  return (
    <aside
      role="note"
      className={[
        /* `h-full` + column so the card fills its grid cell; `line-clamp` on the
           body (below) keeps a long warning from forcing the row taller than
           the Official Team card beside it.
           The `mx-4 mt-3` that used to be on the thread variant is GONE: those
           margins were there because this banner used to sit in the thread's
           scroll region. It is now also used in a `grid` cell on the inbox, where
           they indented it out of its own card. */
        "flex h-full flex-col gap-2 overflow-hidden rounded-2xl border px-3 py-3",
        loud
          ? // `border-l-[3px]` echoes the amber variant so the two read as one
            // system, but the rose palette is what a member has learned to
            // associate with "this is a fraud warning", and the all-caps lead
            // line is what makes it scannable in a fast-scrolling list.
            //
            // The `-200`/`-300` text shades assume the DARK canvas: on dark, a
            // `-700`/`-800` shade is near-black text on a dark panel. When this
            // file was briefly a light surface the shades went the other way.
            "border-rose-400/40 border-l-[3px] border-l-rose-500 bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.05]"
          : "border-amber-400/40 border-l-[3px] border-l-amber-500 bg-amber-500/[0.08]",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={`shrink-0 ${loud ? "text-rose-300" : "text-amber-300"}`}
      >
        <Icon name="shield" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        {loud ? (
          <>
            {/* Shorter headline. "Scam warning!! Don&apos;t fall for fake coin
                offers" was two claims and two exclamation marks; in a half-width
                grid cell that wrapped to three lines and pushed the body copy out
                of the card. The pattern is still named in the body, which is the
                part a member can actually recognise in a message. */}
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-rose-200">
              Scam warning
            </p>
            <p className="mt-0.5 line-clamp-5 text-[11px] leading-4 text-rose-100/80">
              Never send money, gift cards or codes in exchange for coins. If a
              message offers coins for payment, it is a scam — block and report.
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] font-semibold text-amber-200">Stay safe</p>
            <p className="mt-0.5 line-clamp-5 text-[11px] leading-4 text-amber-100/70">
              Never send money or codes to someone you haven&apos;t met in person.
              Pressure to act fast is the warning sign.
            </p>
          </>
        )}
        <a
          href="/safety"
          className={[
            "mt-1 inline-block text-[11px] font-semibold underline underline-offset-2",
            loud ? "text-rose-200 hover:text-rose-100" : "text-amber-200 hover:text-amber-100",
          ].join(" ")}
        >
          Safety centre
        </a>
      </div>
    </aside>
  );
}