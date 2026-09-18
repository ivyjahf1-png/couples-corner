"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSupabaseClient, validateSupabaseConfig } from "@/lib/supabase/client";
import { exchangeSessionCookie } from "@/lib/supabase/auth-client";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      // Validate Supabase is configured before attempting sign-in
      const configError = validateSupabaseConfig();
      if (configError) {
        console.error("[Login] Supabase not configured:", configError);
        setError("Authentication is not configured. Please try again later.");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      console.log("[Login] Attempting sign-in with email:", email);

      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });

      if (err) {
        console.error("[Login] Sign-in failed:", err.message, err);
        setError(err.message || "Failed to sign in. Please check your credentials and try again.");
        setLoading(false);
        return;
      }

      console.log("[Login] Sign-in successful, user:", data.user?.email);

      // Exchange the access token for an httpOnly session cookie so the server
      // recognizes the user as authenticated on the dashboard.
      if (data.session?.access_token) {
        console.log("[Login] Exchanging session cookie...");
        await exchangeSessionCookie(data.session.access_token);
        console.log("[Login] Session cookie exchanged successfully");
      }

      // Navigate to dashboard
      console.log("[Login] Navigating to /dashboard");
      router.push("/dashboard");
      router.refresh();
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      console.error("[Login] Unexpected error:", err);

      // Show user-facing alert for critical errors
      if (err instanceof Error && err.message.includes("Supabase not configured")) {
        alert("Authentication is not configured. Please contact support.");
      } else if (err instanceof Error && err.message.includes("network") || err instanceof TypeError) {
        alert("Network error. Please check your internet connection and try again.");
      } else {
        // Display error in the UI
        setError(errorMessage);
      }

      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 text-white">
      <nav className="border-b border-white/10 bg-purple-950/80 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="Couples Corner home">
            <Logo as="span" />
          </Link>
        </div>
      </nav>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Log In</h1>
        <p className="mt-2 text-lg text-white/70">
          Welcome back to Couple&apos;s Corner. Sign in to continue your journey.
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          {notice && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email address"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-orange-400 focus:outline-none"
            />
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Password"
              required
            />
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3 font-semibold text-white transition hover:from-orange-400 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <OAuthButtons />
        </div>

        <p className="mt-6 text-center text-sm text-white/60">
          Need an account?{" "}
          <Link href="/register" className="text-orange-400 hover:text-orange-300">
            Sign up
          </Link>
        </p>
      </section>
    </div>
  );
}

