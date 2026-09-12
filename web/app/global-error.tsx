"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/**
 * Global error boundary (Next.js App Router root error file).
 *
 * Catches unhandled React render errors anywhere in the tree and shows a
 * clean recovery screen instead of crashing. Works alongside the per-layout
 * `error.tsx` files and the reusable `ErrorBoundary` component.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global render error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
          <Logo as="div" />
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-sm text-ink-500">
            {error?.message || "An unexpected error occurred while rendering the page."}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={reset}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-xl border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Back to home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
