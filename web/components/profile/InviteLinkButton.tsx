"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function InviteLinkButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? `/invite/${encodeURIComponent(userId)}` : `${window.location.origin}/invite/${encodeURIComponent(userId)}`;
  async function share() {
    if (navigator.share) await navigator.share({ title: "Join me on Couple's Corner", url: link });
    else { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  }
  return <button type="button" onClick={share} className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20">{copied ? <Check className="h-4 w-4" /> : navigator && <Share2 className="h-4 w-4" />} {copied ? "Link copied" : "Invite friends"}</button>;
}
