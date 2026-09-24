"use client";

import { useState } from "react";
import { ShoppingBag, Sparkles, X } from "lucide-react";

const categories = ["Frames", "Vehicles", "Room Entry Effects", "Bubbles", "Room Card", "Theme"] as const;
type Category = (typeof categories)[number];
const items: Record<Category, { name: string; price: number; duration: string; icon: string }[]> = {
  Frames: [{ name: "Golden Halo", price: 4500, duration: "7Days", icon: "🪞" }, { name: "Royal Frame", price: 9000, duration: "30Days", icon: "✨" }],
  Vehicles: [{ name: "Supercar", price: 25000, duration: "30Days", icon: "🏎️" }, { name: "Moon Rover", price: 15000, duration: "7Days", icon: "🚙" }],
  "Room Entry Effects": [{ name: "Royal Entrance", price: 18000, duration: "30Days", icon: "✨" }, { name: "Starlight", price: 7500, duration: "7Days", icon: "🌟" }],
  Bubbles: [{ name: "Golden Hearts", price: 2500, duration: "7Days", icon: "💛" }, { name: "Purple Glow", price: 3200, duration: "7Days", icon: "💜" }],
  "Room Card": [{ name: "Couple Card", price: 5000, duration: "7Days", icon: "💌" }, { name: "Royal Card", price: 8500, duration: "30Days", icon: "👑" }],
  Theme: [{ name: "Midnight Gold", price: 12000, duration: "30Days", icon: "🌌" }, { name: "Royal Purple", price: 8000, duration: "7Days", icon: "👑" }],
};

export function StoreMarketplace() {
  const [category, setCategory] = useState<Category>("Frames");
  const [bagOpen, setBagOpen] = useState(false);
  const [bagCount, setBagCount] = useState(0);
  return <div className="relative flex flex-col gap-6"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-300">Premium collection</p><h1 className="text-3xl font-bold text-white">Store</h1></div><button type="button" onClick={() => setBagOpen(true)} className="flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200" aria-label="Open bag"><ShoppingBag className="h-4 w-4" /> Bag {bagCount > 0 ? `(${bagCount})` : ""}</button></div><div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Store categories">{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold ${category === item ? "border-amber-300 bg-amber-300 text-slate-950" : "border-white/10 bg-white/5 text-white/70"}`}>{item}</button>)}</div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{items[category].map((item) => <article key={item.name} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl"><div className="flex h-36 items-center justify-center bg-gradient-to-br from-indigo-800/60 to-purple-900/40 text-6xl">{item.icon}</div><div className="p-4"><div className="flex justify-between gap-2"><h2 className="font-semibold text-white">{item.name}</h2><span className="whitespace-nowrap text-xs text-white/45">/{item.duration}</span></div><div className="mt-4 flex items-center justify-between"><span className="font-bold text-amber-300">🪙 {item.price.toLocaleString()}</span><button type="button" onClick={() => setBagCount((count) => count + 1)} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950"><Sparkles className="mr-1 inline h-3 w-3" />Buy</button></div></div></article>)}</div>{bagOpen ? <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-label="Shopping bag"><button type="button" className="absolute inset-0 cursor-default" aria-label="Close bag" onClick={() => setBagOpen(false)} /><aside className="relative flex h-full w-[min(100%,22rem)] flex-col border-l border-white/10 bg-slate-950 p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">Your Bag</h2><button type="button" onClick={() => setBagOpen(false)} aria-label="Close bag" className="rounded-lg p-2 text-ink-300 hover:bg-white/10"><X className="h-5 w-5" /></button></div><p className="mt-4 text-sm text-ink-300">{bagCount ? `${bagCount} item${bagCount === 1 ? "" : "s"} ready for checkout.` : "Your bag is empty."}</p><button type="button" className="mt-auto rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50" disabled={!bagCount}>Checkout</button></aside></div> : null}</div>;
}
