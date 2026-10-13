"use client";
import { ArcadeGrid } from "@/components/game/ArcadeGrid";
import { useGameWallet } from "@/components/game/useGameWallet";
import type { CatalogGame } from "@/lib/game/catalog";

export function GamesView({ games }: { games: CatalogGame[] }) {
  const { balance, level } = useGameWallet();
  return <ArcadeGrid games={games} userLevel={level} coinBalance={balance} />;
}
