"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminPasswordInput } from "@/components/auth/AdminPasswordInput";
import { AdminAuthShell } from "@/components/auth/AdminAuthShell";

/**
 * Admin LOGIN view — a distinct, dedicated authentication view for
 * administrator sign-in. After Supabase auth succeeds the access token is
 * exchanged for the shared httpOnly session cookie, then the user is routed
 * to /admin where the server-side role guard decides access.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      if (!data.session?.access_token) throw new Error("Sign-in failed");

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not establish your admin session");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <AdminAuthShell
      title="Admin sign in"
      subtitle="Access the moderation and administration panel. Administrator accounts only."
      footer={
        <>
          Need an admin account?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      {!isSupabaseConfigured() ? (
        <p className="mb-4 rounded-xl border border-danger-300 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY to enable authentication.
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-danger-300 bg-danger-50 px-4 py-3 text-sm text-danger-700"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-ink-200 bg-surface px-4 py-2.5 text-foreground placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          />
        </div>
        <AdminPasswordInput
          id="password"
          label="Password"
          autoCompleteType="current-password"
          placeholder="Your password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting || !isSupabaseConfigured()}
          className="mt-2 w-full rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(249,115,22,0.4)] transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in to Admin"}
        </button>
      </form>
    </AdminAuthShell>
  );
}