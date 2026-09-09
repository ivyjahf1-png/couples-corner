import type { ReactNode } from "react";

/**
 * Public / marketing zone shell.
 *
 * No auth guard here — these pages are reachable by everyone. Public nav and
 * footer render inside this wrapper when the UI is built; for now this is a
 * minimal scaffold that keeps the public route group physically separate.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <section data-zone="public" className="flex min-h-full flex-1 flex-col">
      {children}
    </section>
  );
}