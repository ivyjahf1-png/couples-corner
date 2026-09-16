import Link from "next/link";

export const metadata = {
  title: "Events — Couple's Corner",
  description: "Find local meetups, workshops, and date nights for couples near you.",
};

const events = [
  {
    id: 1,
    title: "Couples' Communication Workshop",
    date: "Sat, Sep 27 · 2:00 PM",
    location: "Downtown Community Center",
    href: "#",
  },
  {
    id: 2,
    title: "Sunset Paddle Date Night",
    date: "Sat, Sep 20 · 6:00 PM",
    location: "Riverside Park Lake",
    href: "#",
  },
  {
    id: 3,
    title: "Trust & Intimacy Webinar",
    date: "Thu, Oct 2 · 7:30 PM",
    location: "Online",
    href: "#",
  },
];

export default function EventsPage() {
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
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={event.href}
              className="group block rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-purple-400/40 hover:bg-white/10"
            >
              <h3 className="text-xl font-bold text-white group-hover:text-orange-400">
                {event.title}
              </h3>
              <p className="mt-2 text-sm text-white/60">{event.date}</p>
              <p className="text-sm text-white/60">{event.location}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
