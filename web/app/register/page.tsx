"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (err) throw err;
      if (data.session) {
        // Email confirmation disabled — user is signed in immediately.
        // Provision the user in the database (users + profiles tables).
        try {
          await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: data.session.access_token,
              displayName: fullName || undefined,
            }),
          });
        } catch (provisionError) {
          console.error("[Register] Failed to provision user:", provisionError);
          // Continue anyway — the user can still access the app, but
          // some features may be limited until the account is provisioned.
        }
        router.push("/onboarding");
        router.refresh();
        return;
      }
      // Email confirmation required.
      setSuccess("Account created! Please check your email to verify your address, then log in.");
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 text-white">
      <nav className="border-b border-white/10 bg-purple-950/80 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Couple<span className="text-orange-400">&apos;s</span> Corner
          </Link>
        </div>
      </nav>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Sign Up</h1>
        <p className="mt-2 text-lg text-white/70">
          Ready to start building your lasting partnership? Create your Couple&apos;s Corner account.
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          {success && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Full name"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-orange-400 focus:outline-none"
            />
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
              autoComplete="new-password"
              placeholder="Password"
              required
              minLength={8}
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
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <OAuthButtons />
        </div>

        <p className="mt-6 text-center text-sm text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="text-orange-400 hover:text-orange-300">
            Log in
          </Link>
        </p>
      </section>
    </div>
  );
}

