import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Relationship Insights — Couple's Corner",
  description: "Expert-backed articles and guidance on communication, trust, and intimacy.",
};

export interface InsightArticle {
  slug: string;
  eyebrow: string;
  title: string;
  excerpt: string;
  readTime: string;
  body: string[];
  takeaways: string[];
}

/** Editorial guides mirrored by the landing Relationship Insights cards. */
export const INSIGHT_ARTICLES: InsightArticle[] = [
  {
    slug: "communication",
    eyebrow: "Communication",
    title: "Communication That Brings You Closer",
    excerpt: "Practical scripts and rituals for everyday check-ins that keep you aligned.",
    readTime: "6 min read",
    body: [
      "Strong couples treat communication as maintenance, not repair. A daily ten-minute check-in — one appreciation, one need, one plan — prevents small friction from hardening into resentment.",
      "Use repair language early: “I feel disconnected when…” names the experience without assigning blame. Then invite partnership explicitly: “Can we try…?” gives your partner a concrete way to help.",
      "Close the loop within 24 hours after hard conversations. A short follow-up (“How are you feeling about last night?”) signals that the relationship matters more than winning the argument.",
    ],
    takeaways: [
      "Run a daily 10-minute check-in: one appreciation, one need, one plan.",
      "Lead with “I feel…” and end requests with a concrete invitation.",
      "Revisit hard conversations within a day to confirm repair landed.",
    ],
  },
  {
    slug: "trust",
    eyebrow: "Trust",
    title: "Building Unshakeable Trust",
    excerpt: "Small consistent promises, kept daily, that compound into deep security.",
    readTime: "7 min read",
    body: [
      "Trust is built in drops and lost in buckets. The couples who feel safest are rarely the most dramatic — they are the most consistent about small promises: on time, as agreed, with follow-through.",
      "Make reliability visible. Say what you will do, do it, then close the loop (“Handled — pickup is at six”). Each closed loop is evidence your partner can relax.",
      "When trust wobbles, shrink the promise until keeping it is easy, then scale back up. Consistency at a small size rebuilds faster than grand gestures after a miss.",
    ],
    takeaways: [
      "Keep promises small enough to keep every time.",
      "Narrate follow-through so reliability is visible.",
      "After a miss, shrink the commitment and rebuild gradually.",
    ],
  },
  {
    slug: "date-ideas",
    eyebrow: "Date Ideas",
    title: "Date Nights Worth Repeating",
    excerpt: "Fresh local ideas and rituals that turn ordinary evenings into connection.",
    readTime: "5 min read",
    body: [
      "The best date nights mix novelty with ritual: one familiar anchor (your restaurant, your walk) plus one new element (a question deck, a new cuisine, a class). Novelty creates stories; ritual creates belonging.",
      "Plan in seasons, not single nights. A four-week arc — cook together, explore outdoors, learn something, serve someone — keeps momentum without weekly planning stress.",
      "End every date with a two-minute debrief: favourite moment, one thing learned, one thing to repeat. Couples who reflect together repeat what works.",
    ],
    takeaways: [
      "Pair one ritual with one novel element each date.",
      "Plan dates in four-week arcs to reduce decision fatigue.",
      "Debrief for two minutes: favourite moment, lesson, repeat.",
    ],
  },
];

export function getInsightArticle(slug: string): InsightArticle | undefined {
  return INSIGHT_ARTICLES.find((article) => article.slug === slug);
}

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
