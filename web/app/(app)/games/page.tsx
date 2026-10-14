import type { Metadata } from "next";
import { GamesView } from "@/components/game/GamesView";
import { listGames } from "@/lib/game/catalog";

export const metadata: Metadata = { title: "Game Center" };

export default function GamesPage() {
  const games = [...listGames()];
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <GamesView games={games} />
    </div>
  );
}
