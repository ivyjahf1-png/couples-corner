import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GameScreen } from "@/components/game/GameScreen";
import { findCatalogGame, listGames } from "@/lib/game/catalog";

export function generateStaticParams() {
  return listGames().map((g) => ({ gameId: g.id }));
}


export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const { gameId } = await params;
  const g = findCatalogGame(gameId);
  return { title: g ? `${g.title} — Game Center` : "Game not found" };
}

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = findCatalogGame(gameId);
  if (!game) redirect("/games");
  return <GameScreen game={game} />;
}
