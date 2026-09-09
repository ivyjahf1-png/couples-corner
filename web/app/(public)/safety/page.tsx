import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { Icon, type IconName } from "@/components/landing/Icon";

/** How Couples Corner protects you. Honest, no absolute safety claims. */
function Feature({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sm leading-6 text-slate-300">{children}</p>
      </div>
    </div>
  );
}

export default function SafetyPage() {
  return (
    <div className="flex flex-col gap-14">
      <PageHeader
        eyebrow="Safety center"
        title="Safety & privacy"
        subtitle="Your safety is a shared responsibility. These are the tools and habits that keep Couples Corner trustworthy — and what you can always do to stay protected."
      />

      <section
        aria-labelledby="lead-heading"
        className="rounded-2xl border border-danger-200 bg-danger-50 p-6 sm:p-8"
      >
        <h2 id="lead-heading" className="max-w-2xl text-xl font-semibold text-danger-900">
          Never send money to someone you have not met in person.
        </h2>
        <ul className="mt-3 max-w-2xl space-y-2 text-sm text-danger-800">
          <li>• Never share passwords or verification codes — Couples Corner staff will never ask for them.</li>
          <li>• Be cautious of investment, crypto, or gift-card requests, especially early on.</li>
          <li>• Treat emergency-money stories with skepticism; confirm through another channel if possible.</li>
          <li>• Question links to external sites or downloads; scams often arrive as urgent asks.</li>
        </ul>
      </section>

      <section aria-labelledby="platform-heading" className="flex flex-col gap-6">
        <h2 id="platform-heading" className="font-semibold text-white">
          What Couples Corner does
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon="shield" title="Privacy controls">
            Control who sees your profile, interests, and activity. Profiles are private by default.
          </Feature>
          <Feature icon="lock" title="Blocking">
            Block anyone to remove them from your experience. Blocked users cannot message, connect with, or see you.
          </Feature>
          <Feature icon="flag" title="Reporting">
            Every profile, post, comment, message, and photo has a Report option. Reports are reviewed by moderators.
          </Feature>
          <Feature icon="sparkle" title="Scam detection">
            We scan for known scam patterns (money asks, gift cards, suspicious links) and flag them for review — never as an automatic ban.
          </Feature>
          <Feature icon="chat" title="Private conversations">
            Messages are visible only to participants. We scan for scam patterns but do not read conversations for other purposes.
          </Feature>
          <Feature icon="bell" title="Safety alerts">
            If a message looks like a scam, you&apos;ll see a warning before it reaches your regular inbox.
          </Feature>
        </div>
      </section>

      <section aria-labelledby="habits-heading" className="flex flex-col gap-6">
        <h2 id="habits-heading" className="font-semibold text-white">
          Safety habits that work
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="check" className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm text-slate-300">Keep conversations on Couples Corner until you genuinely trust someone.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="check" className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm text-slate-300">Video chat first before meeting in person, and always meet in a public place.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="check" className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm text-slate-300">Tell a friend or partner where you&apos;re going and who you&apos;re meeting.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="check" className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm text-slate-300">If something feels off, block and report it rather than engaging.</span>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-surface p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Need help?</h2>
        <p className="mt-1 text-sm text-slate-300">
          Have a specific safety concern? Email{" "}
          <a
            href="mailto:safety@couplescorner.app"
            className="text-brand-700 underline decoration-brand-300/50 underline-offset-2"
          >
            safety@couplescorner.app
          </a>
          {" "}or review our{" "}
          <Link href="/legal/terms" className="text-brand-700 underline">
            Terms of Service
          </Link>
          . We read every message and respond promptly.
        </p>
      </section>
    </div>
  );
}
