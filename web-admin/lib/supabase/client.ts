/**
 * Couples Corner — Supabase client configuration.
 *
 * The web config values below are public identifiers (Supabase anon keys
 * are not secrets — access control is enforced by Row Level Security (RLS)
 * and server-side verification, never by key secrecy). Service role
 * credentials are NEVER imported here; see lib/supabase/server.ts.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Validate that the required Supabase environment variables are present. */
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

/** The shared singleton client instance. */
let singletonClient: SupabaseClient | null = null;

/**
 * Get the shared Supabase client instance (singleton pattern).
 */
export function getSupabaseClient(): SupabaseClient {
  if (singletonClient) {
    return singletonClient;
  }

  const configError = validateSupabaseConfig();
  if (configError) {
    console.warn(
      `[Supabase] ${configError}. Returning a stub client. ` +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
    );
  }

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
    singletonClient = {
      auth: {
        signInWithPassword: async () => { throw new Error("Supabase not configured"); },
        signUp: async () => { throw new Error("Supabase not configured"); },
        signInWithOtp: async () => { throw new Error("Supabase not configured"); },
        resetPasswordForEmail: async () => { throw new Error("Supabase not configured"); },
        resend: async () => { throw new Error("Supabase not configured"); },
        signOut: async () => ({ error: null as null }),
        getUser: async () => ({ data: { user: null }, error: null as null }),
        getSession: async () => ({ data: { session: null }, error: null as null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: null, error: null as null }),
        insert: () => ({ data: null, error: null as null }),
        update: () => ({ data: null, error: null as null }),
        delete: () => ({ data: null, error: null as null }),
      }),
    } as unknown as SupabaseClient;
  }

  return singletonClient;
}

export function resetSupabaseClientForTesting(): void {
  singletonClient = null;
}
