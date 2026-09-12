import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Icon, type IconName } from "@/components/landing/Icon";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ContentSlot } from "@/components/content/ContentSlot";
import { HeroActions, CTAActions } from "@/components/landing/HomeActions";
import Link from "next/link";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}

interface FeatureProps {
  icon: IconName;
  title: string;
  body: string;
}

interface HeroSlotProps {
  src: string;
  alt: string;
  className?: string;
}

const HERO_PHOTO = "/images/hero-couple.jpg";

const BORDERS_GALLERY = [
  { country: "Nigeria", caption: "Lagos, Nigeria" },
  { country: "Kenya", caption: "Nairobi, Kenya" },
  { country: "South Africa", caption: "Cape Town, South Africa" },
  { country: "Ghana", caption: "Accra, Ghana" },
  { country: "Uganda", caption: "Kampala, Uganda" },
  { country: "Ethiopia", caption: "Addis Ababa, Ethiopia" },
];

function SectionHeading({ eyebrow, title, subtitle, align = "center" }: SectionHeadingProps) {
  const alignClasses = align === "center" ? "mx-auto text-center items-center" : "text-left items-start";
  return (
    <div className={`flex max-w-2xl flex-col gap-4 ${alignClasses}`}>
      <Chip tone="brand">{eyebrow}</Chip>
      <h2 className="text-3xl font-bold tracking-display text-ink-900 sm:text-4xl">{title}</h2>
      {subtitle ? <p className="text-lg leading-8 text-ink-600">{subtitle}</p> : null}
    </div>
  );
}

function Feature({ icon, title, body }: FeatureProps) {
  return (
    <Card as="article" tone="interactive" className="flex flex-col gap-4 p-6 card-premium">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="text-sm leading-6 text-ink-600">{body}</p>
    </Card>
  );
}

function HeroSlot({ src, alt, className }: HeroSlotProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className ?? ""}`} style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="landing-section overflow-hidden bg-gradient-to-b from-accent via-background to-background">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-10">
            <div className="flex flex-col gap-6 py-4">
              <Chip tone="brand">Trusted by people seeking something real</Chip>
              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-display text-ink-900 sm:text-5xl lg:text-6xl">Find someone worth coming home to.</h1>
              <p className="max-w-xl text-lg leading-8 text-ink-600">Meet genuine people, build meaningful connections, and discover a relationship that feels right.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <HeroActions />
              </div>
            </div>
            <HeroSlot src={HERO_PHOTO} alt="Couple enjoying a walk together" className="hero-photo aspect-[4/5] rounded-2xl" />
          </div>
        </section>

        <section className="landing-section">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <SectionHeading eyebrow="How it works" title="Find, match, and connect with real people" subtitle="A simple, thoughtful process built for genuine connections." />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Feature icon="profile" title="Build your profile" body="Create a profile that shows who you really are." />
              <Feature icon="discover" title="Discover matches" body="Browse profiles and find people who share your interests." />
              <Feature icon="chat" title="Start a conversation" body="Break the ice with a thoughtful message and see where it goes." />
            </div>
          </div>
        </section>

        <section className="landing-section bg-surface-muted">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <SectionHeading eyebrow="Features" title="Everything you need for real connections" />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Feature icon="lock" title="Private and secure" body="Your data stays yours. Privacy controls built in." />
              <Feature icon="shield" title="Verified profiles" body="We check profiles to keep the community genuine." />
              <Feature icon="moments" title="Share moments" body="Post updates and photos to show your story." />
              <Feature icon="couple" title="Built for couples" body="Designed for people and couples seeking connection." />
              <Feature icon="search" title="Smart matching" body="Our algorithm learns what works for you." />
              <Feature icon="flag" title="Safety tools" body="Block, report, and stay in control." />
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <SectionHeading eyebrow="Across borders" title="Connecting people everywhere" subtitle="From Lagos to Nairobi, Cape Town to Accra — real connections know no borders." />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BORDERS_GALLERY.map((item) => (
                <div key={item.country} className="media-placeholder flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl">
                  <span className="text-3xl">🌍</span>
                  <span className="font-semibold text-ink-900">{item.country}</span>
                  <span className="text-sm text-ink-600">{item.caption}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <SectionHeading eyebrow="Testimonials" title="Stories from our community" />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card tone="flat" className="p-6">
                <p className="text-sm leading-6 text-ink-600">&ldquo;We met on Couples Corner and hit it off immediately. The platform made it easy to find someone who truly understood us.&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-ink-900">— Sarah & James</p>
              </Card>
              <Card tone="flat" className="p-6">
                <p className="text-sm leading-6 text-ink-600">&ldquo;I was skeptical at first, but the verified profiles and safety features made me feel comfortable giving it a try.&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-ink-900">— Michael, Lagos</p>
              </Card>
              <Card tone="flat" className="p-6">
                <p className="text-sm leading-6 text-ink-600">&ldquo;The smart matching actually works. I found someone who shares my values and interests. We&apos;re so grateful!&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-ink-900">— Priya & David</p>
              </Card>
            </div>
          </div>
        </section>

        <section className="landing-section bg-surface-muted">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <div className="flex max-w-2xl flex-col gap-4">
              <Chip tone="brand">Featured</Chip>
              <h2 className="text-3xl font-bold tracking-display text-ink-900 sm:text-4xl">From the Couples Corner team</h2>
              <p className="text-lg leading-8 text-ink-600">Spotlights, official announcements, and special features.</p>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <ContentSlot placement="homepage" limit={3} />
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="mx-auto flex max-w-7xl justify-center px-5 sm:px-6 lg:px-10">
            <div className="dating-card">
              <div className="card-image">
                {/* eslint-disable @next/next/no-img-element */}
                <img src="/couple-date.jpg" alt="Couple sharing a moment on a date" />
              </div>
              <div className="card-content">
                <h3>Couple&apos;s Corner</h3>
                <p>Find genuine connections and real stories in settings designed for authentic moments.</p>
                <Link href="/matches" className="card-btn">Explore Matches</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <div className="relative overflow-hidden rounded-3xl bg-accent px-6 py-16 text-center sm:py-20">
              <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
                <h2 className="text-3xl font-bold tracking-display text-ink-900 sm:text-4xl">Your story could start today</h2>
                <p className="max-w-xl text-lg leading-8 text-ink-600">Join Couples Corner and start meeting people looking for something real.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <CTAActions />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
