import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/landing/Icon";

const SUPPORT_EMAIL = "iremidetimmy398@gmail.com";
const WHATSAPP_NUMBER = "0807 556 6434";
const WHATSAPP_LINK = "https://wa.me/2348075566434";

export default function ContactPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Contact us"
        title="We're here to help"
        subtitle="Have a question, feedback, or need support? Reach out to us via email or WhatsApp — we respond promptly."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card tone="raised" className="flex flex-col gap-4 p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Icon name="chat" className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-ink-900">Email support</h3>
            <p className="mt-1 text-sm text-ink-600">
              Send us an email and we&apos;ll get back to you within 24 hours.
            </p>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            <Icon name="send" className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
        </Card>

        <Card tone="raised" className="flex flex-col gap-4 p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-100 text-success-700">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-semibold text-ink-900">WhatsApp support</h3>
            <p className="mt-1 text-sm text-ink-600">
              Chat with us directly on WhatsApp for quick assistance.
            </p>
          </div>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-success-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-success-700"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat on WhatsApp: {WHATSAPP_NUMBER}
          </a>
        </Card>
      </div>

      <Card tone="muted" className="p-6">
        <h3 className="text-lg font-semibold text-ink-900">Other ways to reach us</h3>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li>· Browse our <Link href="/safety" className="text-brand-700 hover:underline">Safety centre</Link> for common questions.</li>
          <li>· Read our <Link href="/legal/terms" className="text-brand-700 hover:underline">Terms of Service</Link> and <Link href="/legal/privacy" className="text-brand-700 hover:underline">Privacy Policy</Link>.</li>
          <li>· Email us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-700 hover:underline">{SUPPORT_EMAIL}</a> for account or billing issues.</li>
        </ul>
      </Card>
    </div>
  );
}