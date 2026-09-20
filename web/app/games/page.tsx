import type { Metadata } from "next";
import { getCurrentSessionUser } from "@/lib/server/session";
import { getGameWallet } from "@/lib/server/games";
import { GameCenterHub } from "@/components/games/GameCenterHub";

export const metadata: Metadata = {
  title: "Game Center — Couple's Corner",
  description: "Play, win coins and level up together in the Couple's Corner Game Center.",
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
