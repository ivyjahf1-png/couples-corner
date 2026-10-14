"use client";
import { ChevronLeft, Coins, Crown, PawPrint, Sparkles } from "lucide-react";
import { Avatar } from "@/components/app/Avatar";

/**
 * GameCenterHeader — the commercial "1:1" Game Center top bar.
 *
 * Left: a "< Game Center" back affordance. Right: the golden-coin balance pill,
 * a Pet/VIP honor counter, and the signed-in member's circular profile photo
 * with a "Lv{level}" badge overlaying the bottom-right.
 *
 * Purely presentational: every value is passed in so it stays a server-safe
 * leaf and can be unit-tested without Supabase.
 */
export function GameCenterHeader({
  coinBalance,
  level,
  displayName,
  avatarUrl,
  onBack,
}: {
  coinBalance: number;
  level: number;
  displayName: string;
  avatarUrl: string | null;
  onBack: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm font-bold text-white/90 backdrop-blur-md transition hover:bg-white/[0.12] active:scale-95"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Game Center
      </button>

      <div className="flex items-center gap-2">
        {/* Pet / VIP honor counter */}
        <div
          className="flex items-center gap-1.5 rounded-full border border-fuchsia-300/30 bg-gradient-to-r from-fuchsia-500/20 to-purple-600/20 px-3 py-1.5"
          title="Pets collected"
        >
          <PawPrint className="h-4 w-4 text-fuchsia-200" aria-hidden />
          <span className="text-sm font-black text-fuchsia-100">{level * 3}</span>
        </div>

        {/* Golden coin balance pill */}
        <div className="flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-400/25 to-orange-500/20 px-3 py-1.5 shadow-[0_0_16px_rgba(251,191,36,0.25)]">
          <Coins className="h-4 w-4 text-amber-300" aria-hidden />
          <span className="text-sm font-extrabold text-amber-200">{coinBalance.toLocaleString("en-US")}</span>
        </div>

        {/* Profile photo + level badge */}
        <div className="relative shrink-0">
          <span className="block rounded-full ring-2 ring-amber-300/70 ring-offset-2 ring-offset-[#12071f]">
            <Avatar name={displayName || "You"} src={avatarUrl} size="sm" />
          </span>
          <span className="absolute -bottom-1.5 -right-1.5 flex items-center gap-0.5 rounded-full bg-gradient-to-b from-amber-300 to-orange-500 px-1.5 py-0.5 text-[10px] font-black text-[#2b1000] shadow ring-1 ring-white/30">
            <Crown className="h-2.5 w-2.5" aria-hidden />Lv{level}
          </span>
        </div>
      </div>

      {/* VIP honor status line (accessibility + subtle desktop copy) */}
      <p className="sr-only">
        <Sparkles className="inline h-3 w-3" aria-hidden /> VIP Honor Member
      </p>
    </header>
  );
}
