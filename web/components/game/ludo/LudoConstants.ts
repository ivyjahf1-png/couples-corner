import { PlayerColor, GameMode, Pawn, TRACK, HOME_PATHS, PLAYERS, SAFE_INDICES } from './path-to-your-constants-file';
export type PlayerColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';
export type GameMode = 'CLASSIC' | 'QUICK' | 'MASTER';

export interface Pawn {
  id: number;
  step: number;
}

export const TILE_COUNT = 15;
export const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

export const PLAYERS: Record<PlayerColor, { color: string; offset: number; yard: { x: number; y: number }[] }> = {
  RED:    { color: '#E53935', offset: 0,  yard: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }] },
  GREEN:  { color: '#43A047', offset: 13, yard: [{ x: 11, y: 2 }, { x: 12, y: 2 }, { x: 11, y: 3 }, { x: 12, y: 3 }] },
  YELLOW: { color: '#FDD835', offset: 26, yard: [{ x: 11, y: 11 }, { x: 12, y: 11 }, { x: 11, y: 12 }, { x: 12, y: 12 }] },
  BLUE:   { color: '#1E88E5', offset: 39, yard: [{ x: 2, y: 11 }, { x: 3, y: 11 }, { x: 2, y: 12 }, { x: 3, y: 12 }] }
};

export const TRACK: [number, number][] = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0],
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7],
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14],
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6]
];

export const HOME_PATHS: Record<PlayerColor, [number, number][]> = {
  RED:    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  GREEN:  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  YELLOW: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  BLUE:   [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]]
};