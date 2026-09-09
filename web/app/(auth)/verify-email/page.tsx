"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, Field, FormAlert, FormSuccess } from "@/components/auth/AuthUI";
import { Button } from "@/components/ui/Button";
import {
  completeEmailSignInLink,
  observeAuthState,
  resendEmailVerification,
} from "@/lib/firebase/auth-client";
import { authErrorMessage } from "@/lib/firebase/auth-errors";

type Mode = "checking" | "link" | "done" | "verify";

/**
 * This page serves two purposes:
 *  1. Completing passwordless (email-link) sign-ins opened from the inbox.
 *  2. Letting a signed-in user confirm/resend their email verification.
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("checking");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const isEmailLink =
        typeof window !== "undefined" &&
        (await import("firebase/auth")).isSignInWithEmailLink(
          (await import("@/lib/firebase/client")).getFirebaseAuth(),
          window.location.href
        );

      if (isEmailLink) {
        setMode("link");
        const stored = window.localStorage.getItem("ccEmailForSignIn");
        if (stored) {
          try {
            await completeEmailSignInLink(stored);
            window.localStorage.removeItem("ccEmailForSignIn");
            if (!cancelled) {
              setMode("done");
              router.push("/dashboard");
              router.refresh();
            }
          } catch (err) {
            if (!cancelled) {
              setError(authErrorMessage(err));
              setMode("link");
            }
          }
        }
        return;
      }

      // Not an email link — show verification status if signed in.
      const unsubscribe = observeAuthState((user) => {
        if (cancelled) return;
        if (user) {
          setVerified(user.emailVerified);
          setMode("verify");
        } else {
          setMode("link");
        }
      });
      return unsubscribe;
    }

    const cleanup = run();
    return () => {
      cancelled = true;
      void Promise.resolve(cleanup).then((fn) => typeof fn === "function" && fn());
    };
  }, [router]);

  async function handleComplete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const entered = String(data.get("email") ?? "").trim();
    try {
      await completeEmailSignInLink(entered);
      window.localStorage.removeItem("ccEmailForSignIn");
      setMode("done");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setSubmitting(true);
    try {
      await resendEmailVerification();
      setError(null);
      setVerified(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Confirm your email"
      subtitle="A quick confirmation keeps the community safe and your account recoverable."
      footer={
        <Link href="/" className="font-semibold text-brand-700 hover:underline">
          Back to home
        </Link>
      }
    >
      {mode === "checking" ? (
        <p className="text-sm text-ink-600" role="status">Checking your link…</p>
      ) : null}

      {mode === "done" ? (
        <FormSuccess message="You're signed in! Taking you to your dashboard…" />
      ) : null}

      {mode === "link" ? (
        <form onSubmit={handleComplete} className="flex flex-col gap-4" noValidate>
          {error ? <FormAlert message={error} /> : null}
          <p className="text-sm leading-6 text-ink-600">
            Opened your sign-in link on a different device or browser? Confirm the email
            address the link was sent to.
          </p>
          <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" required />
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "Completing sign-in…" : "Complete sign-in"}
          </Button>
        </form>
      ) : null}

      {mode === "verify" ? (
        <div className="flex flex-col gap-4">
          {error ? <FormAlert message={error} /> : null}
          {verified ? (
            <FormSuccess message="Your email is verified — everything is set." />
          ) : (
            <>
              <p className="text-sm leading-6 text-ink-600">
                We sent you a verification email when you registered. Follow the link in it,
                then come back here — or send it again below.
              </p>
              <Button onClick={handleResend} variant="secondary" fullWidth disabled={submitting}>
                {submitting ? "Sending…" : "Resend verification email"}
              </Button>
            </>
          )}
          <Button onClick={() => router.push("/dashboard")} variant="ghost" fullWidth>
            Continue to dashboard
          </Button>
        </div>
      ) : null}
    </AuthShell>
  );
}
