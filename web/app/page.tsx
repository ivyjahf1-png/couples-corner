"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-purple-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <svg className="h-8 w-8 text-orange-400" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.9" />
              <circle cx="20" cy="12" r="5" fill="currentColor" opacity="0.9" />
              <circle cx="16" cy="20" r="4" fill="currentColor" opacity="0.7" />
            </svg>
            <span className="text-lg font-bold tracking-tight">
              PairTree <span className="text-orange-400">Connect</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 sm:flex">
            <Link href="#our-story" className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">Our Story</Link>
            <Link href="#community" className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">Community</Link>
            <Link href="#guides" className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">Guides</Link>
            <Link href="#events" className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">Events</Link>
            <Link href="/login" className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">Log in</Link>
          </div>

          {/* Right side — Sign Up + mobile toggle */}
          <div className="flex items-center gap-3">
            <Link href="/signup" className="hidden sm:inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-400 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-purple-950">Sign Up</Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 sm:hidden" aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-purple-950/95 backdrop-blur-md">
            <div className="space-y-1 px-4 py-3">
              <Link href="#our-story" className="block rounded-md px-3 py-2 text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Our Story</Link>
              <Link href="#community" className="block rounded-md px-3 py-2 text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Community</Link>
              <Link href="#guides" className="block rounded-md px-3 py-2 text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Guides</Link>
              <Link href="#events" className="block rounded-md px-3 py-2 text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Events</Link>
              <div className="my-2 h-px bg-white/10" />
              <Link href="/login" className="block rounded-md px-3 py-2 text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
              <Link href="/signup" className="block rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2 text-center text-base font-semibold text-white transition hover:from-orange-400 hover:to-orange-500" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 pt-20 pb-32 sm:pt-28 sm:pb-40">
        {/* Decorative background blobs */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#7c3aed_0%,_transparent_50%)] opacity-30" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_#f97316_0%,_transparent_50%)] opacity-20" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            {/* Eyebrow */}
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-300 sm:px-5 sm:py-2">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              For Couples, By Couples
            </span>

            {/* Heading */}
            <h1 className="mt-8 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              Build Your{" "}
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-purple-400 bg-clip-text text-transparent">
                Lasting
              </span>{" "}
              Partnership
            </h1>

            {/* Description */}
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
              PairTree Connect brings couples together with relationship insights,
              a supportive Q&amp;A community, and local meetups — everything you need
              to grow together, stronger and closer.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:from-orange-400 hover:to-orange-500 hover:shadow-orange-400/30 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-purple-950"
              >
                Join PairTree Connect
                <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="#our-story"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-medium text-white backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-purple-950"
              >
                Learn More
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m13.5 4.5 5.25 5.25-5.25 5.25M13.5 4.5v15" />
                </svg>
              </Link>
            </div>

            {/* Social proof / trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                12,000+ couples joined
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                4.9★ average rating
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                200+ local meetups
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="community" className="relative bg-gradient-to-b from-slate-950 via-purple-950 to-purple-900 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Everything you need to grow together
            </h2>
            <p className="mt-4 text-white/60">
              Tools, conversations, and real-world connections for modern partnerships.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/guides" className="group rounded-2xl border border-white/10 bg-white/5 p-8 transition hover:border-orange-500/40 hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Relationship Insights</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Personalized guidance and expert-backed articles on communication, trust, and intimacy.</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400">Explore insights</span>
            </Link>
            <Link href="/community" className="group rounded-2xl border border-white/10 bg-white/5 p-8 transition hover:border-purple-400/40 hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337 5.972 5.972 0 0 1-3.535 1.057 5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Q&amp;A Forum</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Ask questions and get honest advice from a warm community of couples and coaches.</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-300">Join the conversation</span>
            </Link>
            <Link href="/events" className="group rounded-2xl border border-white/10 bg-white/5 p-8 transition hover:border-orange-500/40 hover:bg-white/10 sm:col-span-2 lg:col-span-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Local Meetups</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Find date nights, workshops, and couples retreats near you.</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400">Find meetups</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <span className="text-base font-bold text-white">PairTree <span className="text-orange-400">Connect</span></span>
          <p className="text-sm text-white/40">&copy; {new Date().getFullYear()} PairTree Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
