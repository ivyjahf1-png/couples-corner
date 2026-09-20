"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { FloatingField } from "@/components/auth/FloatingField";
import { SocialAuthRow } from "@/components/auth/SocialAuthRow";

export function RegisterForm() {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {success}
        </div>
      )}

      <FloatingField
        id="fullName"
        label="Full name"
        type="text"
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <FloatingField
        id="email"
        label="Email or Username"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <FloatingField
        id="password"
        label="Password (min. 8 characters)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 w-full rounded-xl bg-[#FF5722] py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#F4511E] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Sign Up"}
      </button>

      <SocialAuthRow mode="signup" className="mt-2" />
    </form>
  );
}
