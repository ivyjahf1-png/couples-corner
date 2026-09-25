/** Invite code handed from /invite/[code] to /register. */
export const INVITE_STORAGE_KEY = "cc_invite_code";

/** Public codes are two digits + four letters (see migration 032). */
export const INVITE_CODE_PATTERN = /^\d{2}[A-Z]{4}$/;

/** Normalize and validate an invite code; returns null when malformed. */
export function normalizeInviteCode(raw: string | null | undefined): string | null {
  const normalized = (raw ?? "").trim().toUpperCase();
  return INVITE_CODE_PATTERN.test(normalized) ? normalized : null;
}