"use client";
import { WhotGame } from "@/components/game/whot/WhotGame";

/**
 * Legacy import path kept alive for LocalGameRunner: routes the "whot"
 * catalog engine into the new 4-player 4D Whot table.
 */
export function WhotEngine({
  balance,
  onWin,
  onLose,
}: {
  balance?: number;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  return <WhotGame balance={balance ?? 10000} onWin={onWin} onLose={onLose} />;
}
