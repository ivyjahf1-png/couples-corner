import type { Metadata } from "next";
import { GamesView } from "@/components/game/GamesView";
import { listGames } from "@/lib/game/catalog";

export const metadata: Metadata = { title: "Game Center" };

export default function GamesPage() {
  const games = [...listGames()];
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-black text-white">Game Center</h1>
        <p className="text-sm text-slate-400">Premium arcade — higher levels unlock more games.</p>
      </header>
      <GamesView games={games} />
    </div>
  );
}
