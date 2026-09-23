"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminPasswordInput } from "@/components/auth/AdminPasswordInput";
import { AdminAuthShell } from "@/components/auth/AdminAuthShell";

/**
 * Admin SIGN UP view — a distinct, dedicated registration view for
 * administrator accounts. Note: creating an account does NOT grant admin
 * access — the account must have the `admin` role in the users table
 * (resolved server-side) before /admin becomes reachable.
 */
export default function AdminRegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const next: Record<string, string> = {};
    if (!displayName.trim()) next.displayName = "Please enter your name.";
    else if (displayName.trim().length > 60) next.displayName = "Keep it under 60 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    else if (!(/[a-zA-Z]/.test(password) && /\d/.test(password)))
      next.password = "Include at least one letter and one number.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (authError) throw authError;
      if (!data.user) throw new Error("Registration failed");

      if (data.session?.access_token) {
        // Email confirmation disabled — establish the session immediately.
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
        return;
      }

      // Email confirmation required.
      setSuccess("Account created! Check your email to verify your address, then sign in.");
      setSubmitting(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create the account. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <AdminAuthShell
      title="Create admin account"
      subtitle="Register an administrator account. Admin panel access still requires the admin role on the platform."
      footer={
        <>
          Already have an admin account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
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
        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-danger-300 bg-danger-50 px-4 py-3 text-sm text-danger-700"
          >
            {formError}
          </p>
        ) : null}
        {success ? (
          <p
            role="status"
            className="rounded-xl border border-success-300 bg-success-50 px-4 py-3 text-sm text-success-700"
          >
            {success}
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="displayName" className="text-sm font-medium text-foreground">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="How should we greet you?"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-ink-200 bg-surface px-4 py-2.5 text-foreground placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          />
          {errors.displayName ? (
            <p className="text-xs text-danger-600">{errors.displayName}</p>
          ) : null}
        </div>
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
          {errors.email ? <p className="text-xs text-danger-600">{errors.email}</p> : null}
        </div>
        <AdminPasswordInput
          id="password"
          label="Password"
          autoCompleteType="new-password"
          placeholder="At least 8 characters"
          hint="At least 8 characters with letters and numbers."
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <AdminPasswordInput
          id="confirm"
          label="Confirm password"
          autoCompleteType="new-password"
          placeholder="Repeat your password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <button
          type="submit"
          disabled={submitting || !isSupabaseConfigured()}
          className="mt-2 w-full rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(249,115,22,0.4)] transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create admin account"}
        </button>
      </form>
    </AdminAuthShell>
  );
}