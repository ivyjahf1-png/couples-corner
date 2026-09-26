/**
 * Couples Corner — share an invite, or fall back to the clipboard.
 *
 * WHY THIS EXISTS: the invite button previously did
 *
 *   if (navigator.share) await navigator.share(data);
 *   else await navigator.clipboard.writeText(link);
 *
 * with a bare `catch {}`. That had two real defects:
 *
 *   1. The clipboard fallback copied ONLY the bare URL. On desktop — where
 *      `navigator.share` does not exist — a member pressing "Invite friends"
 *      pasted a naked link into WhatsApp with none of the referral sentence, so
 *      the share looked broken and arrived as a spam-looking bare URL.
 *   2. The bare `catch {}` swallowed the `AbortError` the browser throws when
 *      the user DISMISSES the share sheet, making that indistinguishable from a
 *      genuine failure. So there was no way to show a success confirmation, and
 *      no way to tell the member their copy had actually failed either.
 *
 * `shareOrCopy` separates those outcomes so the caller can confirm a real copy
 * and stay silent when the member simply changed their mind.
 *
 * NOTE ON `url`: the message already contains the link (see buildInviteMessage),
 * so it is deliberately NOT passed as a separate `url` field. Several share
 * targets append `url` verbatim after `text`, which would duplicate it.
 *
 * Isomorphic on purpose: no `server-only` import, so client components can use it.
 */

export interface ShareContent {
  /** Sheet title. */
  title: string;
  /** Full message, INCLUDING the link. */
  message: string;
}

export type ShareOutcome =
  /** The native share sheet was used and resolved. */
  | "shared"
  /** No native share; the full message was written to the clipboard. */
  | "copied"
  /** The member closed the share sheet. Not an error — stay quiet. */
  | "dismissed"
  /** Neither sharing nor copying worked. */
  | "failed";

/** True when an error is the browser's "user closed the share sheet" signal. */
function isAbort(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "AbortError"
  );
}

export async function shareOrCopy(content: ShareContent): Promise<ShareOutcome> {
  // `navigator.share` is absent on desktop browsers and in insecure contexts.
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (canShare) {
    try {
      await navigator.share({ title: content.title, text: content.message });
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "dismissed";
      // A genuine share failure (no share targets, permission denied). Fall
      // through to the clipboard rather than dead-ending: copying is always
      // better than nothing.
    }
  }

  try {
    if (!navigator.clipboard?.writeText) return "failed";
    await navigator.clipboard.writeText(content.message);
    return "copied";
  } catch {
    return "failed";
  }
}