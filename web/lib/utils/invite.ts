/** Invite code handed from /invite/[code] to /register. */
export const INVITE_STORAGE_KEY = "cc_invite_code";

/** Public codes are two digits + four letters (see migration 032). */
export const INVITE_CODE_PATTERN = /^\d{2}[A-Z]{4}$/;

/** Normalize and validate an invite code; returns null when malformed. */
export function normalizeInviteCode(raw: string | null | undefined): string | null {
  const normalized = (raw ?? "").trim().toUpperCase();
  return INVITE_CODE_PATTERN.test(normalized) ? normalized : null;
}

/**
 * The referral message members share with friends.
 *
 * `{link}` is substituted with the personal invite URL. Keep the link INSIDE the
 * sentence rather than passing it as a separate field: several share targets
 * (notably WhatsApp on Android) append a `url` field verbatim after the text, so
 * a message that also carried the link would show the URL twice.
 */
export const INVITE_MESSAGE_TEMPLATE =
  "Hey! Join me on The Couple's Corner—the ultimate platform to connect with amazing people, play interactive games, and explore immersive moments. Check it out here: {link}";

/** Title used for the native share sheet. */
export const INVITE_SHARE_TITLE = "Join me on The Couple's Corner";

/** Build the full referral message for a given invite link. */
export function buildInviteMessage(link: string): string {
  return INVITE_MESSAGE_TEMPLATE.replace("{link}", link);
}