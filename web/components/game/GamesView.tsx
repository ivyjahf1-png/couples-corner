"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameCenterHeader } from "@/components/game/GameCenterHeader";
import { GameCenterBanner } from "@/components/game/GameCenterBanner";
import { GameCard, type WinnerRef } from "@/components/game/GameCard";
import { useGameWallet } from "@/components/game/useGameWallet";
import { isUnlocked, type CatalogGame } from "@/lib/game/catalog";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * GamesView — the commercial Game Center catalog.
 *
 * Assembles the top HUD header, the promo/level-benefits banner, and the
 * vertical stack of level-gated game cards. Coin balance, level, the signed-in
 * member's photo, and a pool of recent-winner avatars all come from Supabase
 * (with graceful fallbacks so the page still renders when unconfigured).
 */
export function GamesView({ games }: { games: CatalogGame[] }) {
  const router = useRouter();
  const { balance, level } = useGameWallet();
  const [displayName, setDisplayName] = useState("You");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [winners, setWinners] = useState<WinnerRef[]>([]);

  // Signed-in member's own name + photo for the HUD, plus a small pool of other
  // members' avatars to feature as "winners" on the game banners. Everything is
  // wrapped so a missing table / column / network simply falls back to defaults
  // rather than breaking the page.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabaseClient();
    let alive = true;

    const authP = sb.auth
      .getUser()
      .then(({ data }) => {
        const uid = data.user?.id ?? null;
        const meta = data.user?.user_metadata ?? {};
        const metaName = typeof meta.display_name === "string" ? meta.display_name : "";
        const metaAvatar = typeof meta.avatar_url === "string" ? meta.avatar_url : null;
        if (!alive) return;
        if (metaName) setDisplayName(metaName);
        if (metaAvatar) setAvatarUrl(metaAvatar);
        if (!uid) return;
        sb.from("profiles").select("display_name,avatar_url").eq("id", uid).maybeSingle().then(({ data: p }) => {
          const row = p as { display_name?: string | null; avatar_url?: string | null } | null;
          if (!alive || !row) return;
          if (typeof row.display_name === "string" && row.display_name.trim()) setDisplayName(row.display_name);
          if (typeof row.avatar_url === "string" && row.avatar_url.trim()) setAvatarUrl(row.avatar_url);
        });
      });
    void Promise.resolve(authP).catch(() => undefined);

    // Pool of recent winners (other members) for the laurel frames.
    const poolP = sb.from("profiles").select("display_name,avatar_url").limit(16).then(({ data }) => {
      if (!alive || !Array.isArray(data)) return;
      const pool: WinnerRef[] = data
        .map((r) => {
          const row = r as { display_name?: string | null; avatar_url?: string | null };
          return {
            name: typeof row.display_name === "string" && row.display_name.trim() ? row.display_name : "Member",
            src: typeof row.avatar_url === "string" && row.avatar_url.trim() ? row.avatar_url : null,
          };
        })
        .filter((w) => w.name.length > 0);
      setWinners(pool);
    });
    void Promise.resolve(poolP).catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  // Assign each game a winner from the pool round-robin, offset per game so a
  // single game keeps a stable "champion" across renders.
  const winnerFor = (idx: number): WinnerRef | null =>
    winners.length ? winners[(idx * 5 + 3) % winners.length]! : null;

  return (
    <div className="flex flex-col gap-5 pb-4">
      <GameCenterHeader
        coinBalance={balance}
        level={level}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onBack={() => router.back()}
      />
      <GameCenterBanner onFeature={() => undefined} />
      <div className="flex flex-col gap-3">
        {games.map((g, idx) => (
          <GameCard key={g.id} g={g} unlocked={isUnlocked(g, level)} winner={winnerFor(idx)} />
        ))}
      </div>
    </div>
  );
}

