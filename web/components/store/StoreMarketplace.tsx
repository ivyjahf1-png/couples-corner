"use client";

import { useState } from "react";
import { ShoppingBag, Sparkles } from "lucide-react";

const categories = ["Themes", "Room Cards", "Bubbles", "Vehicles", "Room Entry Effects"] as const;
type Category = (typeof categories)[number];
const items: Record<Category, { name: string; price: number; duration: string; icon: string }[]> = {
  Themes: [{ name: "Midnight Gold", price: 12000, duration: "30Days", icon: "🌌" }, { name: "Royal Purple", price: 8000, duration: "7Days", icon: "👑" }],
  "Room Cards": [{ name: "Couple Card", price: 5000, duration: "7Days", icon: "💌" }],
  Bubbles: [{ name: "Golden Hearts", price: 2500, duration: "7Days", icon: "💛" }],
  Vehicles: [{ name: "Supercar", price: 25000, duration: "30Days", icon: "🏎️" }],
  "Room Entry Effects": [{ name: "Royal Entrance", price: 18000, duration: "30Days", icon: "✨" }],
};

export function StoreMarketplace() {
  const [category, setCategory] = useState<Category>("Themes");
  return <div className="flex flex-col gap-6"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-300">Premium collection</p><h1 className="text-3xl font-bold text-white">Store</h1></div><button className="flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200"><ShoppingBag className="h-4 w-4" /> Bag</button></div><div className="flex gap-2 overflow-x-auto pb-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold ${category === item ? "border-amber-300 bg-amber-300 text-slate-950" : "border-white/10 bg-white/5 text-white/70"}`}>{item}</button>)}</div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{items[category].map((item) => <article key={item.name} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl"><div className="flex h-36 items-center justify-center bg-gradient-to-br from-indigo-800/60 to-purple-900/40 text-6xl">{item.icon}</div><div className="p-4"><div className="flex justify-between gap-2"><h2 className="font-semibold text-white">{item.name}</h2><span className="text-xs text-white/45">/{item.duration}</span></div><div className="mt-4 flex items-center justify-between"><span className="font-bold text-amber-300">🪙 {item.price.toLocaleString()}</span><button className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950"><Sparkles className="mr-1 inline h-3 w-3" />Buy</button></div></div></article>)}</div></div>;
}
