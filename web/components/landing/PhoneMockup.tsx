/**
 * Phone frame mockup — a pure CSS/Tailwind handset rendered inside the landing
 * hero card's fallback panel (replaces the old gradient "water drop" placeholder).
 *
 * - Dark navy body (#0B1120/#0F172A family) so it blends with the site theme.
 * - Screen shows a miniature preview of the Couple's Corner app: status bar,
 *   nav pill, couple avatar row, and a match card.
 * - Accepts an optional admin-provided `imageUrl` (from the Supabase `content`
 *   table) which fills the screen when available, so admins can feature a
 *   real screenshot or photo inside the phone.
 */
export function PhoneMockup({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <div
      className="relative mx-auto w-[220px] rotate-[4deg] rounded-[2.5rem] border-[6px] border-slate-700/90 bg-[#0B1120] p-2 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:w-[250px]"
      aria-hidden="true"
    >
      {/* Notch */}
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900" />

      {/* Screen */}
      <div className="relative flex h-[440px] w-full flex-col overflow-hidden rounded-[1.9rem] bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#0B1120]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            {/* Mini status bar */}
            <div className="flex items-center justify-between px-5 pt-9 text-[9px] font-medium text-white/50">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                Couple&apos;s Corner
              </span>
            </div>

            {/* Mini app header */}
            <div className="mt-4 flex items-center gap-3 px-4">
              <div className="flex -space-x-2">
                <div className="h-9 w-9 rounded-full border-2 border-[#0F172A] bg-gradient-to-br from-orange-400 to-orange-600" />
                <div className="h-9 w-9 rounded-full border-2 border-[#0F172A] bg-gradient-to-br from-slate-400 to-slate-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white">Alex &amp; Jamie</span>
                <span className="text-[9px] text-white/50">Matched 3 days ago</span>
              </div>
            </div>

            {/* Mini match card */}
            <div className="mx-4 mt-4 flex-1 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="h-24 w-full rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-900/20" />
              <div className="mt-3 h-2 w-3/4 rounded-full bg-white/20" />
              <div className="mt-2 h-2 w-1/2 rounded-full bg-white/10" />
              <div className="mt-4 flex gap-2">
                <div className="h-7 w-7 rounded-full border border-white/15 bg-white/5" />
                <div className="h-7 flex-1 rounded-full bg-[#FF5722]/80" />
                <div className="h-7 w-7 rounded-full border border-white/15 bg-white/5" />
              </div>
            </div>

            {/* Mini bottom nav */}
            <div className="m-3 flex items-center justify-around rounded-full border border-white/10 bg-white/5 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
