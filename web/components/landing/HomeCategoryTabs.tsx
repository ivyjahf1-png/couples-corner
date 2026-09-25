"use client";

import { useState } from "react";
import Link from "next/link";

const categories = [
  { id: "near", label: "Near You", icon: "◉", title: "People around you", body: "Discover members who share your area and are open to meeting nearby.", cta: "Explore nearby" },
  { id: "recommended", label: "Recommended", icon: "✦", title: "Picked for you", body: "A considered mix of profiles connected to your interests and community.", cta: "See recommendations" },
  { id: "suggested", label: "Suggested", icon: "♡", title: "Suggested connections", body: "Meet new people through shared interests, values, and meaningful moments.", cta: "Browse suggestions" },
] as const;

export function HomeCategoryTabs() {
  const [active, setActive] = useState<(typeof categories)[number]["id"]>("near");
  const current = categories.find((item) => item.id === active) ?? categories[0];
  return <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-label="Home categories">
    <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">Find your people</p><h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Choose your feed</h2></div><span className="hidden text-sm text-white/45 sm:block">Swipe or tap to explore</span></div>
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/15 via-white/5 to-violet-500/10 p-6 sm:p-8"><div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-orange-400/20 blur-3xl" /><div className="relative"><span className="text-4xl">{current.icon}</span><h3 className="mt-5 text-xl font-bold text-white">{current.title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-white/65">{current.body}</p><Link href={current.id === "near" ? "/discover" : "/feed"} className="mt-6 inline-flex rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-400">{current.cta} →</Link></div></div>
      <div className="flex flex-row gap-2 overflow-x-auto md:flex-col" role="tablist" aria-label="Home feed categories">{categories.map((item) => <button key={item.id} type="button" role="tab" aria-selected={active === item.id} onClick={() => setActive(item.id)} className={`min-w-[140px] rounded-2xl border p-4 text-left transition md:min-w-0 ${active === item.id ? "border-orange-300/70 bg-orange-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}><span className="text-xl">{item.icon}</span><span className="mt-2 block text-sm font-semibold text-white">{item.label}</span><span className="mt-1 block text-xs text-white/45">{item.id === "near" ? "Close by" : item.id === "recommended" ? "For you" : "New people"}</span></button>)}</div>
    </div>
  </section>;
}
