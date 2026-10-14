import catalogJson from "../../data/games.json";

export type GameEngine = "ludo" | "whot" | "slots" | "mines" | "cards" | "sports" | "arcade" | "race";

export interface CatalogGame {
  id: string;
  title: string;
  category: string;
  badge: string;
  levelRequired: number;
  thumbnail: string;
  banner: string;
  iframeUrl: string;
  engine: GameEngine;
  accent: string;
  emoji: string;
  tagline: string;
}

const CATALOG: readonly CatalogGame[] = (
  Array.isArray(catalogJson) ? (catalogJson as unknown[]) : []
).filter(
  (g): g is CatalogGame =>
    typeof g === "object" &&
    g !== null &&
    typeof (g as CatalogGame).id === "string" &&
    (g as CatalogGame).id.length > 0 &&
    typeof (g as CatalogGame).title === "string",
);

export function listGames(): readonly CatalogGame[] {
  return CATALOG;
}

export function findCatalogGame(id: string | undefined | null): CatalogGame | null {
  if (typeof id !== "string") return null;
  const wanted = id.slice(0, 64);
  return CATALOG.find((g) => g.id === wanted) ?? null;
}

export function isLocalGame(url: string | undefined | null): boolean {
  return typeof url === "string" && url.startsWith("local:");
}

export function isUnlocked(game: CatalogGame, userLevel: number): boolean {
  return userLevel >= (game.levelRequired ?? 1);
}
