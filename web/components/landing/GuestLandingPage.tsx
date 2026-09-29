import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Icon, type IconName } from "@/components/landing/Icon";
import { LandingFooterActions, LandingHeroActions } from "@/components/landing/HomeActions";

/**
 * Guest marketing landing page.
 *
 * ── WHY THIS IS A SEPARATE COMPONENT AND NOT THE FEED ──────────────────────
 * This route previously rendered the immersive MediaFeed to EVERYONE, signed in
 * or not, and treated marketing as "removed legacy blocks". That is a product
 * decision, not a technical constraint: a guest opened the app onto a
 * full-bleed video player with reaction buttons, a sponsored card and an ad
 * reward counter before learning what the product is or why they should care.
 *
 * The split is now the standard one:
 *   • signed in  -> the app, straight away (see app/page.tsx)
 *   • signed out -> this page, which explains the product and asks for one of
 *     three specific actions
 *
 * ── A SERVER COMPONENT ON PURPOSE ──────────────────────────────────────────
 * It reads no session data, so it stays cacheable and costs no session lookup.
 * Only the CTAs need interactivity, and those live in the small client island
 * exported from HomeActions.
 *
 * ── STATIC COPY, DELIBERATELY ──────────────────────────────────────────────
 * No live member counts, no "X people online", no testimonials pulled from the
 * database. Inventing those numbers would be dishonest, and querying for them
 * on every guest page load would make the landing page the slowest route in the
 * app — the opposite of what a landing page is for. The feature section is
 * therefore real product capability, not social proof.
 */

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "flame",
    title: "A feed that feels alive",
    body: "Photos and short clips from people you actually match with, not an ad treadmill. Swipe through the community the way you would on any reel app.",
  },
  {
    icon: "sparkle",
    title: "Matching, then conversation",
    body: "Discover people near you, connect when it feels right, and move straight into a real conversation — no cold-open messages from strangers.",
  },
  {
    icon: "crown",
    title: "Aristocracy",
    body: "Work up through six ranks for priority matching, exclusive profile frames, an ad-free feed and a badge beside your name.",
  },
  {
    icon: "live",
    title: "Go live, together",
    body: "Broadcast a moment or step into a live room. Presence dots and active status mean you always know who is actually around.",
  },
  {
    icon: "chat",
    title: "Chat that keeps up",
    body: "Threaded replies, reactions and read receipts, with your history retained so a conversation never evaporates overnight.",
  },
  {
    icon: "shield",
    title: "Safety you can see",
    body: "Block, report and manage active sessions from settings. Revoking a device signs it out immediately, not at the next login.",
  },
];

/** Three numbered steps. Concrete steps beat abstract adjectives here. */
const STEPS: { step: string; title: string; body: string }[] = [
  {
    step: "01",
    title: "Create your corner",
    body: "Sign up with an email, add a few photos and a line about yourself. That is the whole form — there is no long questionnaire.",
  },
  {
    step: "02",
    title: "Discover people",
    body: "Browse who is nearby, open a profile, and connect with the ones you like. Mutual connections unlock messaging.",
  },
  {
    step: "03",
    title: "Start talking",
    body: "Say something real. Matches turn into conversations, and conversations turn into something worth keeping.",
  },
];

export function GuestLandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0B1120] text-foreground">
      <SiteHeader />
      <main className="flex-1">
        {/* ── HERO ──────────────────────────────────────────────────────────
            The value proposition is the headline itself, not a sub-paragraph:
            a visitor decides in about two seconds whether to keep reading. These
            three CTAs are the only actions above the fold. */}
        <section className="relative overflow-hidden">
          {/* Ambient wash. Decorative and aria-hidden — the same aurora
              treatment the authenticated shell uses, so marketing and product
              share one visual identity. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,87,34,0.16),transparent_70%),radial-gradient(40%_40%_at_80%_20%,rgba(99,102,241,0.14),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:px-6 sm:py-28 lg:px-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-300">
              Couple&apos;s Corner
            </span>

            <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Meet people worth
              <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-indigo-400 bg-clip-text text-transparent">
                {" "}
                talking to
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-ink-300 sm:text-xl">
              A private, warm corner for real connection. Share your moments,
              discover people around you, and build something that lasts — away
              from the noise.
            </p>

            <div className="mt-10">
              <LandingHeroActions />
            </div>

            <p className="mt-6 text-sm text-ink-400">
              Free to join · No card required · Sign in with email
            </p>
          </div>
        </section>

        {/* ── FEATURES ───────────────────────────────────────────────────────
            Six real capabilities, not marketing adjectives. A visitor who
            cannot tell what the app DOES from this list has learned nothing. */}
        <section aria-labelledby="features-heading" className="border-t border-white/5">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-10">
            <h2
              id="features-heading"
              className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-ink-300">
              Built for people who would rather have one good conversation than a
              hundred empty ones.
            </p>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <span
                    aria-hidden
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-indigo-500/20 text-orange-300"
                  >
                    <Icon name={feature.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 leading-7 text-ink-300">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────────────────────
            A concrete path ("add a few photos") is far more persuasive at this
            stage than another claim about quality. */}
        <section aria-labelledby="steps-heading" className="border-t border-white/5">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-10">
            <h2
              id="steps-heading"
              className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Up and running in three steps
            </h2>

            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((item) => (
                <li key={item.step} className="relative">
                  {/* `aria-hidden` because the number is decoration: the
                      ordered list already conveys sequence to a screen reader,
                      and reading "01" aloud adds nothing. */}
                  <span
                    aria-hidden
                    className="text-5xl font-black tracking-tighter text-white/10"
                  >
                    {item.step}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 leading-7 text-ink-300">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── TRUST ──────────────────────────────────────────────────────────
            Links to the real policy pages rather than restating them. The copy
            makes no claim those pages do not already support. */}
        <section aria-labelledby="trust-heading" className="border-t border-white/5">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-6 lg:px-10">
            <h2
              id="trust-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Your corner stays yours
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink-300">
              We explain plainly what we store, who can see it, and how to get it
              back or delete it. Blocking, reporting and device management are
              built in rather than buried in a help centre.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/safety"
                className="rounded-xl border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Safety centre
              </a>
              <a
                href="/legal/privacy"
                className="rounded-xl border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Privacy policy
              </a>
              <a
                href="/legal/terms"
                className="rounded-xl border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Terms
              </a>
            </div>
          </div>
        </section>

        {/* ── CLOSING CTA ───────────────────────────────────────────────────
            Repeated because the page is long and most visitors scroll past the
            features before deciding. */}
        <section className="border-t border-white/5">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 lg:px-10">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your corner is waiting
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-300">
              Join free and start meeting people worth talking to.
            </p>
            <div className="mt-9">
              <LandingFooterActions />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
