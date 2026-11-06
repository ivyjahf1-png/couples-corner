
// @ts-ignore - React is provided by the app runtime; editor types may be unavailable.
import * as React from 'react';
import CornerStarLudo from './ludo/CornerStar';
interface LocalGameRunnerProps {
  engine: 'ludo' | 'custom' | 'corner-star-ludo';
  playerCount: '2' | '4';
  onGameStart: (players: any) => void;
  stake: number;
}

export const LocalGameRunner = ({
  engine,
  playerCount,
  onGameStart,
  stake,
}: LocalGameRunnerProps) => {
  // Render the appropriate game engine
  if (engine === 'ludo' || engine === 'corner-star-ludo') {
    return React.createElement(CornerStarLudo, {
      playerCount,
      stake,
      onGameStart,
    });
  }

  // Fallback for other engines
  return React.createElement('div', null, `Game Engine: ${engine}`);
};