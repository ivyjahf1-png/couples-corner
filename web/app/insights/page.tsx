import type { Metadata } from "next";
import Link from "next/link";
import { INSIGHT_ARTICLES, getInsightArticle } from "@/lib/data/insights";

export const metadata: Metadata = {
  title: "Relationship Insights — Couple's Corner",
  description: "Expert-backed articles and guidance on communication, trust, and intimacy.",
};

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] text-white">
      <nav className="border-b border-white/10 bg-[#0B1120]/80 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Couple<span className="text-orange-400">'s</span> Corner
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/community" className="text-sm font-medium text-white/80 hover:text-white">
              Q&amp;A Forum
            </Link>
            <Link href="/events" className="text-sm font-medium text-white/80 hover:text-white">
              Events
            </Link>
          </div>
        </div>
      </nav>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Relationship Insights
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">
          Expert-backed guidance and community wisdom on communication, trust,
          intimacy, and everything in between.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {INSIGHT_ARTICLES.map((article) => (
            <Link
              key={article.title}
              href={`/insights/${article.slug}`}
              aria-label={`${article.title} — read the full guide`}
              className="group block rounded-xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-xl hover:shadow-orange-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] active:translate-y-0 active:scale-[0.99] active:border-orange-400/50 active:bg-white/10"
            >
              <h3 className="text-lg font-bold text-white transition group-hover:text-orange-200">{article.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {article.excerpt}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-400 transition group-hover:gap-2 group-hover:text-orange-300">
                Read more
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
