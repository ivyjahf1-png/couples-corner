"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ContentItem } from "@/lib/models";

export function PromoOverlay({ item }: { item: ContentItem }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = `cc-promo-${item.id}`;
    if (sessionStorage.getItem(key) === "dismissed") return;
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [item.id]);
  if (!open) return null;
  const external = item.destinationUrl?.startsWith("http");
  const action = item.destinationUrl ?? "/";
  const content = <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#0B1120] shadow-2xl shadow-black/60"><div className="relative aspect-[4/3] bg-slate-800">{item.mediaType === "video" ? <video src={item.mediaUrl} className="h-full w-full object-cover" autoPlay muted playsInline /> : <img src={item.mediaUrl} alt={item.title} className="h-full w-full object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" /></div><div className="p-5 sm:p-6"><span className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Sponsored</span><h2 className="mt-2 text-xl font-bold text-white">{item.title}</h2>{item.description ? <p className="mt-2 text-sm leading-6 text-white/65">{item.description}</p> : null}<button type="button" onClick={() => setOpen(false)} className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 font-bold text-white transition hover:bg-orange-400">{item.buttonText || "Explore now"}</button><button type="button" onClick={() => { sessionStorage.setItem(`cc-promo-${item.id}`, "dismissed"); setOpen(false); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10" aria-label="Close advertisement"><span className="text-xl leading-none">+</span><span className="rotate-45">×</span> Close</button></div></div>;
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm sm:items-center"><section role="dialog" aria-modal="true" aria-label={item.title} className="w-full max-w-md pb-[env(safe-area-inset-bottom)] sm:pb-0">{external ? <a href={action} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{content}</a> : <Link href={action} onClick={() => setOpen(false)}>{content}</Link>}</section></div>;
}
