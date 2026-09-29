// ChatSafetyBanner.tsx — the anti-scam reminder shown above a conversation.
"use client";

import { useState } from "react";
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
  onDismiss,
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
  onDismiss?: () => void;
  variant?: "thread" | "inbox";
}) {
  const [open, setOpen] = useState(true);
  const loud = variant === "inbox";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition",
          loud
            ? "border-rose-400/25 bg-rose-500/[0.06] text-rose-200/80 hover:bg-rose-500/10"
            : "mx-4 mt-3 w-[calc(100%-2rem)] border-amber-400/25 bg-amber-500/[0.06] text-amber-200/80 hover:bg-amber-500/10",
        ].join(" ")}
      >
        <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
        {loud ? "Scam warning" : "Safety reminder"}
      </button>
    );
  }

  return (
    <aside
      role="note"
      className={[
        "flex gap-2.5 rounded-xl border px-3 py-2.5",
        loud
          ? // `border-l-[3px]` echoes the amber variant so the two read as one
            // system, but the rose palette is what a member has learned to
            // associate with "this is a fraud warning", and the all-caps lead
            // line is what makes it scannable in a fast-scrolling list.
            "border-rose-400/30 border-l-[3px] border-l-rose-400 bg-gradient-to-r from-rose-500/[0.14] to-rose-500/[0.05]"
          : "mx-4 mt-3 border-amber-400/25 border-l-[3px] border-l-amber-400 bg-amber-500/[0.06]",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={`mt-0.5 shrink-0 ${loud ? "text-rose-300" : "text-amber-300"}`}
      >
        <Icon name="shield" className={loud ? "h-4.5 w-4.5" : "h-4 w-4"} />
      </span>
      <div className="min-w-0 flex-1">
        {loud ? (
          <>
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-rose-100">
              Scam warning!! Don&apos;t fall for fake coin offers
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-rose-100/80">
              Nobody here will ever ask you to send money, gift cards or codes in
              exchange for coins. If a message offers you coins for payment, it
              is a scam — block and report it.
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] font-semibold text-amber-100">Stay safe</p>
            <p className="mt-0.5 text-[11px] leading-4 text-amber-100/75">
              Never send money, gift cards or codes to someone you haven&apos;t
              met in person. If someone pressures you to act quickly, that
              pressure is the warning sign.
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
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          onDismiss?.();
        }}
        aria-label="Hide scam warning"
        className={[
          "h-6 w-6 shrink-0 rounded-lg transition",
          loud
            ? "text-rose-200/50 hover:bg-rose-400/10 hover:text-rose-100"
            : "text-amber-200/50 hover:bg-amber-400/10 hover:text-amber-100",
        ].join(" ")}
      >
        <span aria-hidden className="text-sm leading-none">
          ×
        </span>
      </button>
    </aside>
  );
}