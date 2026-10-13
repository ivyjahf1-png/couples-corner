"use client";
import { useMemo, useState } from "react";
import { Coins, Crown, Medal, Search, Trophy } from "lucide-react";
import type { CatalogGame } from "@/lib/game/catalog";
import { isUnlocked } from "@/lib/game/catalog";
import { GameBanner } from "./GameBanner";
const QA = [
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "honor", label: "Honor", icon: Medal },
  { id: "records", label: "Win Records", icon: Crown },
  { id: "chests", label: "Daily Chests", icon: Coins },
];

export function ArcadeGrid({ games, userLevel, coinBalance }: { games: CatalogGame[]; userLevel: number; coinBalance: number }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const categories = useMemo(() => {
    const s: string[] = [];
    for (const g of games) if (g.category && !s.includes(g.category)) s.push(g.category);
    return ["All", ...s];
  }, [games]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((g) => (category === "All" || g.category === category) && (q.length === 0 || g.title.toLowerCase().includes(q)));
  }, [games, category, query]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#1a1033] via-[#2b1245] to-[#101a3a] p-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-600 text-lg font-black text-[#2b1000]">P</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Lvl {userLevel} Player</p>
          <p className="text-[11px] text-amber-300/90">VIP Honor Member</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-sm font-extrabold text-amber-300">
          <Coins className="h-4 w-4" />{coinBalance.toLocaleString("en-US")}
        </div>
      </div>
      <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-[#ff5f6d] via-[#ff7a00] to-[#ffc371] p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/90">Special Offer 2026.10.9-10.13</p>
        <p className="mt-1 text-xl font-black text-white">Grand Game Festival — Win up to 1M Coins</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {QA.map((a) => (
          <button key={a.id} type="button" className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 p-3 text-white">
            <a.icon className="h-5 w-5" /><span className="text-[11px] font-bold">{a.label}</span>
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search games" aria-label="Search games"
          className="w-full rounded-full border border-slate-700 bg-[#0F172A] py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((n) => (
          <button key={n} type="button" onClick={() => setCategory(n)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${n === category ? "bg-[#FF7A00] text-[#0F172A]" : "bg-white/10 text-slate-200"}`}>{n}</button>
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {visible.map((g) => (<GameBanner key={g.id} g={g} open={isUnlocked(g, userLevel)} />))}
      </ul>
    </div>
  );
}

