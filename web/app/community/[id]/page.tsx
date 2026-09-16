import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Question — Couple's Corner Community",
  description: "Read and reply to community Q&amp;A questions.",
};

interface QuestionPageProps {
  params: Promise<{ id: string }>;
}

// Sample question data — in production this would come from a database/API.
const questions: Record<string, { title: string; author: string; body: string }> = {
  "1": {
    title: "How do we handle finances when our incomes are very different?",
    author: "Sarah & Mike",
    body: "My partner and I have been together for two years. I earn significantly more than they do, and it's starting to create tension around shared expenses and savings goals. We both want to be fair, but we keep disagreeing on how to split things. What strategies have worked for other couples in similar situations?",
  },
  "2": {
    title: "My partner gets jealous of my work friendships. What can I do?",
    author: "Alex & Jordan",
    body: "I have close friendships with a few colleagues (all platonic), but my partner gets visibly upset when I mention hanging out with them. I've tried being transparent about my friendships and including my partner, but the jealousy persists. How can I navigate this without cutting off important friendships?",
  },
  "3": {
    title: "How often should couples have serious relationship talks?",
    author: "Priya & Dev",
    body: "We're a relatively new couple and want to make sure we're communicating well. How often do you recommend having dedicated 'relationship check-in' conversations? And what topics should we cover in them?",
  },
};

export default async function QuestionPage({ params }: QuestionPageProps) {
  const { id } = await params;
  const question = questions[id];

  if (!question) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950 text-white">
      <nav className="border-b border-white/10 bg-purple-950/80 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Couple<span className="text-orange-400">'s</span> Corner
          </Link>
          <Link
            href="/community"
            className="text-sm font-medium text-white/80 hover:text-white"
          >
            Back to Q&amp;A Forum
          </Link>
        </div>
      </nav>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <article className="rounded-xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-bold text-white">{question.title}</h1>
          <p className="mt-2 text-sm text-white/50">
            Asked by {question.author}
          </p>
          <p className="mt-6 leading-relaxed text-white/80">{question.body}</p>
        </article>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-white">
            Answers (0)
          </h2>
          <p className="mt-4 text-sm text-white/60">
            Be the first to share your thoughts.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <textarea
            placeholder="Write your answer..."
            rows={4}
            className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-orange-400 focus:outline-none"
          />
          <div className="mt-4 flex justify-end gap-3">
            <Link
              href="/community"
              className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-orange-400 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              Post Answer
            </button>
          </div>
          <p className="mt-2 text-xs text-white/50">
            <Link href="/login" className="text-orange-400 hover:text-orange-300">Log in</Link>{" "}
            to post an answer.
          </p>
        </div>
      </section>
    </div>
  );
}
