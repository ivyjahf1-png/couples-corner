import Link from "next/link";
import { EventsBoard } from "@/components/content/EventsBoard";
import { getPublishedForPlacement } from "@/lib/server/content";

export const metadata = {
  title: "Events — Couple's Corner",
  description: "Find local meetups, workshops, and date nights for couples near you.",
};

// Dynamic so newly published admin events appear instantly, same as the
// landing "Local Meetups & Events" board.
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getPublishedForPlacement("events");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] text-white">
      <nav className="border-b border-white/10 bg-[#0B1120]/80 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Couple<span className="text-orange-400">'s</span> Corner
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/insights" className="text-sm font-medium text-white/80 hover:text-white">
              Insights
            </Link>
            <Link href="/community" className="text-sm font-medium text-white/80 hover:text-white">
              Q&amp;A Forum
            </Link>
          </div>
        </div>
      </nav>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Local Meetups &amp; Events
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">
          Discover date nights, workshops, retreats, and community gatherings
          for couples near you.
        </p>
        <div className="mt-12">
          <EventsBoard items={events} />
        </div>
      </section>
    </div>
  );
}
