"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Play, Pause, CheckCircle2 } from "lucide-react";
import { ProfileChatButton, ProfileFollowButton } from "@/components/profile/PublicProfileActions";
import { CopyIdButton } from "@/components/profile/CopyIdButton";
import { usePresence } from "@/lib/hooks/usePresence";
import { isPresenceOnline } from "@/lib/presence";

export interface PublicProfilePhoto {
  key: string;
  src: string | null;
}

export interface PublicProfileView {
  uid: string;
  name: string;
  photos: PublicProfilePhoto[];
  age: number | null;
  gender: string | null;
  distanceLabel: string | null;
  country: string | null;
  status: string | null;
  statusAudio: { src: string; durationSeconds: number } | null;
  initialOnline: boolean;
  isSelf: boolean;
  viewerUid: string | null;
  statusBadge: string | null;
  bio: string | null;
  interests: string[];
  lifestyle: string[];
  honor: { label: string; value: string }[];
  relation: { label: string; value: string }[];
}

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

const TONES = [
  "bg-amber-100 text-amber-900 border-amber-200",
  "bg-purple-100 text-purple-900 border-purple-200",
  "bg-sky-100 text-sky-900 border-sky-200",
  "bg-emerald-100 text-emerald-900 border-emerald-200",
  "bg-rose-100 text-rose-900 border-rose-200",
];

