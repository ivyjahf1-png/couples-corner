import Link from "next/link";

export const metadata = {
  title: "Community — Couple's Corner",
  description: "Join the Q&A forum for couples to ask questions and share advice.",
};

const questions = [
  {
    id: 1,
    title: "How do we handle finances when our incomes are very different?",
    author: "Sarah & Mike",
    replies: 12,
  },
  {
    id: 2,
    title: "My partner gets jealous of my work friendships. What can I do?",
    author: "Alex & Jordan",
    replies: 8,
  },
  {
    id: 3,
    title: "How often should couples have serious relationship talks?",
    author: "Priya & Dev",
    replies: 5,
  },
];

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 text-white">
      <nav className="border-b border-white/10 bg-purple-950/80 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Couple<span className="text-orange-400">'s</span> Corner
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/insights" className="text-sm font-medium text-white/80 hover:text-white">
              Insights
            </Link>
            <Link href="/events" className="text-sm font-medium text-white/80 hover:text-white">
              Events
            </Link>
          </div>
        </div>
      </nav>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Q&amp;A Forum
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">
          Ask questions and get honest advice from a warm community of couples
          and relationship coaches.
        </p>
        <div className="mt-10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Recent Questions</h2>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-orange-400 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            Ask a Question
          </Link>
        </div>
        <div className="mt-6 space-y-4">
          {questions.map((q) => (
            <Link
              key={q.id}
              href={`/community/${q.id}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-purple-400/40 hover:bg-white/10"
            >
              <h3 className="text-lg font-semibold text-white">{q.title}</h3>
              <p className="mt-1 text-sm text-white/60">
                by {q.author} · {q.replies} replies
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
