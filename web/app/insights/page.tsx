import Link from "next/link";

export const metadata = {
  title: "Relationship Insights — Couple's Corner",
  description: "Expert-backed articles and guidance on communication, trust, and intimacy.",
};

const articles = [
  {
    title: "The 5 Love Languages in Modern Relationships",
    excerpt:
      "Discover how expressing love in your partner's preferred language builds deeper connection.",
    href: "#",
  },
  {
    title: "Navigating Conflict Without Losing Yourself",
    excerpt:
      "Healthy argument techniques that strengthen trust instead of eroding it.",
    href: "#",
  },
  {
    title: "Building Emotional Safety as a Team",
    excerpt:
      "How to create a relationship where vulnerability feels safe and welcomed.",
    href: "#",
  },
];

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 text-white">
      <nav className="border-b border-white/10 bg-purple-950/80 px-4 py-4 sm:px-6 lg:px-8">
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
          {articles.map((article) => (
            <article
              key={article.title}
              className="rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-purple-400/40 hover:bg-white/10"
            >
              <h3 className="text-lg font-bold text-white">{article.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {article.excerpt}
              </p>
              <Link
                href={article.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-400"
              >
                Read more
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
