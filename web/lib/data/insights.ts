/**
 * Couples Corner — relationship insight article data.
 *
 * Shared data module consumed by the insights landing page, the individual
 * article pages, and the home page's featured-insights preview cards.
 *
 * Keeping this in `lib/` avoids a cross-page import from `app/insights/page`
 * (which Next.js treats as a route module and is not intended to be imported
 * elsewhere).
 */

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
