"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Copy, Play, CheckCircle2 } from "lucide-react";
import { ProfileChatButton, ProfileFollowButton } from "@/components/profile/PublicProfileActions";
import { usePresence } from "@/lib/hooks/usePresence";
import { isPresenceOnline } from "@/lib/presence";
import type { PublicProfilePhoto, PublicProfileView } from "@/components/profile/PublicProfileScreen";

export type { PublicProfilePhoto, PublicProfileView };

function hobbyIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("video") || l.includes("photo") || l.includes("camera")) return "📷";
  if (l.includes("music") || l.includes("hip hop") || l.includes("punk")) return "🎵";
  if (l.includes("ping pong") || l.includes("sport")) return "🏓";
  if (l.includes("climb") || l.includes("boulder")) return "🧗";
  if (l.includes("festival") || l.includes("party")) return "🎉";
  if (l.includes("cook") || l.includes("food")) return "🍳";
  if (l.includes("travel")) return "✈️";
  if (l.includes("read")) return "📚";
  if (l.includes("game")) return "🎮";
  return "✨";
}
const TONES = ["bg-amber-100 text-amber-800","bg-purple-100 text-purple-800","bg-sky-100 text-sky-800","bg-emerald-100 text-emerald-800","bg-rose-100 text-rose-800"];

export function UserProfileView({ view }: { view: PublicProfileView }) {
  const router = useRouter();
  const [tab, setTab] = useState<"About Me" | "Honor" | "Relation">("About Me");
  const [copied, setCopied] = useState(false);
  const { online } = usePresence(view.uid, view.initialOnline);
  const isOnline = isPresenceOnline({ online });
  const photos = view.photos.map((p) => p.src).filter((s): s is string => Boolean(s));
  const cover = photos[0] ?? null;
  const hobbies = [...view.interests, ...view.lifestyle].map((label, i) => ({ label, icon: hobbyIcon(label), tone: TONES[i % TONES.length] }));
  function goBack() { if (window.history.length > 1) router.back(); else router.replace("/discover"); }
  async function copyId() { try { await navigator.clipboard.writeText(view.uid); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } }
  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-md flex-1 flex-col overflow-y-auto bg-slate-950 text-white overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
      <div className="relative h-[55vh] min-h-[380px] w-full shrink-0 bg-slate-900">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={view.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-bold text-white/30">{view.name.charAt(0).toUpperCase()}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-slate-950/90" />
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" onClick={goBack} aria-label="Go back" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"><ArrowLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="More options" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"><MoreHorizontal className="h-5 w-5" /></button>
        </div>
        {photos.length > 1 ? (
          <div className="absolute bottom-28 left-4 z-20 flex gap-2">
            {photos.slice(0, 4).map((photo, idx) => (
              <div key={idx} className={idx === 0 ? "h-16 w-14 overflow-hidden rounded-xl border-2 border-amber-400 shadow-lg" : "h-16 w-14 overflow-hidden rounded-xl border-2 border-white/40 shadow-lg"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        {photos.length > 1 ? (
          <div className="absolute bottom-20 left-4 z-20 flex gap-1.5">
            {photos.slice(0, 4).map((_, idx) => (
              <span key={idx} className={idx === 0 ? "h-1 w-5 rounded-full bg-amber-400" : "h-1 w-2 rounded-full bg-white/40"} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative z-30 -mt-16 flex-1 rounded-t-3xl border-t border-white/10 bg-slate-950 px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 shadow-2xl md:pb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">{view.name}</h1>
          <span className="flex items-center text-emerald-400" title="Verified member"><CheckCircle2 className="h-5 w-5 fill-emerald-500 text-slate-950" /></span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {view.age !== null ? (<span className="inline-flex items-center rounded-full border border-pink-500/30 bg-pink-500/20 px-3 py-0.5 text-xs font-semibold text-pink-300">{view.age}</span>) : null}
          {view.distanceLabel ? (<span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-300">{view.distanceLabel}</span>) : null}
          {view.country ? (<span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-300">{view.country}</span>) : null}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>ID:{view.uid.slice(0, 9)}</span>
            <button type="button" onClick={copyId} className="p-1 transition hover:text-white" aria-label="Copy ID"><Copy className="h-3.5 w-3.5" /></button>
            {copied && <span className="text-[10px] text-emerald-400">Copied!</span>}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-slate-800/80 px-3 py-1">
            <span className={isOnline ? "h-2 w-2 animate-pulse rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-slate-500"} />
            <span className="text-xs font-medium text-white">{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-6 border-b border-white/10 pb-3 text-sm font-semibold">
          {(["About Me", "Honor", "Relation"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={t === tab ? "relative text-white transition" : "relative text-slate-400 transition hover:text-slate-200"}>
              {t}
              {t === tab && (<span className="absolute -bottom-3 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-400" />)}
            </button>
          ))}
        </div>
        {tab === "About Me" && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-bold text-white">Status</h3>
              {view.status ? (<p className="text-sm leading-6 text-slate-300">{view.status}</p>) : (
                <div className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-amber-400 px-4 py-2 font-bold text-slate-950 shadow-lg shadow-amber-400/25 transition hover:bg-amber-300">
                  <Play className="h-4 w-4 fill-slate-950" /><span>No status yet</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-sm font-bold text-white">Hobbies</h3>
              {hobbies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {hobbies.map((h, idx) => (
                    <span key={idx} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm ${h.tone}`}><span>{h.icon}</span><span>{h.label}</span></span>
                  ))}
                </div>
              ) : (<p className="text-sm text-slate-400">No hobbies shared yet.</p>)}
            </div>
          </div>
        )}
        {tab === "Honor" && (
          <div className="mt-6">
            {view.honor.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {view.honor.map((row) => (
                  <li key={row.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-xs font-semibold text-slate-400">{row.label}</span>
                    <span className="text-sm font-bold text-white">{row.value}</span>
                  </li>
                ))}
              </ul>
            ) : (<div className="py-6 text-center text-xs text-slate-400">No honor badges displayed yet.</div>)}
          </div>
        )}
        {tab === "Relation" && (
          <div className="mt-6">
            {view.relation.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {view.relation.map((row) => (
                  <li key={row.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-xs font-semibold text-slate-400">{row.label}</span>
                    <span className="text-sm font-bold text-white">{row.value}</span>
                  </li>
                ))}
              </ul>
            ) : (<div className="py-6 text-center text-xs text-slate-400">No relationship details added.</div>)}
          </div>
        )}
      </div>
      {!view.isSelf ? (
        <div className="sticky bottom-0 z-40 mx-auto flex w-full max-w-md items-center gap-3 border-t border-white/10 bg-slate-950/90 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="flex-1"><ProfileChatButton recipientId={view.uid} recipientName={view.name} /></div>
          <div className="flex-1"><ProfileFollowButton targetUserId={view.uid} viewerUid={view.viewerUid} /></div>
        </div>
      ) : null}
    </div>
  );
}
