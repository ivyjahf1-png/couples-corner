"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell, Field, FormAlert, FormSuccess } from "@/components/auth/AuthUI";
import { Button } from "@/components/ui/Button";
import { requestPasswordReset } from "@/lib/supabase/auth-client";
import { authErrorMessage } from "@/lib/supabase/auth-errors";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSentTo(email);
      setSent(true);
    } catch (err) {
      // user-not-found is deliberately NOT revealed (anti-enumeration) — show
      // the same success state so accounts can't be probed.
      const message = authErrorMessage(err);
      if (message.includes("No account found")) {
        setSentTo(email);
        setSent(true);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/" className="font-semibold text-brand-700 hover:underline">
            Back to home
          </Link>
        </>
      }
    >
      {sent ? (
        <FormSuccess
          message={`If an account exists for ${sentTo}, a reset link is on its way. Check your inbox (and spam folder).`}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {error ? <FormAlert message={error} /> : null}
          <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" required />
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