export function UserProfileView({ view }: { view: PublicProfileView }) {
  const router = useRouter();
  const [tab, setTab] = useState<"About Me" | "Honor" | "Relation">("About Me");
  const [photoSel, setPhotoSel] = useState<{ uid: string; index: number }>({
    uid: view.uid,
    index: 0,
  });
  const [statusPlaying, setStatusPlaying] = useState(false);
  const statusAudioRef = useRef<HTMLAudioElement | null>(null);

  const watchIds = useMemo(() => (view.uid ? [view.uid] : []), [view.uid]);
  const { presence } = usePresence(watchIds, Boolean(view.uid));
  const entry = view.uid ? presence[view.uid] : undefined;
  const isOnline = entry ? entry.online && isPresenceOnline(entry.lastSeenAt) : view.initialOnline;

  const rawPhotos = view.photos.map((p) => p.src).filter((s): s is string => Boolean(s));
  // Fallback avatar when no photos are present
  const photos =
    rawPhotos.length > 0
      ? rawPhotos
      : ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"];

  const selectablePhotos = photos.slice(0, 4);
  const activePhoto =
    selectablePhotos.length > 0 && photoSel.uid === view.uid
      ? Math.min(photoSel.index, selectablePhotos.length - 1)
      : 0;
  const cover = selectablePhotos[activePhoto] ?? photos[0];

  const hobbies = [...view.interests, ...view.lifestyle].map((label, i) => ({
    label,
    icon: hobbyIcon(label),
    tone: TONES[i % TONES.length],
  }));

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.replace("/discover");
  }

  useEffect(() => {
    const src = view.statusAudio?.src ?? null;
    if (!src) return;
    const audio = new Audio(src);
    audio.onpause = () => setStatusPlaying(false);
    audio.onended = () => setStatusPlaying(false);
    statusAudioRef.current = audio;
    return () => {
      audio.pause();
      if (statusAudioRef.current === audio) statusAudioRef.current = null;
    };
  }, [view.statusAudio]);

  function toggleStatusAudio() {
    const audio = statusAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio
        .play()
        .then(() => setStatusPlaying(true))
        .catch(() => setStatusPlaying(false));
    } else {
      audio.pause();
      setStatusPlaying(false);
    }
  }



  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden bg-[#0F172A] text-white">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain overscroll-y-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y] pb-24">
        
        {/* 1. Full Hero Cover Header */}
        <div className="relative h-[400px] w-full shrink-0 bg-slate-900">
          {rawPhotos.length > 0 ? (
            <img src={cover} alt={view.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-slate-800">
              <div className="flex flex-col items-center gap-2">
                <div className="h-24 w-24 rounded-full bg-slate-700 border-4 border-slate-600 flex items-center justify-center">
                  <span className="text-4xl">{view.name.charAt(0).toUpperCase()}</span>
                </div>
                <p className="text-sm text-slate-400">No photos yet</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-black/40" />

          {/* Top Bar Navigation */}
          <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="More options"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          {/* Thumbnail Gallery Row Overlay (Bottom Left) */}
          {selectablePhotos.length > 1 && (
            <div className="absolute bottom-6 left-4 z-20 flex flex-col gap-2">
              {/* Active photo indicators / bars above thumbnails */}
              <div className="flex gap-1">
                {selectablePhotos.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activePhoto ? "w-6 bg-[#FF5722]" : "w-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {selectablePhotos.map((photo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoSel({ uid: view.uid, index: idx })}
                    className={`h-14 w-14 overflow-hidden rounded-xl border-2 shadow-lg transition ${
                      idx === activePhoto ? "border-[#FF5722] scale-105" : "border-white/50 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. User Info Section */}
        <div className="relative z-30 -mt-6 flex-1 rounded-t-3xl border-t border-white/10 bg-[#0F172A] px-5 pb-6 pt-4">
          
          {/* Header Name & Online Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">{view.name}</h1>
              <CheckCircle2 className="h-5 w-5 text-[#FF5722]" />
            </div>

            {/* Online Status Pill */}
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border bg-slate-800/80 text-[#FF5722] border-[#FF5722]/30 backdrop-blur-sm"
            >
              <span className="h-2 w-2 rounded-full bg-[#FF5722] animate-pulse" />
              <span>Online</span>
            </div>
          </div>

          {/* Badges Row: Gender+Age, Distance, Country */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {view.age && (
              <span className="flex items-center gap-1 rounded-full bg-[#FF5722]/20 px-3 py-1 text-xs font-bold text-orange-300 border border-[#FF5722]/30">
                {view.gender === "female" ? "♀️" : "♂️"} {view.age}
              </span>
            )}
            {view.distanceLabel && (
              <span className="rounded-full bg-[#FF5722]/20 px-3 py-1 text-xs font-bold text-orange-300 border border-[#FF5722]/30">
                {view.distanceLabel}
              </span>
            )}
            {view.country && (
              <span className="rounded-full bg-[#FF5722]/20 px-3 py-1 text-xs font-bold text-orange-300 border border-[#FF5722]/30">
                {view.country}
              </span>
            )}
          </div>

          {/* Copyable User ID */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <CopyIdButton value={view.uid} label={`ID: ${view.uid}`} />
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex items-center gap-6 border-b border-white/10 pb-3 text-sm font-bold">
            {(["About Me", "Honor", "Relation"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={t === tab ? "relative text-white" : "relative text-white/50 hover:text-white/80"}
              >
                {t}
                {t === tab && (
                  <span className="absolute -bottom-3 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#FF5722]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === "About Me" && (
            <div className="mt-5 space-y-5">
              {/* Status Section */}
              <div>
                <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-white/50">Status</h3>
                {view.statusAudio ? (
                  <div className="inline-flex items-center gap-3 rounded-full bg-amber-400 px-4 py-2 font-bold text-slate-950 shadow-lg shadow-amber-400/20">
                    <button
                      type="button"
                      onClick={toggleStatusAudio}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/10 transition hover:bg-slate-950/20"
                    >
                      {statusPlaying ? <Pause className="h-3.5 w-3.5 fill-slate-950" /> : <Play className="h-3.5 w-3.5 fill-slate-950" />}
                    </button>
                    <span className="flex h-4 items-end gap-[3px]">
                      {[8, 14, 10, 16, 6, 12, 9].map((h, i) => (
                        <span key={i} className="w-1 rounded-full bg-slate-950/70" style={{ height: h }} />
                      ))}
                    </span>
                    <span className="text-xs tabular-nums">Status: {view.statusAudio.durationSeconds.toFixed(1)}s</span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-white/80">{view.status || view.bio || "No status yet."}</p>
                )}
              </div>

              {/* Hobbies Section */}
              <div>
                <h3 className="mb-2.5 text-xs font-black uppercase tracking-wider text-white/50">Hobbies</h3>
                {hobbies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {hobbies.map((h, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold border shadow-sm ${h.tone}`}
                      >
                        <span>{h.icon}</span>
                        <span>{h.label}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">No hobbies shared yet.</p>
                )}
              </div>
            </div>
          )}

          {tab === "Honor" && (
            <div className="mt-5">
              {view.honor.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {view.honor.map((row) => (
                    <li key={row.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-xs font-semibold text-white/50">{row.label}</span>
                      <span className="text-sm font-bold text-white">{row.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-6 text-center text-xs text-white/40">No honor badges displayed yet.</div>
              )}
            </div>
          )}

          {tab === "Relation" && (
            <div className="mt-5">
              {view.relation.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {view.relation.map((row) => (
                    <li key={row.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-xs font-semibold text-white/50">{row.label}</span>
                      <span className="text-sm font-bold text-white">{row.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-6 text-center text-xs text-white/40">No relationship details added.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Actions (Chat & Follow) */}
      {!view.isSelf && (
        <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex w-full max-w-md items-center gap-3 border-t border-white/10 bg-[#0F172A]/90 p-4 backdrop-blur-xl mb-[calc(80px_+_env(safe-area-inset-bottom))] md:mb-0">
          <div className="flex-1">
            <ProfileChatButton recipientId={view.uid} recipientName={view.name} />
          </div>
          <div className="flex-1">
            <ProfileFollowButton targetUserId={view.uid} viewerUid={view.viewerUid ?? ""} />
          </div>
        </div>
      )}
    </div>
  );
}
