"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AuthShell, Field, FormAlert } from "@/components/auth/AuthUI";
import { Button } from "@/components/ui/Button";
import { signInWithEmail, sendEmailSignInLink, registerAndProvision } from "@/lib/supabase/auth-client";
import { authErrorMessage } from "@/lib/supabase/auth-errors";

/**
 * Custom event payload: `{ which: "login" | "register" }`
 *
 * Any "Sign in" / "Register" link on the site can dispatch this event instead
 * of hard-navigating to `/login` or `/register`. A global listener (mounted in
 * the root layout) opens the matching modal overlay.
 */
export type AuthModalType = "login" | "register";
export interface OpenAuthModalEvent extends CustomEvent {
  detail: { which: AuthModalType };
}

export const AUTH_MODAL_EVENT = "couplescorner:open-auth-modal";

/** Dispatch this event from any client component to open the auth modal. */
export function openAuthModal(which: AuthModalType) {
  window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT, { detail: { which } }));
}

/** Dispatch this event after a successful auth action (login/register). */
export function notifyAuthSuccess(action: "login" | "register") {
  window.dispatchEvent(new CustomEvent("couplescorner:auth-success", { detail: { action } }));
}

/**
 * Modal-based login form.
 *
 * Renders the same AuthShell + form markup as `/login` but lives in a fixed
 * overlay. On successful sign-in it dispatches a `close` event and a `login`
 * event so the host page can refresh session data client-side.
 */
function LoginModalContent({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "link-sent">("idle");
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
      notifyAuthSuccess("login");
      onClose();
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
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT, { detail: { which: "register" } }))
            }
            className="font-semibold text-brand-700 hover:underline"
          >
            Create an account
          </button>
        </>
      }
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-ink-500 hover:text-ink-900"
        aria-label="Close"
      >
        ✕
      </button>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error ? <FormAlert message={error} /> : null}
        {info ? (
          <div role="status" className="rounded-xl border border-success-300 bg-success-100 px-4 py-3 text-sm text-success-700">
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
    </AuthShell>
  );
}

/**
 * Modal-based register form.
 */
function RegisterModalContent({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(data: FormData): Record<string, string> {
    const errors: Record<string, string> = {};
    const displayName = String(data.get("displayName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (!displayName) errors.displayName = "Please tell us what to call you.";
    else if (displayName.length > 60) errors.displayName = "Keep it under 60 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
    if (password.length < 8) errors.password = "Use at least 8 characters.";
    else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
      errors.password = "Include at least one letter and one number.";
    if (confirm !== password) errors.confirm = "Passwords don't match.";
    return errors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const data = new FormData(event.currentTarget);
    const errors = validate(data);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      await registerAndProvision(
        String(data.get("email")),
        String(data.get("password")),
        String(data.get("displayName")).trim()
      );
      notifyAuthSuccess("register");
      onClose();
    } catch (err) {
      setFormError(authErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join a warm, respectful community built for people and couples seeking genuine connection."
      footer={
        <>
          Already have an account?{" "}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT, { detail: { which: "login" } }))
            }
            className="font-semibold text-brand-700 hover:underline"
          >
            Sign in
          </button>
        </>
      }
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-ink-500 hover:text-ink-900"
        aria-label="Close"
      >
        ✕
      </button>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {formError ? <FormAlert message={formError} /> : null}
        <Field id="displayName" label="Display name" autoComplete="name" placeholder="How should we greet you?" required error={fieldErrors.displayName} />
        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" required error={fieldErrors.email} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} hint="At least 8 characters with a letter and a number." error={fieldErrors.password} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" placeholder="Repeat your password" required minLength={8} error={fieldErrors.confirm} />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Creating your account…" : "Create account"}
        </Button>
        <p className="text-center text-xs leading-5 text-ink-500">
          By creating an account you agree to our <Link href="/legal/terms" className="underline hover:text-ink-700">Terms</Link> and{" "}
                    <Link href="/legal/privacy" className="underline hover:text-ink-700">Privacy Policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}

/**
 * The modal overlay itself.
 *
 * Fixed position, full-viewport backdrop with a scrollable centered shell.
 * Renders the matching form based on `which`.
 */
export function AuthModal({ which, onClose }: { which: AuthModalType; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={which === "login" ? "Sign in" : "Create account"}
    >
      <div
        className="relative my-8 w-full max-w-md max-sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {which === "login" ? <LoginModalContent onClose={onClose} /> : <RegisterModalContent onClose={onClose} />}
      </div>
    </div>
  );
}

/**
 * Global provider component — mount once in the root layout.
 *
 * Listens for `couplescorner:open-auth-modal` events and renders the overlay.
 * Also listens for `couplescorner:auth-success` to redirect to the dashboard
 * after a successful sign-in / sign-up.
 */
export function AuthModalProvider() {
  const [active, setActive] = useState<AuthModalType | null>(null);

  const handleOpen = useCallback((e: Event) => {
    const evt = e as OpenAuthModalEvent;
    setActive(evt.detail.which);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (active) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [active]);

  // Handle successful auth — close modal and redirect to dashboard
  const handleAuthSuccess = useCallback(() => {
    setActive(null);
    // Redirect to dashboard after successful login/signup
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  }, []);

  // Register global event listeners
  useEffect(() => {
    window.addEventListener(AUTH_MODAL_EVENT, handleOpen as EventListener);
    window.addEventListener("couplescorner:auth-success", handleAuthSuccess as EventListener);
    return () => {
      window.removeEventListener(AUTH_MODAL_EVENT, handleOpen as EventListener);
      window.removeEventListener("couplescorner:auth-success", handleAuthSuccess as EventListener);
    };
  }, [handleOpen, handleAuthSuccess]);

  if (!active) return null;

  return <AuthModal which={active} onClose={() => setActive(null)} />;
}

export { LoginModalContent, RegisterModalContent };
