/** Invite code handed from /invite/[code] to /register. */
export const INVITE_STORAGE_KEY = "cc_invite_code";

/**
 * Short-lived marker recording that THIS browser arrived via an invite.
 *
 * Separate from the referral code on purpose. The code must persist until the
 * visitor registers (that is the attribution). The marker only needs to answer
 * "is this signed-out visitor on the invite landing path?", so it expires with
 * the session and never outlives it — otherwise a member who signs up from an
 * invite would keep being shown the signup wall on later visits.
 *
 * Stored in localStorage (not a cookie) because it is a purely client-side
 * presentation decision; the referral itself is carried by a server cookie and
 * by INVITE_STORAGE_KEY.
 */
export const INVITE_VISITOR_KEY = "cc_invite_visitor";

/**
 * Server-readable cookie carrying the active referral code across the
 * `/invite/[code]` -> `/` redirect.
 *
 * Deliberately NOT httpOnly: the signup wall runs in the browser and needs to
 * pass this exact code into registration, which happens client-side. The value
 * is a public invite code, so it carries no privilege - `resolveUserCode` still
 * re-validates it server-side before any referral is recorded.
 */
export const INVITE_COOKIE = "cc_invite_ref";

/** How long the visitor watches the feed before the signup wall is raised. */
export const SIGNUP_WALL_DELAY_MS = 3000;

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