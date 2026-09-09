"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, Field, FormAlert } from "@/components/auth/AuthUI";
import { Button } from "@/components/ui/Button";
import { registerAndProvision } from "@/lib/firebase/auth-client";
import { authErrorMessage } from "@/lib/firebase/auth-errors";

interface FieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validate(data: FormData): FieldErrors {
    const errors: FieldErrors = {};
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
      router.push("/dashboard");
      router.refresh();
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
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {formError ? <FormAlert message={formError} /> : null}

        <Field
          id="displayName"
          label="Display name"
          autoComplete="name"
          placeholder="How should we greet you?"
          required
          error={fieldErrors.displayName}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          error={fieldErrors.email}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          hint="At least 8 characters with a letter and a number."
          error={fieldErrors.password}
        />
        <Field
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          required
          minLength={8}
          error={fieldErrors.confirm}
        />

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Creating your account…" : "Create account"}
        </Button>

        <p className="text-center text-xs leading-5 text-ink-500">
          By creating an account you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:text-ink-700">Terms</Link> and{" "}
          <Link href="/legal/privacy" className="underline hover:text-ink-700">Privacy Policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}
