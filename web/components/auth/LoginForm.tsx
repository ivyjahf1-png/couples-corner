"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseClient, validateSupabaseConfig } from "@/lib/supabase/client";
import { exchangeSessionCookie } from "@/lib/supabase/auth-client";
import { FloatingField } from "@/components/auth/FloatingField";
import { SocialAuthRow } from "@/components/auth/SocialAuthRow";

const REMEMBER_KEY = "cc_remember_email";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Prefill the remembered email on mount.
  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

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

      // Persist / clear the remembered email.
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_KEY, email);
      } else {
        window.localStorage.removeItem(REMEMBER_KEY);
      }

      const supabase = getSupabaseClient();

      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });

      if (err) {
        console.error("[Login] Sign-in failed:", err.message, err);
        setError(err.message || "Failed to sign in. Please check your credentials and try again.");
        setLoading(false);
        return;
      }

      // Exchange the access token for an httpOnly session cookie so the server
      // recognizes the user as authenticated on the dashboard.
      if (data.session?.access_token) {
        await exchangeSessionCookie(data.session.access_token);
      }

      // Navigate to dashboard
      router.push("/dashboard");
      router.refresh();
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      console.error("[Login] Unexpected error:", err);

      if (err instanceof Error && err.message.includes("Supabase not configured")) {
        setError("Authentication is not configured. Please contact support.");
      } else if (err instanceof TypeError) {
        setError("Network error. Please check your internet connection and try again.");
      } else {
        setError(errorMessage);
      }

      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {notice && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {notice}
        </div>
      )}

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
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        {/* Remember me pill toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={rememberMe}
          onClick={() => setRememberMe((prev) => !prev)}
          className="group flex items-center gap-2.5 focus:outline-none"
        >
          <span
            className={[
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
              "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
              rememberMe ? "bg-brand-500" : "bg-white/20",
            ].join(" ")}
          >
            <span
              className={[
                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
                rememberMe ? "translate-x-4.5" : "translate-x-0.5",
              ].join(" ")}
            />
          </span>
          <span className="text-sm text-white/70 group-hover:text-white transition-colors">Remember me</span>
        </button>

        <a
          href="/forgot-password"
          className="text-sm text-brand-400 transition hover:text-brand-300"
        >
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-1 w-full rounded-xl bg-[#FF5722] py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#F4511E] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <SocialAuthRow mode="signin" redirectTo="/dashboard" className="mt-2" />
    </form>
  );
}
