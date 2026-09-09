"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, Field, FormAlert } from "@/components/auth/AuthUI";
import { Button } from "@/components/ui/Button";
import { signInWithEmail, sendEmailSignInLink } from "@/lib/firebase/auth-client";
import { authErrorMessage } from "@/lib/firebase/auth-errors";

type Status = "idle" | "submitting" | "link-sent";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setStatus("submitting");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!email || !password) {
      setError("Please enter your email and password.");
      setStatus("idle");
      return;
    }

    try {
      await signInWithEmail(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
      setStatus("idle");
    }
  }

  async function handleEmailLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("link-email") ?? "").trim();
    if (!email) {
      setError("Enter your email first, then tap the link option.");
      return;
    }
    setStatus("submitting");
    try {
      // Remember the email so /verify-email can complete passwordless sign-in.
      window.localStorage.setItem("ccEmailForSignIn", email);
      await sendEmailSignInLink(email);
      setStatus("link-sent");
      setInfo("Sign-in link sent — check your inbox and open it on this device.");
    } catch (err) {
      setError(authErrorMessage(err));
      setStatus("idle");
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your corner — connections, conversations, and moments are waiting."
      footer={
        <>
          New to Couples Corner?{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error ? <FormAlert message={error} /> : null}
        {info ? (
          <div
            role="status"
            className="rounded-xl border border-success-300 bg-success-100 px-4 py-3 text-sm text-success-700"
          >
            {info}
          </div>
        ) : null}

        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <Field id="password" label="Password" type="password" autoComplete="current-password" placeholder="Your password" required />

        <Button type="submit" fullWidth disabled={status === "submitting"}>
          {status === "submitting" ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3" role="presentation">
        <span className="h-px flex-1 bg-ink-200" />
        <span className="text-xs text-ink-500">or</span>
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <form onSubmit={handleEmailLink} className="flex flex-col gap-3" noValidate>
        <p className="text-xs leading-5 text-ink-600">
          Prefer no password? We can email you a one-time sign-in link.
        </p>
        <Field id="link-email" label="Email for sign-in link" type="email" autoComplete="email" placeholder="you@example.com" />
        <Button type="submit" variant="secondary" fullWidth disabled={status === "submitting"}>
          Email me a sign-in link
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link href="/forgot-password" className="text-sm text-ink-600 hover:text-ink-900 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </AuthShell>
  );
}
