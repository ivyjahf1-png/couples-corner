import type { ReactNode } from "react";
import { Chip, Logo } from "@/components/ui";

/**
 * Minimal foundation placeholder used until real page UI is built.
 *
 * This is intentionally NOT a polished page — it is a consistent, accessible
 * stub that proves a route exists and exercises the Couples Corner design
 * system (brand / ink / display typography / primitives) defined in
 * `app/globals.css` and `components/ui`.
 */
export function PlaceholderPage({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-24">
      <Logo as="h1" />
      <Chip tone="brand" leadingDot>
        Route scaffolded
      </Chip>
      <h2 className="text-4xl font-semibold tracking-display text-ink-900">
        {title}
      </h2>
      {children}
    </div>
  );
}