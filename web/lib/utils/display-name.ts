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