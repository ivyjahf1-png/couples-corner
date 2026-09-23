import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

interface AdminAuthShellProps {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Shared shell for the admin authentication views (login / sign-up).
 * Distinct, centered card layout on the token-driven dark admin surface.
 */
export function AdminAuthShell({ title, subtitle, footer, children }: AdminAuthShellProps) {
  return (
    <div className="admin-dark app-canvas flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8" aria-label="Couples Corner Admin home">
        <Logo as="span" />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-orange-500/25 bg-surface shadow-card">
        <div className="border-b border-ink-200 px-8 pb-5 pt-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Couples Corner Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-display text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-600">{subtitle}</p>
        </div>
        <div className="px-8 py-6">{children}</div>
      </div>
      <div className="mt-6 text-sm text-ink-500">{footer}</div>
    </div>
  );
}