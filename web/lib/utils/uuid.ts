/**
 * Couples Corner — UUID helpers shared by the app client and the server.
 *
 * Postgres `uuid` columns reject empty strings outright:
 *
 *   invalid input syntax for type uuid: ""
 *
 * Optional identity fields (created_by, updated_by, admin_user_id, …) reach
 * Supabase as "" whenever a form field is left blank or a session lookup has
 * nothing to resolve, which is exactly how that error is produced. Routing
 * every UUID value through `toUuidOrNull` (blank or malformed → null) or
 * `omitBlankUuids` (blank → key removed, so the column default applies) keeps
 * those payloads valid.
 *
 * Isomorphic on purpose: client components need `generateUuid` while server
 * modules need the sanitisers — never add a `server-only` import to this file.
 */

/** Canonical 8-4-4-4-12 hex form (any version/variant). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` is a well-formed, non-empty UUID string. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

/**
 * Normalise a value destined for a `uuid` column.
 * Blank (" "), missing and malformed values all become `null` — never "".
 */
export function toUuidOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Copy of `payload` with the listed UUID keys normalised to `null` when they
 * are blank/malformed. Use this for nullable UUID columns so Postgres never
 * receives ""; use `omitBlankUuids` for keyed/defaulted columns (e.g. an
 * optional primary key) where `null` would trip a NOT NULL constraint.
 */
export function nullifyBlankUuids<T extends object>(payload: T, keys: readonly string[]): T {
  const next = { ...payload } as Record<string, unknown>;
  for (const key of keys) {
    if (key in next) next[key] = toUuidOrNull(next[key]);
  }
  return next as unknown as T;
}

/** Copy of `payload` with blank/malformed UUID keys removed entirely. */
export function omitBlankUuids<T extends object>(payload: T, keys: readonly string[]): T {
  const next = { ...payload } as Record<string, unknown>;
  for (const key of keys) {
    if (key in next && !isUuid(next[key])) delete next[key];
  }
  return next as unknown as T;
}

/**
 * Generate a v4 UUID.
 *
 * `crypto.randomUUID()` is only exposed in secure contexts, so it is `undefined`
 * when the app is opened over plain HTTP (e.g. http://192.168.x.x:3000 during
 * LAN testing). Falling back to `crypto.getRandomValues` (and finally
 * Math.random) keeps generated ids valid instead of throwing mid-submit.
 */
export function generateUuid(): string {
  const cryptoObj = typeof globalThis === "undefined" ? undefined : globalThis.crypto;
  if (typeof cryptoObj?.randomUUID === "function") return cryptoObj.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoObj?.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // RFC 4122 v4: version + variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
