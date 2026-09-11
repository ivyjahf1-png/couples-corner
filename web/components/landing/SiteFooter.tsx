import { Logo } from "@/components/ui/Logo";
import { Icon } from "./Icon";

const SUPPORT_EMAIL = "iremidetimmy398@gmail.com";
const WHATSAPP_NUMBER = "0807 556 6434";
const WHATSAPP_LINK = "https://wa.me/2348075566434";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Trust & safety",
    links: [
      { label: "Safety", href: "/safety" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Cookies", href: "/legal/cookies" },
    ],
  },
];

/** Marketing footer with clear topic groups and contact details. */
export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-surface-muted">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-10 md:grid md:grid-cols-4 md:gap-8">
          <div className="flex flex-col gap-3">
            <Logo as="div" />
            <p className="max-w-xs text-sm leading-6 text-ink-600">
              Real people. Meaningful connections. A warm, private space for
              couples to connect, share, and grow together.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2 text-sm">
              <p className="font-semibold text-ink-900">{col.title}</p>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-ink-600 transition hover:text-brand-700 hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-3 text-sm">
            <p className="font-semibold text-ink-900">Support</p>
            <ul className="flex flex-col gap-2">
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-2 text-ink-600 transition hover:text-brand-700 hover:underline"
                >
                  <Icon name="chat" className="h-4 w-4" />
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-ink-600 transition hover:text-brand-700 hover:underline"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp: {WHATSAPP_NUMBER}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-ink-200 pt-5 text-center text-xs leading-5 text-ink-500">
          © {new Date().getFullYear()} Couples Corner. Built with care for every
          couple · Support:{" "}
          <a className="text-brand-700 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}