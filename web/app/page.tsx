import Link from "next/link";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { AdvertBanner } from "@/components/content/AdvertBanner";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 text-white">
      <LandingNavbar signUpHref="/register" signInHref="/login" />
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 pt-20 pb-32 sm:pt-28 sm:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#7c3aed_0%,_transparent_50%)] opacity-30" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_#f97316_0%,_transparent_50%)] opacity-20" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="block">Build Your</span>
            <span className="block text-orange-400">Lasting Partnership</span>
          </h1>
          <div className="mt-8 w-full max-w-4xl">
            <AdvertBanner />
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
            Couple's Corner brings couples together with relationship insights, a supportive Q&amp;A community, and local meetups — everything you need to grow together.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:mt-12 sm:flex-row sm:justify-center">
            <Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:from-orange-400 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-purple-950">Join Couple's Corner<svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg></Link>
            <Link href="/about" className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30">Learn More<svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg></Link>
          </div>
        </div>
      </section>
      <section className="bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything you need, in one place</h2>
            <p className="mt-4 text-lg text-white/60">From expert guidance to real-world connections, Couple's Corner supports your journey.</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/insights" className="group block">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Relationship Insights</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Personalized guidance and expert-backed articles on communication, trust, and intimacy.</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400">Explore insights</span>
            </Link>
            <Link href="/community" className="group block">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337 5.972 5.972 0 0 1-3.535 1.057 5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Q&amp;A Forum</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Ask questions and get honest advice from a warm community of couples and coaches.</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-300">Join the conversation</span>
            </Link>
            <Link href="/events" className="group block">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Local Meetups</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Find date nights, workshops, and couples retreats near you.</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400">Find meetups</span>
            </Link>
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