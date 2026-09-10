import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Icon, type IconName } from "@/components/landing/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ContentSlot } from "@/components/content/ContentSlot";

/* ----------------------------------------------------------------------------
   Shared section helpers
   -------------------------------------------------------------------------- */
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
      <h2 className="text-3xl font-semibold tracking-display text-white sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-lg leading-relaxed text-slate-300">{subtitle}</p>
      ) : null}
    </div>
  );
}

function Feature({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <Card as="article" tone="interactive" className="flex flex-col gap-4 p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-6 text-slate-300">{body}</p>
    </Card>
  );
}

/* ----------------------------------------------------------------------------
   Hero illustration — abstract treatment of "two", warm and premium. No
   real people, no fake UI or user data.
   -------------------------------------------------------------------------- */
function HeroArt() {
  return (
    <Card tone="flat" className="relative overflow-hidden p-0">
      <svg
        viewBox="0 0 640 480"
        role="img"
        aria-label="Abstract illustration of two interlocking shapes in warm clay tones, representing a couple"
        className="h-auto w-full"
      >
        <defs>
          <radialGradient id="heroGlow" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#f7ece3" />
            <stop offset="100%" stopColor="#f2dcc9" />
          </radialGradient>
          <linearGradient id="shapeA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e3a98d" />
            <stop offset="100%" stopColor="#b1533c" />
          </linearGradient>
          <linearGradient id="shapeB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c96f52" />
            <stop offset="100%" stopColor="#8f3e2a" />
          </linearGradient>
        </defs>

        <rect width="640" height="480" rx="24" fill="url(#heroGlow)" />

        {/* floating sparks */}
        <circle cx="120" cy="90" r="6" fill="#e3a98d" opacity="0.55" />
        <circle cx="520" cy="380" r="7" fill="#c96f52" opacity="0.5" />
        <circle cx="540" cy="120" r="4" fill="#f2dcc9" opacity="0.8" />

        {/* two interlocking rounded petals */}
        <path
          d="M250 300 C210 260 200 210 210 170 260 130 C300 150 320 200 330 260 330 320 300 360 260 380 250 300 Z"
          fill="url(#shapeA)"
          opacity="0.92"
        />
        <path
          d="M390 300 C430 260 440 210 430 170 380 130 C340 150 320 200 310 260 310 320 340 360 380 380 390 300 Z"
          fill="url(#shapeB)"
          opacity="0.92"
        />

        {/* murmur mark between them */}
        <path
          d="M305 250 C295 265 295 280 305 295 Z"
          fill="#ffffff"
          opacity="0.95"
        />
      </svg>
      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-700 shadow-subtle">
        <Icon name="lock" className="h-3.5 w-3.5 text-brand-700" />
        Private &amp; safe by design
      </span>
    </Card>
  );
}
/* ----------------------------------------------------------------------------
   Page
   -------------------------------------------------------------------------- */
