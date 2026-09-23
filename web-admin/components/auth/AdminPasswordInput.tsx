"use client";

import { useState, type InputHTMLAttributes } from "react";

/** Eye / eye-off toggle icon set. */
function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

interface AdminPasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: string;
  autoCompleteType?: string;
}

/**
 * Password field with a viewable / toggleable visibility icon (eye ↔ eye-off).
 * Styling is driven entirely by the semantic color tokens (ink-*, brand-*),
 * so it renders correctly in both the light and `.admin-dark` contexts.
 */
export function AdminPasswordInput({
  label,
  error,
  hint,
  id,
  autoCompleteType,
  ...rest
}: AdminPasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          autoComplete={autoCompleteType}
          className={[
            "w-full rounded-xl border bg-surface px-4 py-2.5 pr-12 text-foreground placeholder:text-ink-400",
            "focus:border-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
            error ? "border-danger-400" : "border-ink-200",
          ].join(" ")}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-500 transition hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-xl"
        >
          <EyeIcon off={visible} />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-danger-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}