import type { Metadata } from "next";
import { getCurrentSessionUser } from "@/lib/server/session";
import { getGameWallet } from "@/lib/server/games";
import { GameCenterHub } from "@/components/games/GameCenterHub";

export const metadata: Metadata = {
  title: "Play Hub — Couple's Corner",
  description: "Two-player board games, trivia and icebreakers to play together on Couple's Corner.",
};

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const session = await getCurrentSessionUser();
  const wallet = session ? await getGameWallet(session.uid) : { coinBalance: 0, totalEarned: 0 };

  return (
    <GameCenterHub
      coinBalance={wallet.coinBalance}
      authenticated={Boolean(session)}
    />
  );
}
