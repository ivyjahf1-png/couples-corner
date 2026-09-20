import Link from "next/link";
import { notFound } from "next/navigation";
import { getInsightArticle, INSIGHT_ARTICLES } from "@/app/insights/page";

export function generateStaticParams() {
  return INSIGHT_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getInsightArticle(slug);
  if (!article) return { title: "Article not found — Couple's Corner" };
  return { title: `${article.title} — Couple's Corner`, description: article.excerpt };
}

export default async function InsightArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getInsightArticle(slug);
  if (!article) notFound();

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <nav className="border-b border-white/10 bg-[#0B1120]/80 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Couple<span className="text-orange-400">'s</span> Corner
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/insights" className="text-sm font-medium text-white/80 transition hover:text-white">
              All insights
            </Link>
            <Link href="/events" className="text-sm font-medium text-white/80 transition hover:text-white">
              Events
            </Link>
          </div>
        </div>
      </nav>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">{article.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{article.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-white/70">{article.excerpt}</p>
        <p className="mt-3 text-xs text-white/40">{article.readTime}</p>
        <div className="mt-8 space-y-5">
          {article.body.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="leading-relaxed text-white/75">{paragraph}</p>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold text-white">Key takeaways</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/70">
            {article.takeaways.map((takeaway) => (
              <li key={takeaway}>{takeaway}</li>
            ))}
          </ul>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/insights" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400">
            ← All insights
          </Link>
          <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:from-orange-400 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400">
            Join the community
          </Link>
        </div>
      </article>
    </div>
  );
}
