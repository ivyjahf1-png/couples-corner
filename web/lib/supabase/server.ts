import "server-only";

/**
 * Couples Corner — Supabase server-side client (SERVER ONLY).
 *
 * SECURITY BOUNDARY
 * -----------------
 * - This module imports `server-only`, so any attempt to reach it from a
 *   Client Component fails the production build.
 * - The service role key (`SUPABASE_SERVICE_ROLE_KEY`) is read from
 *   server-only environment variables and must never be prefixed with
 *   `NEXT_PUBLIC_` or logged.
 * - Everything the service role client can do bypasses RLS — only trusted,
 *   server-side code paths (session routes, Server Actions, audit logging)
 *   may use it.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedClient: SupabaseClient | null = null;

/** Lazily-initialized Supabase server client (service role, bypasses RLS). */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return cachedClient;
}
