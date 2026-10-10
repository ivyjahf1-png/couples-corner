"use client";

/**
 * Invite link card — rendered below the relation card on the profile screen.
 *
 * Shows the member's shareable invite URL (`/invite/<uid>`, served by
 * `app/invite/[code]/route.ts`) with a tap-to-copy button. The URL is built
 * on the client so the card renders the correct origin on every deployment.
 */

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

export function InviteLinkCard({ uid }: { uid: string }) {
  const [copied, setCopied] = useState(false);

  async function copyInvite() {
    try {
      const url = `${window.location.origin}/invite/${uid}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard denied — the link text itself remains visible. */
    }
  }

  return (
    <section
      aria-label="Invite link"
      className="flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#2A2438]/55 px-4 py-3"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
        <Link2 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">Invite Link</span>
        <span className="block truncate text-xs text-[#A09AB0]">
          /invite/{uid.slice(0, 8)}…
        </span>
      </span>
      <button
        type="button"
        onClick={() => void copyInvite()}
        aria-label={copied ? "Invite link copied" : "Copy invite link"}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#FF7A00] px-4 text-xs font-bold text-[#0F0C1B] transition hover:bg-[#FF9500] active:scale-95"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </section>
  );
}
