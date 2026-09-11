/**
 * Couples Corner — Supabase client configuration.
 *
 * The web config values below are public identifiers (Supabase anon keys
 * are not secrets — access control is enforced by Row Level Security (RLS)
 * and server-side verification, never by key secrecy). Service role
 * credentials are NEVER imported here; see lib/supabase/server.ts.
 *
 * Uses a singleton pattern: getSupabaseClient() always returns the same
 * shared client instance across the entire app. This ensures consistent
 * auth state, session persistence, and avoids creating multiple GoTrueClient
 * instances that would each maintain separate connection pools.
 *
 * IMPORTANT: This file validates NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY at runtime. If either is missing,
 * a stub client is returned that prevents generic "Failed to fetch"
 * TypeErrors from being thrown by the browser's fetch API.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Validate that the required Supabase environment variables are present.
 *
 * @returns An error message if configuration is missing, or null if ready.
 *
 * This check is performed before any network calls to prevent
 * generic "Failed to fetch" errors that occur when fetch() is called
 * without valid Supabase credentials.
 */
export function validateSupabaseConfig(): string | null {
  if (!supabaseUrl) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL environment variable";
  }
  if (!supabaseAnonKey) {
    return "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable";
  }
  return null;
}

/** True when the public web config is present in the environment. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/** The shared singleton client instance. Created once, reused everywhere. */
let singletonClient: SupabaseClient | null = null;

/**
 * Get the shared Supabase client instance (singleton pattern).
 *
 * This function always returns the same client instance across the entire
 * application — it does NOT create a new GoTrueClient on each call.
 *
 * When env vars are configured, returns the real client with full auth and
 * database capabilities. When env vars are missing, returns a no-op stub
 * that prevents "Failed to fetch" TypeErrors during development.
 *
 * Use `resetSupabaseClientForTesting()` to reset the singleton between tests.
 */
export function getSupabaseClient(): SupabaseClient {
  // Return existing singleton if already initialized
  if (singletonClient) {
    return singletonClient;
  }

  // Validate configuration before creating the client or stub
  const configError = validateSupabaseConfig();
  if (configError) {
    console.warn(
      `[Supabase] ${configError}. Returning a stub client to prevent 'Failed to fetch' errors. ` +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
    );
  }

  // Initialize singleton on first call
  if (isSupabaseConfigured()) {
    singletonClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        debug: process.env.NODE_ENV === "development",
      },
    });
  } else {
    // Return a no-op stub to prevent "Failed to fetch" errors when
    // env vars are missing. The stub mimics the SupabaseClient interface.
    singletonClient = {
      auth: {
        signInWithPassword: async () => { throw new Error("Supabase not configured"); },
        signUp: async () => { throw new Error("Supabase not configured"); },
        signInWithOtp: async () => { throw new Error("Supabase not configured"); },
        resetPasswordForEmail: async () => { throw new Error("Supabase not configured"); },
        resend: async () => { throw new Error("Supabase not configured"); },
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: null, error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
      }),
    } as unknown as SupabaseClient;
  }

  return singletonClient;
}

export function resetSupabaseClientForTesting(): void {
  singletonClient = null;
}