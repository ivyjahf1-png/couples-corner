"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";

interface LandingNavbarProps {
  signUpHref?: string & {};
  signInHref?: string & {};
}

/**
 * Responsive navbar for the landing page. Handles the mobile menu toggle
 * state — extracted from the server-rendered LandingPage so the parent can
 * remain a Server Component and safely import server-only modules like
 * AdvertBanner.
 */
export function LandingNavbar({ signUpHref = "/register", signInHref = "/login" }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { label: string; href: string & {} }[] = [
    { label: "Our Story", href: "/about" },
    { label: "Community", href: "/community" },
    { label: "Guides", href: "/insights" },
    { label: "Events", href: "/events" },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0B1120]/85 backdrop-blur-xl shadow-lg transition-colors hover:border-orange-500/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href={"/" as never} className="flex items-center group" aria-label="Couples Corner home">
            <Logo as="span" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href as never}
                className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-orange-400"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={signInHref as never}
              className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-orange-400"
            >
              Log in
            </Link>
          </div>

          {/* Right side — Sign Up + mobile toggle */}
          <div className="flex items-center gap-3">
            <Link
              href={signUpHref as never}
              className="hidden sm:inline-flex items-center justify-center rounded-xl bg-[#FF5722] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#F4511E] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Sign Up
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 sm:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-[#0B1120]/95 backdrop-blur-xl">
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as never}
                  className="block rounded-md px-3 py-2 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-orange-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={signInHref as never}
                className="block rounded-md px-3 py-2 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-orange-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href={signUpHref as never}
                className="block rounded-md bg-[#FF5722] px-3 py-2 text-base font-semibold text-white text-center transition hover:bg-[#F4511E]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
