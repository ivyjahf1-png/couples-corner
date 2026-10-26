"use client";
import { ArcadeEngine, CardsEngine, SportsEngine } from "./engines/TableEngines";
import LudoSuperstar from "./ludo/LudoSuperstar";
import { MinesEngine } from "./engines/MinesEngine";
import { MineIslandEngine } from "./engines/MineIslandEngine";
import { SlotsEngine } from "./engines/SlotsEngine";
import { WhotEngine } from "./engines/WhotEngine";
import { CarRaceGame } from "./CarRaceGame";
import type { GameEngine } from "@/lib/game/catalog";

export function LocalGameRunner({ engine, balance, onWin, onLose }: { engine: GameEngine; balance?: number; onWin: (n: number) => void; onLose: (n: number) => void }) {
  if (engine === "ludo") return <LudoSuperstar balance={balance ?? 10000} onWin={onWin} onLose={onLose} />;
  if (engine === "whot") return <WhotEngine onWin={onWin} onLose={onLose} />;
  if (engine === "mines") return <MinesEngine onWin={onWin} onLose={onLose} />;
  if (engine === "mine-island") return <MineIslandEngine onWin={onWin} onLose={onLose} />;
  if (engine === "slots") return <SlotsEngine onWin={onWin} onLose={onLose} />;
  if (engine === "cards") return <CardsEngine onWin={onWin} onLose={onLose} />;
  if (engine === "sports") return <SportsEngine onWin={onWin} onLose={onLose} />;
  if (engine === "race") return <CarRaceGame balance={balance ?? 10000} onWin={onWin} onLose={onLose} />;
  return <ArcadeEngine onWin={onWin} onLose={onLose} />;
}
