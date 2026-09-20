import Link from "next/link";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroMediaCard } from "@/components/landing/HeroMediaCard";
import { LandingFeatureMedia } from "@/components/content/LandingFeatureMedia";
import { EventsBoard } from "@/components/content/EventsBoard";
import { TestimonialShowcase } from "@/components/content/TestimonialShowcase";
import { getPublishedForPlacement } from "@/lib/server/content";
import { buildHeroSlides } from "@/lib/utils/hero-slides";
import type { CarouselMedia } from "@/components/content/MediaCarousel";
import { Icon } from "@/components/landing/Icon";
import { INSIGHT_ARTICLES } from "@/app/insights/page";

// Render on every request so admin-uploaded media on the homepage placement
// appears instantly when published (no cached stale copy).
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  // Fetched per request (dynamic = force-dynamic) so newly published admin
  // events and testimonials appear instantly, without a rebuild.
  const [events, testimonialItems, heroItems] = await Promise.all([
    getPublishedForPlacement("events"),
    getPublishedForPlacement("testimonials"),
    getPublishedForPlacement("hero"),
  ]);

  // Admin-uploaded hero media (image ads + videos) for the featured hero card.
  const heroSlides = buildHeroSlides(heroItems);

  const testimonialMedia = testimonialItems.map(
    (item): CarouselMedia => ({ url: item.mediaUrl, kind: item.mediaType })
  );
  const testimonialCaptions = Object.fromEntries(
    testimonialItems.map((item) => [item.mediaUrl, item.description ?? ""])
  );
  const testimonialLinks = Object.fromEntries(
    testimonialItems
      .filter((item) => item.destinationUrl)
      .map((item) => [item.mediaUrl, item.destinationUrl!])
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <LandingNavbar signUpHref="/register" signInHref="/login" />
      <section className="relative overflow-hidden bg-[#0B1120] pt-24 pb-20 sm:pt-32 sm:pb-24 lg:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#1E293B_0%,_transparent_55%)] opacity-40" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#FF5722_0%,_transparent_50%)] opacity-10" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:px-10 xl:gap-16">
          {/* Copy — 7 of the 12 columns on large screens. */}
          <div className="flex w-full max-w-2xl flex-col items-start lg:col-span-7 lg:max-w-none lg:pr-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" aria-hidden="true" />
              Couple&apos;s Corner
            </span>
            <h1 className="mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl sm:leading-[1.05] xl:text-6xl">
              <span className="block">Build Your</span>
              <span className="mt-2 block text-orange-400">Lasting Partnership</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl sm:leading-9">
              Couple's Corner brings couples together with relationship insights, a supportive Q&amp;A community, and local meetups — everything you need to grow together.
            </p>
            <div className="mt-10 flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center">
              <Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5722] px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:bg-[#F4511E] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-[#0B1120]">Join Couple's Corner<svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg></Link>
              <Link href="/about" className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30">Learn More<svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg></Link>
            </div>
          </div>

          {/* Featured media card — 5 of the 12 columns on large screens. */}
          <div className="w-full lg:col-span-5">
            <HeroMediaCard slides={heroSlides} />
          </div>
        </div>
      </section>
      <section className="bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything you need, in one place</h2>
            <p className="mt-4 text-lg text-white/60">From expert guidance to real-world connections, Couple's Corner supports your journey.</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Dynamic admin media (homepage placement) — when published content
                exists it renders here as large immersive media cards; the static
                feature cards below always render as the reliable fallback. */}
            <div className="sm:col-span-2 lg:col-span-3">
              <LandingFeatureMedia />
            </div>
            <Link
              href="/insights"
              aria-label="Relationship Insights — explore expert articles and guides"
              className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-xl hover:shadow-orange-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:translate-y-0 active:bg-white/15"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 text-white transition group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Relationship Insights</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Personalized guidance and expert-backed articles on communication, trust, and intimacy.</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 transition group-hover:text-orange-300">Explore insights<svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg></span>
            </Link>
            <Link
              href="/community"
              aria-label="Q&A Forum — join the conversation"
              className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-xl hover:shadow-orange-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:translate-y-0 active:bg-white/15"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337 5.972 5.972 0 0 1-3.535 1.057 5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Q&amp;A Forum</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Ask questions and get honest advice from a warm community of couples and coaches.</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-300">Join the conversation</span>
            </Link>
            <Link
              href="/events"
              aria-label="Local Meetups — find events near you"
              className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-xl hover:shadow-orange-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:translate-y-0 active:bg-white/15"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF5722] text-white transition group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Local Meetups</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Find date nights, workshops, and couples retreats near you.</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 transition group-hover:text-orange-300">Find meetups<svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg></span>
            </Link>
          </div>
        </div>
      </section>
      {/* Relationship Insights — individual guide cards linking to each full article. */}
      <section className="bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] py-20 sm:py-24" aria-labelledby="insights-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="insights-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Relationship Insights</h2>
            <p className="mt-4 text-lg text-white/60">Expert-backed guides to help you grow together — one topic at a time.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INSIGHT_ARTICLES.map((article) => (
              <Link
                key={article.slug}
                href={`/insights/${article.slug}`}
                aria-label={`${article.title} — read the full guide`}
                className="group relative block rounded-xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-xl hover:shadow-orange-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] active:translate-y-0 active:scale-[0.99] active:border-orange-400/50 active:bg-white/10"
              >
                <span className="inline-block rounded-md bg-gradient-to-r from-orange-500/20 to-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-200">
                  {article.eyebrow}
                </span>
                <h3 className="mt-4 text-lg font-bold text-white transition group-hover:text-orange-200">
                  {article.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {article.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 transition group-hover:gap-2 group-hover:text-orange-300">
                  Read the guide
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
                <span className="mt-3 text-xs text-white/40">
                  {article.readTime} · {article.takeaways.length} key takeaways
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
       {/* How It Works & Trust — your journey, made simple and secure. */}
       <section className="bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] py-20 sm:py-24" aria-labelledby="how-heading">
         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
           {/* Professional description */}
           <div className="mx-auto max-w-2xl text-center">
             <h2 id="how-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
               Dating, Designed with Care
             </h2>
             <p className="mt-4 text-lg text-white/60">
               Authentic profiles. Verified connections. Intentional matching — because meaningful relationships deserve a platform built for trust.
             </p>
           </div>

           {/* How It Works: 3-Step Guide */}
           <div className="mt-16">
             <h3 className="mb-8 text-center text-2xl font-bold text-white sm:text-3xl">How It Works: 3-Step Guide</h3>
             <div className="grid gap-6 sm:grid-cols-3">
               {/* Step 1 */}
               <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-xl hover:shadow-orange-900/30">
                 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF5722] text-white transition group-hover:scale-110">
                   <span className="text-2xl font-bold text-white">1</span>
                 </div>
                 <h4 className="mt-6 text-xl font-bold text-white">Create a Profile</h4>
                 <p className="mt-3 text-sm leading-relaxed text-white/60">
                   Build your authentic profile with photos, interests, and what you&apos;re looking for. Verification adds a layer of trust from the start.
                 </p>
               </div>
               {/* Step 2 */}
               <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-xl hover:shadow-orange-900/30">
                 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 text-white transition group-hover:scale-110">
                   <span className="text-2xl font-bold text-white">2</span>
                 </div>
                 <h4 className="mt-6 text-xl font-bold text-white">Get Matched</h4>
                 <p className="mt-3 text-sm leading-relaxed text-white/60">
                   Our intelligent matching connects you with compatible partners based on shared values, interests, and relationship goals.
                 </p>
               </div>
               {/* Step 3 */}
               <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-xl hover:shadow-orange-900/30">
                 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF5722] text-white transition group-hover:scale-110">
                   <span className="text-2xl font-bold text-white">3</span>
                 </div>
                 <h4 className="mt-6 text-xl font-bold text-white">Start Dating</h4>
                 <p className="mt-3 text-sm leading-relaxed text-white/60">
                   Chat, plan meetups, and build a real connection — all in a safe, supportive environment designed for genuine relationships.
                 </p>
               </div>
             </div>
           </div>

           {/* Safety & Privacy Trust Badges */}
           <div className="mt-16">
             <h3 className="mb-8 text-center text-2xl font-bold text-white sm:text-3xl">Safety &amp; Privacy: Built for Trust</h3>
             <div className="grid gap-4 sm:grid-cols-3">
               {/* Verified Profiles */}
               <div className="group flex flex-col rounded-xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10">
                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-white">
                   <Icon name="check" className="h-5 w-5" />
                 </div>
                 <h4 className="mt-4 text-lg font-bold text-white">Verified Profiles</h4>
                 <p className="mt-2 text-sm leading-relaxed text-white/60">
                   Every profile is verified to reduce fake accounts and scams. Real people, real connections.
                 </p>
               </div>
               {/* Anti-Scam Moderation */}
               <div className="group flex flex-col rounded-xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10">
                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF5722] text-white">
                   <Icon name="shield" className="h-5 w-5" />
                 </div>
                 <h4 className="mt-4 text-lg font-bold text-white">Anti-Scam Moderation</h4>
                 <p className="mt-2 text-sm leading-relaxed text-white/60">
                   24/7 monitoring and proactive moderation keep our community safe from fraud, harassment, and suspicious activity.
                 </p>
               </div>
               {/* Data Privacy */}
               <div className="group flex flex-col rounded-xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10">
                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-white">
                   <Icon name="lock" className="h-5 w-5" />
                 </div>
                 <h4 className="mt-4 text-lg font-bold text-white">Data Privacy</h4>
                 <p className="mt-2 text-sm leading-relaxed text-white/60">
                   Your data stays yours. End-to-end encrypted messaging, privacy controls, and clear data policies you can trust.
                 </p>
               </div>
             </div>
           </div>

           {/* Interactive Counter / Live Stats */}
           <div className="mt-16">
             <h3 className="mb-8 text-center text-2xl font-bold text-white sm:text-3xl">Join Thousands Finding Love</h3>
             <div className="mx-auto grid gap-8 sm:grid-cols-3" style={{ maxWidth: '600px' }}>
               <div className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center transition hover:bg-white/10">
                 <span className="text-4xl font-extrabold text-orange-400">10,000+</span>
                 <p className="mt-2 text-sm text-white/60">Active Members Today</p>
               </div>
               <div className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center transition hover:bg-white/10">
                 <span className="text-4xl font-extrabold text-orange-400">500+</span>
                 <p className="mt-2 text-sm text-white/60">Matches Made This Week</p>
               </div>
               <div className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center transition hover:bg-white/10">
                 <span className="text-4xl font-extrabold text-orange-400">98%</span>
                 <p className="mt-2 text-sm text-white/60">Member Satisfaction</p>
               </div>
             </div>
           </div>
         </div>
       </section>
      {/* Verified Connections — live admin announcements/events (events placement). */}
      <section className="bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] py-20 sm:py-24" aria-labelledby="events-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="events-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Verified Connections</h2>
            <p className="mt-4 text-lg text-white/60">Authentic, intentional partnerships start here — discover verified profiles and real couples building lasting bonds.</p>
          </div>
          <div className="mt-12">
            <EventsBoard items={events} />
          </div>
          <div className="mt-10 text-center">
            <Link href="/events" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400">See all events</Link>
          </div>
        </div>
      </section>
      {/* Couple's Milestones — success-stories testimonial showcase (testimonials placement). */}
      <section className="bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] py-20 sm:py-24" aria-labelledby="stories-heading">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="stories-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Couple&apos;s Milestones</h2>
            <p className="mt-4 text-lg text-white/60">Shared goals, meaningful moments, and the tools that helped real couples grow — one milestone at a time.</p>
          </div>
          <div className="mt-12">
            <TestimonialShowcase
              items={testimonialMedia}
              captions={testimonialCaptions}
              links={testimonialLinks}
            />
          </div>
        </div>
      </section>
      <footer className="border-t border-white/10 bg-slate-950 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <span className="text-base font-bold text-white">Couple<span className="text-orange-400">'s</span> Corner</span>
          <p className="text-sm text-white/40">&copy; {new Date().getFullYear()} Couple's Corner. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
