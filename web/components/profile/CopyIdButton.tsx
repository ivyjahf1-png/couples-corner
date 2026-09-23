"use client";

import { useState } from "react";

/**
 * Unique-ID chip with copy-to-clipboard — used on the profile header.
 */
export function CopyIdButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy profile ID ${value}`}
      title="Copy ID"
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-ink-300 transition hover:border-white/25 hover:text-white"
    >
      <span className="truncate font-mono">{label ?? value}</span>
      {copied ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-success-400" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <rect x="9" y="9" width="12" height="12" rx="2" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
