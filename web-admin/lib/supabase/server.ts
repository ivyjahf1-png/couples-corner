import "server-only";

/**
 * Couples Corner — Supabase server-side client (SERVER ONLY).
 *
 * SECURITY BOUNDARY
 * - Imports `server-only`, so any attempt to reach it from a Client Component
 *   fails the production build.
 * - The service role key (`SUPABASE_SERVICE_ROLE_KEY`) is read from
 *   server-only environment variables and must never be prefixed with
 *   `NEXT_PUBLIC_` or logged.
 * - Everything the service role client can do bypasses RLS — only trusted,
 *   server-side code paths (session routes, Server Actions, audit logging)
 *   may use it.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = stripWrappingQuotes(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseServiceRoleKey = stripWrappingQuotes(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
).trim();

/**
 * Strip a single pair of wrapping quotes from an env value.
 *
 * Some `.env` setups pass `KEY="value"` through with the literal quotes
 * intact (e.g. values supplied via `process.env` from the shell or a
 * container platform rather than Next's own dotenv loader). Without this,
 * a correctly configured admin would hit the "not configured" fallback
 * because `'"https://…"'` is truthy but not a valid URL.
 */
function stripWrappingQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value.charAt(0);
    const last = value.charAt(value.length - 1);
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

/**
 * Return the (trimmed, unquoted) service role key for ad-hoc authorization
 * headers — e.g. Storage uploads called outside the cached client's own
 * session scope. Never expose this to the client; it is server-only.
 */
export function getSupabaseServiceRoleKey(): string {
  return supabaseServiceRoleKey;
}

/**
 * Validate that a string looks like a valid JWT (three base64url-encoded
 * segments separated by dots). A malformed key is the most common cause of
 * "Invalid Compact JWS" errors from the Supabase Storage API — this check
 * catches the problem early with a descriptive error instead of letting it
 * propagate as a cryptic JWS failure.
 */
/**
 * Validate a Supabase service-role key.
 *
 * Two key formats exist:
 *  - Legacy JWT service keys ("eyJhbGci….….…") — three dot-separated
 *    base64url segments.
 *  - New API keys ("sb_secret_…" / "sb_publishable_…") — opaque strings with
 *    NO dot segments. Rejecting these here silently disabled the whole admin
 *    data connection (every write failed with "Supabase not configured"),
 *    so they are now accepted explicitly.
 */
function isValidJwt(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("sb_secret_") || trimmed.startsWith("sb_publishable_")) {
    return true;
  }
  const parts = trimmed.split(".");
  if (parts.length !== 3) return false;
  // Each segment must be non-empty base64url (A-Z, a-z, 0-9, '-', '_')
  return parts.every((p) => p.length > 0 && /^[A-Za-z0-9_-]+$/.test(p));
}

let cachedClient: SupabaseClient | null = null;

/** Lazily-initialized Supabase server client (service role, bypasses RLS). */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!supabaseUrl) {
    console.warn("[Supabase] NEXT_PUBLIC_SUPABASE_URL is not set. Admin features will be unavailable.");
    return null;
  }
  if (!supabaseServiceRoleKey) {
    console.warn("[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Admin features will be unavailable.");
    return null;
  }
  if (!isValidJwt(supabaseServiceRoleKey)) {
    console.error(
      "[Supabase] SUPABASE_SERVICE_ROLE_KEY is set but is not a valid JWT. " +
      "This causes 'Invalid Compact JWS' errors on Storage uploads. " +
      "Copy the service_role key from your Supabase dashboard (Settings → API) " +
      "and ensure it is not truncated, quoted, or replaced with the anon key."
    );
    return null;
  }
  if (!cachedClient) {
    try {
      cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    } catch (err) {
      console.error(
        `[Supabase] Failed to create server client: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  }
  return cachedClient;
}