export default function Home() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section aria-labelledby="hero-heading" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col items-start gap-6">
              <Chip tone="brand" leadingDot>
                Built for couples, by design
              </Chip>
              <h1
                id="hero-heading"
                className="text-4xl font-semibold tracking-display text-white sm:text-5xl md:text-6xl"
              >
                A warm, private corner for the two of you
              </h1>
              <p className="max-w-xl text-xl leading-relaxed text-ink-600">
                Couples Corner helps you meet other couples, keep conversations
                alive, and share the moments that matter — in a space that feels
                safe, personal, and genuinely yours.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button href="/register" size="lg" variant="primary">
                  Join Couples Corner
                </Button>
                <Button href="#how-it-works" size="lg" variant="ghost">
                  See how it works
                </Button>
              </div>
              <p className="text-xs leading-5 text-ink-600">
                Free to join · Your data stays private · No fake profiles, ever
              </p>
            </div>
            <HeroArt />
          </div>

          {/* Couple's Corner Lifestyle Card */}
          <div className="mt-16 flex justify-center">
            <div className="dating-card">
              <div className="card-image">
                <img src="/couple-date.jpg" alt="Couple sharing a moment on a date" />
              </div>
              <div className="card-content">
                <h3>Couple's Corner</h3>
                <p>Find genuine connections and real stories in settings designed for authentic moments.</p>
                <a href="/join" className="card-btn">Explore Matches</a>
              </div>
            </div>
          </div>
        </section>

        {/* What we offer */}
        <section
          aria-labelledby="offer-heading"
          className="scroll-mt-24 mx-auto max-w-7xl px-6 py-24 lg:px-10"
        >
          <SectionHeading
            eyebrow="What you&apos;ll find"
            title="Everything a couple needs, in one place"
            subtitle="From meeting like-minded couples to building a shared home for your photos, chats, and memories."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon="discover"
              title="Meaningful connections"
              body="Discover users and couples who share your values, interests, and stage of life — and connect on your terms."
            />
            <Feature
              icon="profile"
              title="Profiles that feel like you"
              body="Thoughtful individual and couple profiles that tell your story without turning connection into a numbers game."
            />
            <Feature
              icon="couple"
              title="A couples-first community"
              body="This isn't a singles app in disguise. Couples come here, together, with features designed for two."
            />
            <Feature
              icon="chat"
              title="Conversations that flow"
              body="Private messaging that keeps up with real life — whether you&apos;re planning a trip or just checking in."
            />
            <Feature
              icon="moments"
              title="Share the moments that matter"
              body="Post updates and photos to your own corner, shared with only the people you choose."
            />
            <Feature
              icon="shield"
              title="Safe by design"
              body="Reporting, blocking, and privacy controls are first-class, not an afterthought. More below."
            />
          </div>
        </section>
{/* How it works */}
        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          className="scroll-mt-24 bg-accent mx-auto max-w-7xl px-6 py-24 lg:px-10"
        >
          <SectionHeading
            eyebrow="How it works"
            title="Three simple steps to your corner"
            subtitle="Getting started takes minutes and never rushes your story."
          />
          <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <li className="flex flex-col gap-4 rounded-2xl border border-brand-300 bg-surface p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-700">1</span>
              <h3 className="text-lg font-semibold text-ink-900">Create your profile</h3>
              <p className="text-sm leading-6 text-ink-600">
                Set up your individual profile, then create a couple profile when
                you&apos;re ready. You&apos;re in control of what&apos;s visible.
              </p>
            </li>
            <li className="flex flex-col gap-4 rounded-2xl border border-brand-300 bg-surface p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-700">2</span>
              <h3 className="text-lg font-semibold text-ink-900">Meet other couples</h3>
              <p className="text-sm leading-6 text-ink-600">
                Browse and connect with people who share your interests. Matches
                only proceed when you both say yes.
              </p>
            </li>
            <li className="flex flex-col gap-4 rounded-2xl border border-brand-300 bg-surface p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-700">3</span>
              <h3 className="text-lg font-semibold text-ink-900">Make it yours</h3>
              <p className="text-sm leading-6 text-ink-600">
                Message, share moments, and build a shared timeline that&apos;s
                private by default and always under your control.
              </p>
            </li>
          </ol>
        </section>

        {/* Trust & safety */}
        <section
          aria-labelledby="trust-heading"
          className="scroll-mt-24 mx-auto max-w-7xl px-6 py-24 lg:px-10"
        >
          <SectionHeading
            eyebrow="Trust & safety"
            title="Your space stays yours"
            subtitle="Safety isn't a feature we bolt on — it&apos;s how Couples Corner is designed from the ground up."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card tone="raised" className="flex flex-col gap-4 p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Icon name="lock" className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-semibold text-ink-900">Private by default</h3>
              <p className="text-sm leading-6 text-ink-600">
                Your profiles, posts, and messages are private unless you choose
                otherwise. Nothing is public without your say-so.
              </p>
            </Card>
            <Card tone="raised" className="flex flex-col gap-4 p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Icon name="flag" className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-semibold text-ink-900">Reporting & blocking</h3>
              <p className="text-sm leading-6 text-ink-600">
                Blocking and reporting are built into how Couples Corner works —
                you&apos;ll be able to block anyone in one tap and report concerns
                confidentially, with every report taken seriously.
              </p>
            </Card>
            <Card tone="raised" className="flex flex-col gap-4 p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Icon name="chat" className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-semibold text-ink-900">Safety-first messaging</h3>
              <p className="text-sm leading-6 text-ink-600">
                Conversations are designed to stay respectful — with controls
                planned to help you mute, step back, or step away whenever you
                need.
              </p>
            </Card>
          </div>
          <div className="mt-8 text-center">
            <Button href="/safety" variant="secondary">
              Read our safety centre
            </Button>
          </div>
        </section>
{/* Community / social */}
        <section
          aria-labelledby="community-heading"
          className="scroll-mt-24 mx-auto max-w-7xl px-6 py-24 lg:px-10"
        >
          <div className="flex flex-col gap-12 lg:grid lg:grid-cols-2 lg:items-center">
            <div className="flex flex-col gap-4">
              <SectionHeading
                align="left"
                eyebrow="A community that grows"
                title="More than a feed — a place to belong"
                subtitle=""
              />
              <p className="text-base leading-7 text-slate-300">
                Couples Corner is designed to be a genuinely welcoming community —
                where asking for connection feels comfortable and being yourself
                feels easy.
              </p>
              <p className="text-base leading-7 text-slate-300">
                We&apos;re growing carefully and intentionally. As people join, you&apos;ll
                find a lively, respectful space of couples at every stage — from
                first dates to decades together.
              </p>
              <ul className="flex flex-col gap-2 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <Icon name="sparkle" className="h-5 w-5 shrink-0 text-brand-700" />
                  <span>Meaningful conversation over endless swiping</span>
                </li>
                <li className="flex items-start gap-3">
                  <Icon name="sparkle" className="h-5 w-5 shrink-0 text-brand-700" />
                  <span>Quality is protected at every step</span>
                </li>
                <li className="flex items-start gap-3">
                  <Icon name="sparkle" className="h-5 w-5 shrink-0 text-brand-700" />
                  <span>You decide how visible — and how social — you want to be</span>
                </li>
              </ul>
            </div>
            <Card tone="flat" className="flex flex-col gap-5 p-8">
              <Chip tone="brand" leadingDot>On the horizon</Chip>
              <h3 className="text-xl font-semibold text-white">
                A home being built with you in mind
              </h3>
              <p className="text-sm leading-6 text-slate-300">
                We&apos;re still early and shaping every corner of the experience to be
                considered and kind. Your privacy, consent, and comfort guide every
                decision — and nothing here is ever contrived or inflated.
              </p>
              <p className="text-sm leading-6 text-slate-300">
                When you join, you&apos;re not a statistic — you&apos;re part of how Couples
                Corner becomes what it&apos;s meant to be.
              </p>
            </Card>
          </div>
        </section>

        {/* Featured / promotional content */}
        <section aria-labelledby="featured-slot-heading" className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
          <div className="flex max-w-2xl flex-col gap-4">
            <Chip tone="brand">Featured</Chip>
            <h2 id="featured-slot-heading" className="text-3xl font-semibold tracking-display text-white sm:text-4xl">
              From the Couples Corner team
            </h2>
            <p className="text-lg leading-relaxed text-slate-300">
              Spotlights, official announcements, and special features — nothing here is ever
              disguised as a real member&apos;s post.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ContentSlot placement="homepage" limit={3} />
          </div>
        </section>

        {/* Final CTA */}
        <section
          aria-labelledby="final-cta-heading"
          className="mx-auto max-w-7xl px-6 py-24 lg:px-10"
        >
          <div className="relative overflow-hidden rounded-3xl border border-brand-300 bg-accent px-6 py-16 text-center sm:py-20">
            <h2
              id="final-cta-heading"
              className="text-3xl font-semibold tracking-display text-white sm:text-4xl"
            >
              Your corner is waiting
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
              Join Couples Corner today and give your relationship a space that&apos;s
              warm, private, and all yours.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button href="/register" size="lg" variant="primary">
                Join Couples Corner
              </Button>
              <Button href="/about" size="lg" variant="ghost">
                Learn more
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
