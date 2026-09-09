import { Logo } from "@/components/ui/Logo";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Contact", href: "mailto:hello@couplescorner.app" },
    ],
  },
  {
    title: "Trust & safety",
    links: [
      { label: "Safety", href: "/safety" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
    ],
  },
];

/** Marketing footer with clear topic groups and honest placeholder contact. */
export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-surface-muted">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="flex flex-col gap-10 md:grid md:grid-cols-3 md:gap-8">
          <div className="flex flex-col gap-3">
            <Logo as="div" />
            <p className="text-sm leading-6 text-slate-300">
              A warm, private space for couples to connect, share, and grow
              together.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2 text-sm">
              <p className="font-semibold text-white">{col.title}</p>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-slate-300 transition hover:text-white hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-10 border-t border-ink-200 pt-5 text-center text-xs leading-5 text-slate-300">
          © {new Date().getFullYear()} Couples Corner. Built with care for every
          couple · Email:{" "}
          <a className="text-slate-200 hover:underline" href="mailto:hello@couplescorner.app">
            hello@couplescorner.app
          </a>
        </p>
      </div>
    </footer>
  );
}