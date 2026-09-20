"use client";

import { useState, type ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type SocialProvider = "google" | "facebook" | "twitter";

const PROVIDERS: { id: SocialProvider; label: string; icon: ReactNode }[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1Z" />
        <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 1.29 6.61l4 3.1c.94-2.84 3.59-4.95 6.71-4.95Z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C18.612 23.094 24 18.1 24 12.073z" />
      </svg>
    ),
  },
  {
    id: "twitter",
    label: "X",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
      </svg>
    ),
  },
];

interface SocialAuthRowProps {
  /** "signin" renders "- Or sign in with -"; "signup" renders "- Or sign up with -". */
  mode?: "signin" | "signup";
  /** Post-login redirect target (default: onboarding flow entry point). */
  redirectTo?: string;
  className?: string;
}

/**
 * Bottom-bar social auth: a hairline divider ("- Or sign in with -") plus
 * clean circular icon buttons for Google, Facebook and X (Twitter) via the
 * Supabase OAuth PKCE flow.
 */
export function SocialAuthRow({ mode = "signin", redirectTo = "/onboarding", className = "" }: SocialAuthRowProps) {
  const [loading, setLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWith(provider: SocialProvider) {
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
      setError(`Could not start ${provider === "twitter" ? "X" : provider} sign-in. Is the provider enabled in Supabase Auth?`);
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
          <span className="px-3 text-xs font-medium tracking-wide text-white/50">
            - Or {mode === "signup" ? "sign up" : "sign in"} with -
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => signInWith(provider.id)}
            disabled={loading !== null}
            aria-label={`Continue with ${provider.label}`}
            title={provider.label}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:scale-105 hover:border-white/30 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === provider.id ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              provider.icon
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
