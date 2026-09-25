"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export type OAuthProvider = "apple" | "facebook";

interface OAuthButtonsProps {
  /** Post-login redirect target (default: onboarding flow entry point). */
  redirectTo?: string;
  className?: string;
}

/**
 * Social sign-in buttons for Apple and Facebook via Supabase OAuth.
 * Uses PKCE flow with the Supabase browser client; the provider redirects
 * back to {origin}/auth/callback which exchanges the code for a session.
 */
export function OAuthButtons({ redirectTo = "/onboarding", className = "" }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWith(provider: OAuthProvider) {
    setError(null);
    setLoading(provider);
    try {
      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (authError) throw authError;
      // Browser is redirected to the provider — no further handling needed.
    } catch {
      setError(
        provider === "apple"
          ? "Could not start Apple sign-in. Is Apple enabled in Supabase Auth?"
          : "Could not start Facebook sign-in. Is Facebook enabled in Supabase Auth?"
      );
      setLoading(null);
    }
  }

  return (
    <div className={className}>
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-white/15" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#0B1120] px-3 text-sm text-white/50">or continue with</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => signInWith("apple")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          {loading === "apple" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702" />
            </svg>
          )}
          Apple
        </button>
        <button
          type="button"
          onClick={() => signInWith("facebook")}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          {loading === "facebook" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C18.612 23.094 24 18.1 24 12.073z" />
            </svg>
          )}
          Facebook
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
