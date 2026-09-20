import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/session";
import { getGameWallet } from "@/lib/server/games";
import { GAMES, getGameBySlug } from "@/lib/games";
import { GamePlayer } from "@/components/games/GamePlayer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const game = getGameBySlug(id);
  return {
    title: game ? `${game.title} — Game Center` : "Game — Couple's Corner",
  };
}

/**
 * Game player route: /games/[id].
 * Resolves the game from the registry, loads the live coin balance and
 * hands everything to the client-side player container.
 */
export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = getGameBySlug(id);
  if (!game) notFound();

  const session = await getCurrentSessionUser();
  const wallet = session ? await getGameWallet(session.uid) : { coinBalance: 0, totalEarned: 0 };

  return (
    <GamePlayer
      game={game}
      related={GAMES.filter((entry) => entry.slug !== game.slug).slice(0, 4)}
      coinBalance={wallet.coinBalance}
      authenticated={Boolean(session)}
    />
  );
}
