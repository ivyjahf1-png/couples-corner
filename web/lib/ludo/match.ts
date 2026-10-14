export type LudoPhase = "menu" | "lobby" | "matchmaking" | "board" | "win";
export type PowerUp = "undo" | "roll2" | "hilo";
export interface PowerUpState { undo: number; roll2: number; hilo: number; }
export const BETS = [100, 500, 1000, 5000] as const;
export function potFor(bet: number, players: number): number { return bet * players; }
export function freshPowerUps(): PowerUpState { return { undo: 1, roll2: 1, hilo: 1 }; }
/** Seconds each player has to act on their turn before the house plays for them. */
export const TURN_SECONDS = 15;
