"use client";
import { ArcadeEngine, CardsEngine, SportsEngine } from "./engines/TableEngines";
import { LudoEngine } from "./engines/LudoEngine";
import { MinesEngine } from "./engines/MinesEngine";
import { SlotsEngine } from "./engines/SlotsEngine";
import { WhotEngine } from "./engines/WhotEngine";
import type { GameEngine } from "@/lib/game/catalog";

export function LocalGameRunner({ engine, onWin, onLose }: { engine: GameEngine; onWin: (n: number) => void; onLose: (n: number) => void }) {
  if (engine === "ludo") return <LudoEngine onWin={onWin} onLose={onLose} />;
  if (engine === "whot") return <WhotEngine onWin={onWin} onLose={onLose} />;
  if (engine === "mines") return <MinesEngine onWin={onWin} onLose={onLose} />;
  if (engine === "slots") return <SlotsEngine onWin={onWin} onLose={onLose} />;
  if (engine === "cards") return <CardsEngine onWin={onWin} onLose={onLose} />;
  if (engine === "sports") return <SportsEngine onWin={onWin} onLose={onLose} />;
  return <ArcadeEngine onWin={onWin} onLose={onLose} />;
}
