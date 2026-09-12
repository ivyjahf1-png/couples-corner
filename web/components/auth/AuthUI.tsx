"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/landing/Icon";

/**
 * Shared shell for every authentication page: centered card on a warm
 * background with the Couples Corner brand. Layout stays server-rendered;
 * forms are client components.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8" aria-label="Couples Corner home">
        <Logo as="span" />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-surface p-8 shadow-card">
        <h1 className="text-2xl font-semibold tracking-display text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="mt-6 text-sm text-ink-500">{footer}</div> : null}
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  value?: string;
  error?: string;
  hint?: string;
}

/** Accessible labeled input with inline validation error and password toggle. */
export function Field({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  required,
  minLength,
  value,
  error,
  hint,
}: FieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          defaultValue={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={[
            "h-11 w-full rounded-xl border bg-surface px-3.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none",
            isPassword ? "pr-11" : "",
            error ? "border-danger-400 focus:border-danger-500" : "border-ink-200 focus:border-brand-400",
          ].join(" ")}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-xl px-3 text-ink-500 transition-colors hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <Icon name={showPassword ? "eye-off" : "eye"} className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Red banner for form-level errors, announced to screen readers. */
export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger-300 bg-danger-100 px-4 py-3 text-sm text-danger-700"
    >
      {message}
    </div>
  );
}

/** Green banner for success confirmations. */
export function FormSuccess({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-success-300 bg-success-100 px-4 py-3 text-sm text-success-700"
    >
      {message}
    </div>
  );
}
