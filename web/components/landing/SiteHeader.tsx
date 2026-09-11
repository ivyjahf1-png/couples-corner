import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/landing/Icon";

const navLinks: { label: string; href: string }[] = [
  { label: "Discover", href: "/discover" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Safety", href: "/safety" },
  { label: "Contact", href: "/contact" },
];

/**
 * Responsive marketing header. Sticky; primary CTAs (Log in / Join) stay
 * visible on every breakpoint while secondary links collapse into a
 * JavaScript-free `<details>` menu on small screens.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 sm:px-6 lg:px-10">
        <Logo as="div" />

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-ink-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Mobile menu */}
          <details className="md:hidden">
            <summary
              aria-label="Open menu"
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-ink-200 bg-surface text-ink-700 hover:bg-ink-100"
            >
              <span aria-hidden className="flex flex-col gap-1">
                <span className="h-0.5 w-4 rounded-full bg-current" />
                <span className="h-0.5 w-4 rounded-full bg-current" />
              </span>
            </summary>
            <nav
              aria-label="Secondary"
              className="absolute left-4 right-4 top-full z-50 rounded-xl border border-ink-200 bg-surface p-3 shadow-lifted"
            >
              <ul className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="/login"
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
                  >
                    Log in
                  </a>
                </li>
              </ul>
            </nav>
          </details>

          <a
            href="/login"
            className="hidden h-10 rounded-xl border border-ink-200 bg-surface px-4 text-sm font-medium text-ink-700 transition hover:border-ink-300 hover:bg-ink-100 sm:inline-flex sm:items-center"
          >
            Log in
          </a>
          <a
            href="/register"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-medium text-white shadow-subtle transition hover:bg-brand-800 active:bg-brand-900"
          >
            Join
            <Icon name="arrow" className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
