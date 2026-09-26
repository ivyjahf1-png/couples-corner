"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { buildInviteMessage, INVITE_SHARE_TITLE } from "@/lib/utils/invite";
import { shareOrCopy } from "@/lib/utils/share";
import { notifyFailure, notifySuccess } from "@/components/ui/FailureToasts";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const STORAGE_PREFIX = "couples-corner:user-code:";
const isValidCode = (value: string) => /^\d{2}[A-Z]{4}$/.test(value);
const createCode = () => String(10 + Math.floor(Math.random() * 90)) + Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");

function usePersistentCode(userId: string, initialCode?: string | null) {
  const [code, setCode] = useState(() => isValidCode(initialCode ?? "") ? initialCode! : "");
  useEffect(() => {
    const key = `${STORAGE_PREFIX}${userId}`;
    const stored = window.localStorage.getItem(key);
    const next = isValidCode(stored ?? "") ? stored! : isValidCode(initialCode ?? "") ? initialCode! : createCode();
    if (stored !== next) window.localStorage.setItem(key, next);
    setCode(next);
  }, [initialCode, userId]);
  return code;
}

export function PersistentUserId({ userId, initialCode }: { userId: string; initialCode?: string | null }) {
  const code = usePersistentCode(userId, initialCode);
  if (!isValidCode(code)) return null;
  const link = `${window.location.origin}/invite/${code}`;
  /**
   * Share the referral invite: native share sheet on mobile, full message to
   * the clipboard everywhere else, with a toast confirming a real copy.
   */
  async function share() {
    const outcome = await shareOrCopy({ title: INVITE_SHARE_TITLE, message: buildInviteMessage(link) });
    // "shared" needs no confirmation (the sheet already confirmed it) and
    // "dismissed" stays silent: nagging someone who cancelled is noise.
    if (outcome === "copied") notifySuccess("Invite message copied to your clipboard");
    if (outcome === "failed") notifyFailure("Couldn't share or copy the invite. You can copy your ID manually.");
  }
  return <button type="button" onClick={share} aria-label={`Share Couple's Corner invitation ${code}`} className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20"><Share2 className="h-4 w-4" />Invite friends · {code}</button>;
}

export function PersistentIdBadge({ userId, initialCode }: { userId: string; initialCode?: string | null }) {
  const code = usePersistentCode(userId, initialCode);
  const [copied, setCopied] = useState(false);
  if (!isValidCode(code)) return null;
  async function copy() { try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* unavailable */ } }
  return <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-ink-300" aria-label={`Copy profile ID ${code}`}><span className="font-mono">ID: {code}</span>{copied ? <Check className="h-3.5 w-3.5 text-success-400" /> : null}</button>;
}
