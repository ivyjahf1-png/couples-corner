import Link from "next/link";

export const metadata = {
  title: "About — Couple's Corner",
  description: "Learn the story behind Couple's Corner.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] text-white">
      <nav className="border-b border-white/10 bg-[#0B1120]/80 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Couple<span className="text-orange-400">'s</span> Corner
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-white/80 hover:text-white">Log in</Link>
            <Link href="/register" className="rounded-xl bg-[#FF5722] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#F4511E]">Sign Up</Link>
          </div>
        </div>
      </nav>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Our Story</h1>
        <p className="mt-6 text-lg leading-relaxed text-white/70">
          Couple's Corner was founded on a simple belief: every great partnership is built, not found.
          We bring together evidence-based relationship science, peer wisdom, and real-world
          connection opportunities — all in one warm, supportive space for couples.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-bold text-white">Our Mission</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">To help couples grow together, stronger and closer, through every stage of their journey.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-bold text-white">Our Vision</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">A world where every couple has access to the tools, community, and connections they need to thrive.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
