"use client";

/**
 * Friend-relation card (SURFACE 3) with the working "Invite Friend" action.
 *
 * ── WHY THIS EXISTS AT ALL ──────────────────────────────────────────────────
 * This surface used to render a plain `<Link>` to /discover labelled "Invite
 * Friend". A link that navigates is not an invite: it moved the member to the
 * discovery deck without giving them anything to share, so there was no way to
 * actually bring a friend to the app. The button now COPIES the member's
 * referral link and confirms it with a toast, which is what the label always
 * promised.
 *
 * ── THE LINK SHAPE MATTERS ──────────────────────────────────────────────────
 * The copied URL is `<origin>/invite/<userCode>` — the `/invite/[code]` route,
 * with the member's permanent six-character `user_code`.
 *
 * It is deliberately NOT `/register?ref=<uid>`: `RegisterForm` reads the
 * `invite` query parameter (not `ref`), and both that form and the API route
 * re-validate the code against `^\d{2}[A-Z]{4}$` via `resolveUserCode`. A
 * Supabase UUID therefore cannot attribute a referral at all — the visitor
 * would be created with `referred_by = null` and the invite would silently
 * count for nothing. The six-character code is the only value the funnel
 * accepts.
 *
 * The origin is read from `window.location.origin` rather than hardcoded, so
 * the link is correct on every deployment (the app is served on more than one
 * domain) — the same reason `/invite/[code]/route.ts` builds its redirect from
 * the request instead of a constant.
 */

import { useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";

import { notifyFailure, notifySuccess } from "@/components/ui/FailureToasts";
import { INVITE_CODE_PATTERN } from "@/lib/utils/invite";

/** These three mirror the SURFACE / GHOST_BTN tokens in `ProfileScreen`. */
const SURFACE =
  "overflow-hidden rounded-2xl border border-white/[0.08] bg-[#2A2438]/55";
const GHOST_BTN =
  "flex h-9 shrink-0 items-center rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-xs font-semibold text-white transition hover:bg-white/[0.12]";

export function RelationInviteCard({
  relation,
  userCode,
}: {
  /** Relationship label, rendered verbatim (e.g. "No Relation"). */
  relation: string;
  /**
   * The member's permanent six-character public code, or null when the
   * database has not minted one yet (migration 032/042 not applied).
   */
  userCode: string | null;
}) {
  const [copied, setCopied] = useState(false);

  /* Validated client-side purely to decide whether to arm the button. The
     server re-validates with the identical pattern, so a value that slips
     through here still cannot corrupt attribution. */
  const shareable = Boolean(userCode && INVITE_CODE_PATTERN.test(userCode));

  async function invite() {
    if (!shareable || !userCode) return;
    const link = `${window.location.origin}/invite/${userCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      notifySuccess("Invite link copied!");
    } catch {
      // Clipboard is blocked in some in-app browsers and on insecure origins.
      // The member still needs to know the invite did not go anywhere.
      notifyFailure("Couldn't copy your invite link. Check clipboard permission.");
    }
  }

  return (
    <section aria-label="Friend relation" className={SURFACE}>
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[#FFB27A]">
          <UserPlus className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-white">{relation}</span>
          <span className="block truncate text-xs text-[#A09AB0]">
            Build meaningful connections with other couples
          </span>
        </span>
        <button
          type="button"
          onClick={() => void invite()}
          disabled={!shareable}
          aria-label={
            shareable
              ? copied
                ? "Invite link copied"
                : "Copy your invite link"
              : "Invite unavailable"
          }
          title={shareable ? "Copy your invite link" : "Your invite code is not ready yet"}
          className={`${GHOST_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {copied ? <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" /> : null}
          {copied ? "Copied!" : "Invite Friend"}
        </button>
      </div>
    </section>
  );
}
