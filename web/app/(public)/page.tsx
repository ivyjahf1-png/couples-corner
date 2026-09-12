import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Icon, type IconName } from "@/components/landing/Icon";
import { MarketingImage } from "@/components/landing/MarketingImage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ContentSlot } from "@/components/content/ContentSlot";
import { HeroSlot } from "@/components/content/HeroSlot";
import Link from "next/link";

/* Marketing images are supplied via /public/images — see MarketingImage.
   Replace the gradients by placing real files in web/public/images/. */
const HERO_PHOTO = "/images/hero-couple.jpg";

const BORDERS_GALLERY: { src?: string; country: string; caption: string }[] = [
  { country: "Nigeria", caption: "Lagos, Nigeria" },
  { country: "Kenya", caption: "Nairobi, Kenya" },
  { country: "South Africa", caption: "Cape Town, South Africa" },
  { country: "Ghana", caption: "Accra, Ghana" },
  { country: "Uganda", caption: "Kampala, Uganda" },
  { country: "Ethiopia", caption: "Addis Ababa, Ethiopia" },
];

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const alignClasses =
    align === "center" ? "mx-auto text-center items-center" : "text-left items-start";
  return (
    <div className={`flex max-w-2xl flex-col gap-4 ${alignClasses}`}>
      <Chip tone="brand">{eyebrow}</Chip>
      <h2 className="text-3xl font-bold tracking-display text-ink-900 sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-lg leading-8 text-ink-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

function Feature({ icon, title, body }: { icon: IconName; title: string; body: string }) {
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

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* ------------------------------ HERO ------------------------------ */}
        <section className="landing-section overflow-hidden bg-gradient-to-b from-accent via-background to-background">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-10">
            <div className="flex flex-col gap-6 py-4">
              <Chip tone="brand">Trusted by people seeking something real</Chip>
              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-display text-ink-900 sm:text-5xl lg:text-6xl">
                Find someone worth coming home to.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-ink-600">
                Meet genuine people, build meaningful connections, and discover
                a relationship that feels right.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button href="/register" size="lg" variant="primary">
                  Join Couples Corner
                </Button>
                <Button href="/how-it-works" size="lg" variant="secondary">
                  Explore How It Works
                </Button>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-700">
                <li className="flex items-center gap-2">
                  <Icon name="shield" className="h-4 w-4 text-brand-700" /> Real people, verified
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="chat" className="h-4 w-4 text-brand-700" /> Meaningful conversations
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="sparkle" className="h-4 w-4 text-brand-700" /> Safe & private
                </li>
              </ul>
            </div>

            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-3xl shadow-lifted sm:aspect-[5/6] lg:aspect-[4/5]">
                <MarketingImage
                  src={HERO_PHOTO}
                  alt="A warm couple sharing a genuine moment together"
                  tone="hero"
                  eager
                  className="h-full w-full"
                />
                <HeroSlot className="absolute inset-0 h-full w-full" />
              </div>
              <Card tone="raised" className="absolute -bottom-5 left-4 right-4 max-w-xs p-4 sm:left-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-600">
                    <Icon name="check" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Profiles reviewed</p>
                    <p className="text-xs text-ink-500">Real people, real stories</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* -------------------- TRUST / SAFETY STRIP ------------------------ */}
        <section className="border-y border-ink-200 bg-surface-muted">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-10">
            {[
              { icon: "shield" as const, text: "Report any profile instantly" },
              { icon: "lock" as const, text: "Block unwanted users in one tap" },
              { icon: "chat" as const, text: "Private, secure conversations" },
              { icon: "eye" as const, text: "Verified profiles with care" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-ink-800">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --------------------- WHY COUPLES CORNER ------------------------- */}
        <section className="landing-section">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <SectionHeading
              eyebrow="Why Couples Corner"
              title="A dating experience built around real connection"
              subtitle="We focus on quality over quantity — thoughtful profiles, genuine conversations, and tools that keep you safe."
            />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Feature icon="profile" title="Authentic profiles" body="Thoughtful profiles encourage honesty — the foundation of every meaningful connection." />
              <Feature icon="shield" title="Safety first" body="Report, block, and privacy controls keep your experience comfortable and under your control." />
              <Feature icon="chat" title="Meaningful chats" body="Talk on a secure, private channel designed for real conversation over endless swiping." />
              <Feature icon="sparkle" title="Curated community" body="We moderate profiles to keep the community respectful, genuine, and scam-aware." />
              <Feature icon="couple" title="Diverse & inclusive" body="People and couples from all over the world come together here — across cultures and backgrounds." />
              <Feature icon="lock" title="Your privacy, your way" body="You decide how visible — and how social — you want to be at every step." />
            </div>
          </div>
        </section>

        {/* --------------------- DISCOVER PREVIEW --------------------------- */}
        <section className="landing-section bg-surface-muted">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <SectionHeading
              eyebrow="Discover"
              title="Love has no borders"
              subtitle="Connections are blooming across the world. Meet people from different countries and cultures."
              align="left"
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {BORDERS_GALLERY.map((place) => (
                <Card
                  key={place.caption}
                  as="article"
                  tone="raised"
                  className="overflow-hidden p-0 card-premium"
                >
                  <MarketingImage
                    src={`/images/borders-${place.country.toLowerCase().replace(/\s+/g, "-")}.jpg`}
                    alt={`A couple in ${place.caption}`}
                    tone="media"
                    className="aspect-[4/3]"
                  />
                  <div className="flex items-center justify-between p-5">
                    <div>
                      <h3 className="text-base font-semibold text-ink-900">{place.country}</h3>
                      <p className="text-sm text-ink-500">{place.caption}</p>
                    </div>
                    <a
                      href="/discover"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-brand-700 transition hover:bg-brand-100"
                      aria-label={`Discover people in ${place.caption}`}
                    >
                      <Icon name="arrow" className="h-4 w-4" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------- STORIES / COMMUNITY ------------------------- */}
        <section className="landing-section">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <SectionHeading
              eyebrow="Stories"
              title="Real stories from our community"
              subtitle="Warm, hopeful moments worth sharing — from people who found what they were looking for."
            />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { title: "Where it all felt easy", story: "We matched on a shared love of long walks and honest Sunday chats. Three months in, it still feels that simple.", author: "Amara & D." },
                { title: "A second chance at love", story: "After years on and off, we both wanted something real. Couples Corner made it feel safe to open up again.", author: "Thandi & Kofi" },
                { title: "Two cities, one future", story: "We lived an ocean apart but never felt distant. Today we're planning a home — together.", author: "Nia & Santiago" },
              ].map((s) => (
                <Card key={s.title} as="article" tone="interactive" className="flex flex-col overflow-hidden p-0 card-premium">
                  <MarketingImage
                    src={`/images/story-${s.title.toLowerCase().split(" ").slice(0, 2).join("-").replace(/[^a-z-]/g, "")}.jpg`}
                    alt={`Story: ${s.title}`}
                    tone="story"
                    className="aspect-[16/9]"
                  />
                  <div className="flex flex-col gap-3 p-6">
                    <h3 className="text-lg font-semibold text-ink-900">{s.title}</h3>
                    <p className="text-sm leading-6 text-ink-600">{s.story}</p>
                    <p className="mt-auto pt-2 text-sm font-medium text-brand-700">{s.author}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------- PROMOTIONAL / FEATURED ---------------------- */}
        <section className="landing-section bg-surface-muted">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <div className="flex max-w-2xl flex-col gap-4">
              <Chip tone="brand">Featured</Chip>
              <h2 className="text-3xl font-bold tracking-display text-ink-900 sm:text-4xl">
                From the Couples Corner team
              </h2>
              <p className="text-lg leading-8 text-ink-600">
                Spotlights, official announcements, and special features.
              </p>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <ContentSlot placement="homepage" limit={3} />
            </div>
          </div>
        </section>

        {/* ------------------- WELCOME CARD --------------------------------- */}
        <section className="landing-section">
          <div className="mx-auto flex max-w-7xl justify-center px-5 sm:px-6 lg:px-10">
            <div className="dating-card">
              <div className="card-image">
                {/* eslint-disable @next/next/no-img-element */}
                <img src="/couple-date.jpg" alt="Couple sharing a moment on a date" />
              </div>
              <div className="card-content">
                <h3>Couple&apos;s Corner</h3>
                <p>
                  Find genuine connections and real stories in settings designed
                  for authentic moments.
                </p>
                <Link href="/matches" className="card-btn">
                  Explore Matches
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------- FINAL CTA -------------------------------- */}
        <section className="landing-section">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <div className="relative overflow-hidden rounded-3xl bg-accent px-6 py-16 text-center sm:py-20">
              <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
                <h2 className="text-3xl font-bold tracking-display text-ink-900 sm:text-4xl">
                  Your story could start today
                </h2>
                <p className="max-w-xl text-lg leading-8 text-ink-600">
                  Join Couples Corner and start meeting people looking for
                  something real.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button href="/register" size="lg" variant="primary">
                    Create Free Account
                  </Button>
                  <Button href="/how-it-works" size="lg" variant="ghost">
                    Learn more
                  </Button>
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
