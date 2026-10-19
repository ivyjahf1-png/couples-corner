"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Play, Pause } from "lucide-react";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileChatButton, ProfileFollowButton } from "@/components/profile/PublicProfileActions";
import { usePresence } from "@/lib/hooks/usePresence";
import { isPresenceOnline } from "@/lib/presence";
/** One photo in the header gallery. `src` null means "no usable image". */
export interface PublicProfilePhoto {
  /** Stable key for React and for the pagination dot. */
  key: string;
  /** Resolved URL, or null when the row has no resolvable image. */
  src: string | null;
}

/**
 * Everything the view renders, assembled on the server by the page.
 *
 * A FLAT, PRE-DERIVED shape rather than a raw `UserProfile`: age, photo URLs
 * and distance are computed server-side so first paint and every re-render
 * agree, and the client never re-derives the server's rules. This type lived
 * in the now-deleted `PublicProfileScreen` and moved here with the component
 * that replaced it.
 */
export interface PublicProfileView {
  /** Route id. Also the copy-to-clipboard payload shown as `ID:<uid>`. */
  uid: string;
  name: string;
  /** Full-bleed header gallery, primary photo first. */
  photos: PublicProfilePhoto[];
  /** Age in whole years, or null when it cannot be derived safely. */
  age: number | null;
  /** Display gender, or null. Rendered as a â™€/â™‚ prefix on the age pill. */
  gender: string | null;
  /** Distance label, e.g. "< 0.1 km". Null when no location is shared. */
  distanceLabel: string | null;
  country: string | null;
  /** Free-text status line. Null when the member set none. */
  status: string | null;
  /**
   * Voice status clip for the yellow audio pill, or null when the member has
   * none. ALWAYS null today: the schema has no audio column, so the page
   * passes null deliberately rather than faking a clip or a duration. The
   * field exists so the player can be wired to real data the moment such a
   * column (and a recording path) lands.
   */
  statusAudio: { src: string; durationSeconds: number } | null;
  /** Server-rendered presence verdict, so the pill is right on first paint. */
  initialOnline: boolean;
  /** True when the signed-in member is viewing their own profile. */
  isSelf: boolean;
  /** Signed-in member's uid, or null when signed out. */
  viewerUid: string | null;
  /** Relationship / status chip beside the name, e.g. "Single". */
  statusBadge: string | null;
  /** Bio â€” the long-form copy under the tabs. */
  bio: string | null;
  /** Interest chips: the "About Me" tag cloud. */
  interests: string[];
  /** Lifestyle tags, rendered as their own labelled group. */
  lifestyle: string[];
  /** Education, occupation, height and genotype, for the Honor tab. */
  honor: { label: string; value: string }[];
  /** Relationship fields, for the Relation tab. */
  relation: { label: string; value: string }[];
}

function hobbyIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("video") || l.includes("photo") || l.includes("camera")) return "ðŸ“·";
  if (l.includes("music") || l.includes("hip hop") || l.includes("punk")) return "ðŸŽµ";
  if (l.includes("ping pong") || l.includes("sport")) return "ðŸ“";
  if (l.includes("climb") || l.includes("boulder")) return "ðŸ§—";
  if (l.includes("festival") || l.includes("party")) return "ðŸŽ‰";
  if (l.includes("cook") || l.includes("food")) return "ðŸ³";
  if (l.includes("travel")) return "âœˆï¸";
  if (l.includes("read")) return "ðŸ“š";
  if (l.includes("game")) return "ðŸŽ®";
  return "âœ¨";
}
const TONES = ["bg-amber-100 text-amber-800","bg-purple-100 text-purple-800","bg-sky-100 text-sky-800","bg-emerald-100 text-emerald-800","bg-rose-100 text-rose-800"];

