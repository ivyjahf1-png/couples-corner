import { Logo } from "@/components/ui/Logo";

/**
 * Layout-level splash loader.
 * Next.js shows this fallback between route transitions while the next page's
 * data is being streamed from the server.
 */
export function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="mb-6">
        <Logo as="div" />
      </div>
      <div className="dot-loader" aria-hidden>
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
      <p className="mt-4 text-sm text-ink-500">Loading your corner…</p>
    </div>
  );
}
