/**
 * Couples Corner — Supabase client configuration.
 *
 * The web config values below are public identifiers (Supabase anon keys
 * are not secrets — access control is enforced by Row Level Security (RLS)
 * and server-side verification, never by key secrecy). Service role
 * credentials are NEVER imported here; see `lib/supabase/server.ts`.
 *
 * Initialization is lazy so importing this module never throws at build time
 * when environment variables are absent.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the public web config is present in the environment. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let cachedClient: SupabaseClient | null = null;

/** Lazily-initialized Supabase client (browser-side). */
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cachedClient;
}