export function UserProfileView({ view }: { view: PublicProfileView }) {
  const router = useRouter();
  const [tab, setTab] = useState<"About Me" | "Honor" | "Relation">("About Me");
  /* Which frame of the (max four) header gallery is showing, tagged with the
     uid it belongs to. Keyed BY UID rather than reset in an effect: when a
     different member renders into this instance the uid no longer matches and
     the read below falls back to 0 â€” the same reset, derived during render
     instead of scheduled as a setState inside an effect. Reads are also
     clamped, so a stale index can never point past the gallery's end. */
  const [photoSel, setPhotoSel] = useState<{ uid: string; index: number }>({
    uid: view.uid,
    index: 0,
  });
  /* Voice status player state â€” see `PublicProfileView.statusAudio`. */
  const [statusPlaying, setStatusPlaying] = useState(false);
  const statusAudioRef = useRef<HTMLAudioElement | null>(null);
  // Array form, memoised: usePresence(ids[]) takes an ARRAY â€” a bare string
  // would iterate its characters as ids and spam the presence action once per
  // character, hanging the profile. `useMemo` keeps the array identity stable
  // so the hook's refetch effect does not re-fire every render.
  const watchIds = useMemo(() => (view.uid ? [view.uid] : []), [view.uid]);
  const { presence } = usePresence(watchIds, Boolean(view.uid));
  const entry = view.uid ? presence[view.uid] : undefined;
  /* `entry.online` is what the last poll said; re-deriving from `lastSeenAt`
     on every render keeps the dot honest in the gap between polls. Falls back
     to the server's first-paint verdict until the first poll resolves. */
  const isOnline = entry ? entry.online && isPresenceOnline(entry.lastSeenAt) : view.initialOnline;
  const photos = view.photos.map((p) => p.src).filter((s): s is string => Boolean(s));
  /* The switcher offers at most four frames. The index is clamped against BOTH
     that cap and this member's photo count, because the component can be
     reused across /profile/[id] navigations with its state intact. */
  const selectablePhotos = photos.slice(0, 4);
  const activePhoto =
    selectablePhotos.length > 0 && photoSel.uid === view.uid
      ? Math.min(photoSel.index, selectablePhotos.length - 1)
      : 0;
  const cover = selectablePhotos.length > 0 ? (photos[activePhoto] ?? null) : null;
  const hobbies = [...view.interests, ...view.lifestyle].map((label, i) => ({ label, icon: hobbyIcon(label), tone: TONES[i % TONES.length] }));
  function goBack() { if (window.history.length > 1) router.back(); else router.replace("/discover"); }

  /* `photoSel` is keyed by uid: when a different member renders into this
     instance, `photoSel.uid` no longer matches and the fallback `0` below puts
     them on their primary photo â€” no explicit reset needed. */
  /* One clip per `statusAudio.src`. Recreated (and paused) whenever the source
     changes or the member navigates away, so a clip can never keep playing
     over a different profile. No setState appears in this body: the playing
     flag resets through the `pause` / `ended` MEDIA EVENTS, which is also what
     a user-initiated pause fires â€” one code path for every reset. */
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
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden bg-slate-950 text-white">
      {/* LOCKED COLUMN: outer box never scrolls; the sheet below is the single
         overflow-y-auto region. A sticky action bar INSIDE the scroller traps
         wheel/touch momentum on large phones â€” as a shrink-0 sibling it stays
         pinned without intercepting the scroll gesture. The sibling also
         reserves the fixed tab bar's height in its own `mb`, so it rests flush
         ON TOP of the nav instead of behind it (see the action bar below). */}
      {/* THE SINGLE SCROLL REGION. Full mobile triad: `flex-1 min-h-0` keeps the
          box bounded so it â€” not the page â€” is the scroller, `overflow-y-auto`
          makes it genuinely scrollable, and `overscroll-contain` stops the
          rubber-band chaining to the shell behind it.

          `[content-visibility:auto]` USED TO BE HERE AND IT BROKE SCROLLING.
          `auto` implies SIZE containment, and with no matching
          `contain-intrinsic-size` every skipped subtree measures as ZERO tall â€”
          so this region's `scrollHeight` collapsed to its own height, the browser
          found nothing to scroll to, and a long profile looked frozen on exactly
          the low-end devices the hint was meant to help. Removed; the
          optimisation belongs on the individual sections, each with its own
          `contain-intrinsic-size`. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain overscroll-y-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
      {/* Cover: capped height + layout containment so it never forces the sheet. */}
      <div className="relative h-80 max-h-[400px] w-full shrink-0 bg-slate-900 [contain:layout_style]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={view.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/30">{view.name.charAt(0).toUpperCase()}</div>
        )}
        {/* Back / more actions pinned to the top of the photo card */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" onClick={goBack} aria-label="Go back" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"><ArrowLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="More options" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"><MoreHorizontal className="h-5 w-5" /></button>
        </div>
        {selectablePhotos.length > 1 ? (
          <div className="absolute bottom-4 left-4 z-20 flex gap-2">
            {selectablePhotos.map((photo, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPhotoSel({ uid: view.uid, index: idx })}
                aria-label={`Show photo ${idx + 1}`}
                aria-pressed={idx === activePhoto}
                className={`h-16 w-14 overflow-hidden rounded-xl border-2 shadow-lg transition ${idx === activePhoto ? "border-amber-400" : "border-white/40 hover:border-white/70"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
        {selectablePhotos.length > 1 ? (
          <div className="absolute bottom-10 left-4 z-20 flex gap-1.5">
            {selectablePhotos.map((_, idx) => (
              <span key={idx} className={idx === activePhoto ? "h-1 w-5 rounded-full bg-amber-400 transition-all" : "h-1 w-2 rounded-full bg-white/40 transition-all"} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative z-30 -mt-12 flex-1 rounded-t-3xl border-t border-white/10 bg-slate-950 px-0 pb-6 pt-2 md:pb-8 [contain:layout_style]">
        <ProfileHeader
          name={view.name}
          online={isOnline}
          gender={view.gender}
          age={view.age}
          distanceLabel={view.distanceLabel}
          country={view.country}
          uid={view.uid}
          statusBadge={view.statusBadge}
        />
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
              {/* THE YELLOW AUDIO STATUS PILL.
                  With a real clip (`statusAudio`) it is a working play/pause
                  player with a duration badge â€” no clip, no fake duration: the
                  schema has no audio column yet, so the page passes null and
                  this degrades to the written status (the member's bio) or the
                  honest "No status yet" empty pill. */}
              {view.statusAudio ? (
                <div className="inline-flex items-center gap-3 rounded-full bg-amber-400 px-4 py-2 font-bold text-slate-950 shadow-lg shadow-amber-400/25">
                  <button
                    type="button"
                    onClick={toggleStatusAudio}
                    aria-label={statusPlaying ? "Pause voice status" : "Play voice status"}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/10 transition hover:bg-slate-950/20"
                  >
                    {statusPlaying ? <Pause className="h-3.5 w-3.5 fill-slate-950" /> : <Play className="h-3.5 w-3.5 fill-slate-950" />}
                  </button>
                  <span aria-hidden className="flex h-4 items-end gap-[3px]">
                    {[8, 14, 10, 16, 6, 12, 9].map((h, i) => (
                      <span key={i} className="w-1 rounded-full bg-slate-950/70" style={{ height: h }} />
                    ))}
                  </span>
                  <span className="text-xs tabular-nums">{view.statusAudio.durationSeconds.toFixed(1)}s</span>
                </div>
              ) : view.status ? (
                <p className="text-sm leading-6 text-slate-300">{view.status}</p>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 font-bold text-slate-950 shadow-lg shadow-amber-400/25">
                  <Play className="h-4 w-4 fill-slate-950" /><span>No status yet</span>
                </div>
              )}
              {view.statusAudio && view.status ? (
                <p className="mt-2 text-sm leading-6 text-slate-300">{view.status}</p>
              ) : null}
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
      </div>
      {!view.isSelf ? (
        /* SITS DIRECTLY ON TOP OF THE FIXED DOCK - never under it.
           `<main>` takes `p-0` on this route (full-bleed), so this view's own
           bottom edge IS the viewport bottom, where the floating-island dock
           (components/navigation/BottomNav.tsx) paints. That component
           documents its own stack: 74px of pill (16px lift + 58px chrome) plus
           the centre button's overhang up to 79px, all inside the app-wide
           5rem (80px) + `env(safe-area-inset-bottom)` reserve the rest of the
           app sits at. Reserving exactly `calc(80px + safe-area-inset)` therefore puts
           this bar's bottom edge flush under the dock's TALLEST element (the
           raised centre button) and 6px clear of the pill itself on every
           device - never overlapping it, never floating above it.

           It is a `shrink-0` sibling of the scroller, so the profile content
           scrolls INSIDE its region while the bar holds this exact spot.

           `z-50` matches the dock and beats the sheet's `z-30`, so the bar
           paints cleanly above the content. `md:mb-0` drops the reservation at
           tablet and up, where the dock is `md:hidden` and there is nothing to
           clear.

           The old `pb` counted `env(safe-area-inset-bottom)` too - right when
           the bar sat at the viewport bottom, wrong now that the DOCK owns the
           home-indicator strip below it (double-counting pushed the buttons
           clear of the bar they sit on). Kept `md:`-only for iPads, which have
           a real inset but no bottom bar. */
        <div className="z-50 mx-auto mb-[calc(80px_+_env(safe-area-inset-bottom))] flex w-full max-w-md shrink-0 items-center gap-3 border-t border-white/10 bg-slate-950/70 p-4 backdrop-blur-xl md:mb-0 md:pb-[calc(1rem_+_env(safe-area-inset-bottom))]">
          <div className="flex-1"><ProfileChatButton recipientId={view.uid} recipientName={view.name} /></div>
          <div className="flex-1"><ProfileFollowButton targetUserId={view.uid} viewerUid={view.viewerUid ?? ""} /></div>
        </div>
      ) : null}
    </div>
  );
}
