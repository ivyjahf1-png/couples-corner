"use client";
import { useMemo, useState } from "react";
import { Coins, Crown, Gift, Medal, PawPrint, Search, Sparkles, Trophy } from "lucide-react";
import type { CatalogGame } from "@/lib/game/catalog";
import { isUnlocked } from "@/lib/game/catalog";
import { GameBanner } from "./GameBanner";
const QA = [
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "honor", label: "Honor", icon: Medal },
  { id: "records", label: "Win Records", icon: Crown },
  { id: "chests", label: "Daily Chests", icon: Gift },
];

export function ArcadeGrid({ games, userLevel, coinBalance }: { games: CatalogGame[]; userLevel: number; coinBalance: number }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [chestMsg, setChestMsg] = useState<string | null>(null);
  const categories = useMemo(() => {
    const s: string[] = [];
    for (const g of games) if (g.category && !s.includes(g.category)) s.push(g.category);
    return ["All", ...s];
  }, [games]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((g) => (category === "All" || g.category === category) && (q.length === 0 || g.title.toLowerCase().includes(q)));
  }, [games, category, query]);
  const unlockedCount = games.filter((g) => isUnlocked(g, userLevel)).length;
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-white">Game Center</h1>
        <p className="text-sm text-slate-400">
          {unlockedCount} of {games.length} games unlocked — higher levels unlock more.
        </p>
      </header>
      {/* Top HUD Header: coins + pet/avatar level + VIP/honor */}
      <div className="flex items-center gap-3 rounded-3xl border border-amber-300/20 bg-gradient-to-r from-[#1a1033] via-[#2b1245] to-[#101a3a] p-3 shadow-[0_8px_28px_rgba(0,0,0,0.5)]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-600 shadow-lg">
          <PawPrint className="h-6 w-6 text-[#2b1000]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">Lvl {userLevel} Player</p>
          <p className="flex items-center gap-1 text-[11px] font-bold text-amber-300/90">
            <Sparkles className="h-3 w-3" /> VIP Honor Member
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/30 bg-black/50 px-3 py-1.5 text-sm font-extrabold text-amber-300">
          <Coins className="h-4 w-4" />{coinBalance.toLocaleString("en-US")}
        </div>
      </div>
      {/* Special Event Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-r from-[#ff5f6d] via-[#ff7a00] to-[#ffc371] p-4 shadow-[0_10px_32px_rgba(255,122,0,0.35)]">
        <p className="text-[11px] font-black uppercase tracking-widest text-white/90">Special Offer 2026.10.9-10.13</p>
        <p className="mt-1 text-xl font-black leading-tight text-white drop-shadow">Grand Game Festival — Win up to 1M Coins</p>
        <p className="mt-1 text-xs font-semibold text-white/85">Play any unlocked game to earn festival entries.</p>
      </div>
      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-4 gap-2">
        {QA.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setChestMsg(a.id === "chests" ? "Daily Chests: claim 10K coins from the wallet page bonus." : `${a.label} is coming soon in this festival build.`)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.07] p-3 text-white transition hover:bg-white/[0.12] active:scale-95"
          >
            <a.icon className="h-5 w-5 text-amber-300" />
            <span className="text-center text-[11px] font-bold leading-tight">{a.label}</span>
            {a.id === "chests" ? <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-200">10K</span> : null}
          </button>
        ))}
      </div>
      {chestMsg ? (
        <p role="status" className="rounded-2xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
          {chestMsg}
        </p>
      ) : null}
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

