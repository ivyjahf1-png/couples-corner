"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function InviteLinkButton({ userCode }: { userCode?: string | null }) {
  const [copied, setCopied] = useState(false);
  const code = userCode && /^\d{2}[A-Z]{4}$/.test(userCode) ? userCode : "00JOIN";
  const link = typeof window === "undefined" ? `/invite/${code}` : `${window.location.origin}/invite/${code}`;
  async function share() {
    const data = { title: "Join me on Couple's Corner", text: "Join our community on Couple's Corner", url: link };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    } catch { /* share dismissed */ }
  }
  return <button type="button" onClick={share} aria-label={`Share Couple's Corner invitation ${code}`} className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20">{copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}{copied ? "Link copied" : `Invite friends · ${code}`}</button>;
}
