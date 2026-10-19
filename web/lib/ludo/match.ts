/** Shared match constants for the Ludo suite (lobby stakes + turn clock).
 *  Single source of truth — the old canvas stack's duplicates were removed. */
export const BETS = [100, 500, 1000, 5000, 10000] as const;
export function potFor(bet: number, players: number): number { return bet * players; }
/** Seconds each player has to act on their turn before the house plays for them. */
export const TURN_SECONDS = 15;
