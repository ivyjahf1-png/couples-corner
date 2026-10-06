/**
 * Derive a human display name from an email address.
 *
 * WHY THIS EXISTS: every signup path seeds `profiles.display_name` from the email
 * when the member did not choose a name — `email.split("@")[0]` in
 * `lib/server/users.ts`. For "ivy.jahf1@gmail.com" that yields "ivy.jahf1", which
 * then renders as the creator handle on the reels feed: machine output in the one
 * place meant to feel like a person. `AppShell` and `lib/server/admin.ts` each did
 * their own inline split, so the cleanup existed in two places and was applied
 * inconsistently.
 *
 *   "ivy.jahf1@gmail.com"     -> "Ivy J."
 *   "aisha.khan@outlook.com"  -> "Aisha K."
 *   "greg@example.com"        -> "Greg"
 *   "gregwilliams"            -> "Gregwilliams"   (no @: returned as-is)
 *   null / ""                 -> ""              (caller supplies its fallback)
 *
 * The trailing "." is kept because a capital plus a period reads as a deliberate
 * handle, whereas "Ivy J" without it looks like a rendering bug.
 *
 * Pure and dependency-free, so a Server Component, a Client Component and a
 * migration script can all import it. It lives in `lib/utils/` rather than
 * `lib/server/` because `AppShell` is a Server Component but the helper itself
 * has no server-only concerns — putting it under `server-only` would have made it
 * unusable from anywhere client-side.
 */
export function displayNameFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const raw = String(email).trim();
  if (!raw) return "";

  // Not an address: a username or an already-formatted name passed through by
  // mistake. Return it untouched rather than mangling it.
  const at = raw.indexOf("@");
  const local = at === -1 ? raw : raw.slice(0, at);
  if (!local) return "";

  const parts = local
    .split(/[._\-+]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";

  const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

  // A single word is only capitalised: "greg" -> "Greg". Reducing it to "G." would
  // read as an initial for a name the member actually typed in full.
  if (parts.length === 1) return cap(parts[0]);

  // Two or more: first word in full, the rest as initials. Bounded at two initials
  // so a long dotted string cannot produce "I. J. P. Q." across a top bar.
  const [first, ...rest] = parts;
  const initials = rest
    .slice(0, 2)
    .map((part) => cap(part).charAt(0) + ".")
    .join(" ");
  return `${cap(first)} ${initials}`.trim();
}

/**
 * A name that is safe to show ANYWHERE public: feed, inbox, thread, profile.
 *
 * Signup seeds `profiles.display_name` from the email address, so a raw value
 * like "ivyjahf1@gmail.com" can reach the UI. Showing the domain in public
 * views leaks half an email address and reads as machine output, so when the
 * stored value looks like an email address only the prefix before "@" is
 * returned ("ivyjahf1"). A value that is already a chosen name is returned
 * untouched. Full addresses stay ONLY in account settings, which renders
 * `user.email` directly and never calls this.
 */
export function publicDisplayName(value: string | null | undefined): string {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (!isLikelyEmailAddress(raw)) return raw;
  return raw.slice(0, raw.indexOf("@"));
}

/**
 * Does this string look like an email address rather than a chosen name?
 *
 * WHY A SEPARATE PREDICATE, AND WHY NOT JUST CALL `displayNameFromEmail`
 * UNCONDITIONALLY. That helper is a no-op for anything without an "@", so on its
 * own it is safe — but it would still rewrite a name that legitimately contains
 * an "@" ("Hey@Home", a deliberate handle), turning it into "Hey". Signup seeds
 * `display_name` from the address, so untrusted address-shaped strings DO reach
 * this column; they must be caught. A real name that happens to contain "@" must
 * NOT be. The caller therefore asks this question first and only rewrites on a
 * `true`.
 *
 * Deliberately strict. It requires, in order:
 *   - exactly one "@"
 *   - a non-empty local part with no whitespace
 *   - a domain with at least one dot and a 2+ character TLD
 *
 * A bare "greg@" or "a@b" does not match and is left alone, because mangling a
 * name is worse than showing an unusual one. Pure and dependency-free.
 */
export function isLikelyEmailAddress(value: string | null | undefined): boolean {
  if (!value) return false;
  const raw = String(value).trim();
  if (!raw || /\s/.test(raw)) return false;

  const parts = raw.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain) return false;

  const dot = domain.lastIndexOf(".");
  if (dot <= 0) return false;
  return domain.length - dot - 1 >= 2;
}
