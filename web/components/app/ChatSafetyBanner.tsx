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
}: {
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2 text-left text-[11px] font-semibold text-amber-200/80 transition hover:bg-amber-500/10"
      >
        <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
        Safety reminder
      </button>
    );
  }

  return (
    <aside
      role="note"
      className="mx-4 mt-3 flex gap-2.5 rounded-xl border border-amber-400/25 border-l-[3px] border-l-amber-400 bg-amber-500/[0.06] px-3 py-2.5"
    >
      <span aria-hidden className="mt-0.5 shrink-0 text-amber-300">
        <Icon name="shield" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-amber-100">Stay safe</p>
        <p className="mt-0.5 text-[11px] leading-4 text-amber-100/75">
          Never send money, gift cards or codes to someone you haven&apos;t met in
          person. If someone pressures you to act quickly, that pressure is the
          warning sign.
        </p>
        <a
          href="/safety"
          className="mt-1 inline-block text-[11px] font-semibold text-amber-200 underline underline-offset-2 hover:text-amber-100"
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
        aria-label="Hide safety reminder"
        className="h-6 w-6 shrink-0 rounded-lg text-amber-200/50 transition hover:bg-amber-400/10 hover:text-amber-100"
      >
        <span aria-hidden className="text-sm leading-none">
          ×
        </span>
      </button>
    </aside>
  );
}