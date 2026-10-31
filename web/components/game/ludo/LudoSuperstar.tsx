import React, { useState, useEffect, useRef } from 'react';

// --- TYPES & INTERFACES ---
type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
  id: number;
  color: PlayerColor;
  position: number; // -1: home base, 0-51: main track, 100-105: home path, 999: finished
  stepCount: number;
}

interface Player {
  color: PlayerColor;
  name: string;
  isAI: boolean;
  startTrackPos: number;
}

interface LudoGameProps {
  balance?: number;
  onWin?: (amount: number) => void;
  onLose?: (amount: number) => void;
}

const PLAYERS_CONFIG: Record<PlayerColor, Player> = {
  red: { color: 'red', name: 'Red Player', isAI: false, startTrackPos: 0 },
  green: { color: 'green', name: 'Green Bot', isAI: true, startTrackPos: 13 },
  yellow: { color: 'yellow', name: 'Yellow Bot', isAI: true, startTrackPos: 26 },
  blue: { color: 'blue', name: 'Blue Bot', isAI: true, startTrackPos: 39 },
};

const MAIN_PATH_COORDS: [number, number][] = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0],
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14],
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6]
];

const HOME_PATHS: Record<PlayerColor, [number, number][]> = {
  red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
};

const BASE_POSITIONS: Record<PlayerColor, [number, number][]> = {
  red: [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]],
  green: [[10.5, 1.5], [12.5, 1.5], [10.5, 3.5], [12.5, 3.5]],
  yellow: [[10.5, 10.5], [12.5, 10.5], [10.5, 12.5], [12.5, 12.5]],
  blue: [[1.5, 10.5], [3.5, 10.5], [1.5, 12.5], [3.5, 12.5]],
};

const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

export default function LudoSuperstar({ balance = 1000, onWin, onLose }: LudoGameProps) {
  const playerOrder: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [stake, setStake] = useState<number>(100);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>(['Welcome to Ludo Superstar! Select stake to start.']);

  const [tokens, setTokens] = useState<Record<PlayerColor, Token[]>>({
    red: [0, 1, 2, 3].map(id => ({ id, color: 'red', position: -1, stepCount: 0 })),
    green: [0, 1, 2, 3].map(id => ({ id, color: 'green', position: -1, stepCount: 0 })),
    yellow: [0, 1, 2, 3].map(id => ({ id, color: 'yellow', position: -1, stepCount: 0 })),
    blue: [0, 1, 2, 3].map(id => ({ id, color: 'blue', position: -1, stepCount: 0 })),
  });

  const activeColor = playerOrder[turnIndex];
  const activePlayer = PLAYERS_CONFIG[activeColor];

  const logMessage = (msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 15)]);
  };

  const rollDice = () => {
    if (isRolling || diceValue !== null || winner) return;
    setIsRolling(true);

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);
      logMessage(`${activePlayer.name} rolled a ${rolled}!`);
      checkMovableTokens(rolled);
    }, 600);
  };

  const checkMovableTokens = (roll: number) => {
    const currentTokens = tokens[activeColor];
    const canMove = currentTokens.some(t => {
      if (t.position === -1) return roll === 6;
      if (t.position === 999) return false;
      return t.stepCount + roll <= 57;
    });

    if (!canMove) {
      logMessage(`No valid moves for ${activePlayer.name}.`);
      setTimeout(() => nextTurn(), 1000);
    }
  };

  const nextTurn = () => {
    setDiceValue(null);
    setTurnIndex(prev => (prev + 1) % 4);
  };

  const executeMove = (token: Token, roll: number) => {
    if (diceValue === null || isRolling) return;

    let newTokens = { ...tokens };
    let playerTokens = [...newTokens[token.color]];
    let t = { ...playerTokens[token.id] };
    let captured = false;

    if (t.position === -1) {
      if (roll === 6) {
        t.position = PLAYERS_CONFIG[t.color].startTrackPos;
        t.stepCount = 0;
        logMessage(`${activePlayer.name} released a token!`);
      } else {
        return;
      }
    } else {
      const targetStep = t.stepCount + roll;
      if (targetStep > 57) return;

      t.stepCount = targetStep;

      if (targetStep === 57) {
        t.position = 999;
        logMessage(`${activePlayer.name} brought a token HOME!`);
      } else if (targetStep > 51) {
        t.position = 100 + (targetStep - 52);
      } else {
        t.position = (PLAYERS_CONFIG[t.color].startTrackPos + targetStep) % 52;

        if (!SAFE_SPOTS.includes(t.position)) {
          Object.keys(newTokens).forEach(c => {
            if (c !== t.color) {
              newTokens[c as PlayerColor] = newTokens[c as PlayerColor].map(other => {
                if (other.position === t.position) {
                  captured = true;
                  logMessage(`${PLAYERS_CONFIG[t.color].name} captured ${PLAYERS_CONFIG[c as PlayerColor].name}!`);
                  return { ...other, position: -1, stepCount: 0 };
                }
                return other;
              });
            }
          });
        }
      }
    }

    playerTokens[token.id] = t;
    newTokens[token.color] = playerTokens;
    setTokens(newTokens);

    if (newTokens[token.color].every(tok => tok.position === 999)) {
      setWinner(token.color);
      logMessage(`${PLAYERS_CONFIG[token.color].name} WINS THE GAME!`);
      if (token.color === 'red' && onWin) onWin(stake * 3.6);
      else if (onLose) onLose(stake);
      return;
    }

    if (roll === 6 || captured) {
      logMessage(`${PLAYERS_CONFIG[token.color].name} gets an extra turn!`);
      setDiceValue(null);
    } else {
      setTimeout(() => nextTurn(), 500);
    }
  };

  useEffect(() => {
    if (gameStarted && activePlayer.isAI && diceValue === null && !isRolling && !winner) {
      const timer = setTimeout(() => rollDice(), 800);
      return () => clearTimeout(timer);
    }
  }, [turnIndex, diceValue, gameStarted, isRolling, winner]);

  useEffect(() => {
    if (gameStarted && activePlayer.isAI && diceValue !== null && !winner) {
      const currentTokens = tokens[activeColor];
      const validTokens = currentTokens.filter(t => {
        if (t.position === -1) return diceValue === 6;
        if (t.position === 999) return false;
        return t.stepCount + diceValue <= 57;
      });

      if (validTokens.length > 0) {
        const chosen = validTokens[Math.floor(Math.random() * validTokens.length)];
        const timer = setTimeout(() => executeMove(chosen, diceValue), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [diceValue]);

  const startGame = () => {
    setGameStarted(true);
    logMessage(`Game started with a stake of $${stake}.`);
  };

  const getTokenCoords = (token: Token): { x: number; y: number } => {
    if (token.position === -1) {
      const base = BASE_POSITIONS[token.color][token.id];
      return { x: base[0], y: base[1] };
    }
    if (token.position === 999) {
      return { x: 7, y: 7 };
    }
    if (token.position >= 100) {
      const idx = token.position - 100;
      const coord = HOME_PATHS[token.color][idx];
      return { x: coord[0], y: coord[1] };
    }
    const coord = MAIN_PATH_COORDS[token.position];
    return { x: coord[0], y: coord[1] };
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen bg-slate-950 p-4 gap-6 text-white font-sans">
      {!gameStarted ? (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <h1 className="text-4xl font-extrabold text-amber-400 mb-2">LUDO SUPERSTAR</h1>
          <p className="text-slate-400 mb-6">Select your stake to match against AI bots!</p>
          <div className="mb-6">
            <span className="text-sm text-slate-400 block mb-2">Wallet Balance: ${balance}</span>
            <div className="grid grid-cols-3 gap-3">
              {[50, 100, 250].map(amt => (
                <button
                  key={amt}
                  onClick={() => setStake(amt)}
                  className={`py-3 rounded-xl font-bold border transition-all ${
                    stake === amt ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg scale-105' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={startGame}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-extrabold text-slate-950 text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            START MATCH (${stake})
          </button>
        </div>
      ) : (
        <>
          {/* PLAYER HUDS & ACTIVE-PLAYER ANCHORED DICE */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {playerOrder.map((color, idx) => {
              const p = PLAYERS_CONFIG[color];
              const isActive = turnIndex === idx;

              return (
                <div
                  key={color}
                  className={`relative flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isActive ? 'bg-slate-800 border-amber-400 shadow-lg scale-105 z-10' : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center font-bold text-xs ${
                        color === 'red'
                          ? 'bg-red-600'
                          : color === 'green'
                          ? 'bg-green-600'
                          : color === 'yellow'
                          ? 'bg-yellow-500 text-slate-950'
                          : 'bg-blue-600'
                      }`}
                    >
                      {p.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.isAI ? 'AI Bot' : 'Human'}</div>
                    </div>
                  </div>

                  {/* ACTIVE PLAYER SIDE DICE CONTROL */}
                  {isActive && (
                    <div className="flex items-center">
                      <button
                        onClick={rollDice}
                        disabled={isRolling || diceValue !== null || p.isAI}
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-extrabold text-xl shadow-xl flex items-center justify-center border-2 border-white transition-all active:scale-90 ${
                          isRolling ? 'animate-spin' : ''
                        } ${p.isAI ? 'cursor-not-allowed opacity-90' : 'hover:brightness-110'}`}
                      >
                        {diceValue !== null ? diceValue : '🎲'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ACTION LOG PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-48 overflow-y-auto text-xs space-y-1 text-slate-300">
              <div className="font-bold text-slate-400 mb-1 border-b border-slate-800 pb-1">Game Stream</div>
              {logs.map((log, i) => (
                <div key={i} className={i === 0 ? 'text-amber-400 font-semibold' : ''}>{log}</div>
              ))}
            </div>
          </div>

          {/* 15x15 LUDO BOARD GRID */}
          <div className="relative w-full max-w-[600px] aspect-square bg-slate-900 border-4 border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* GRID BACKGROUND BASES */}
            <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-red-600/20 border-r-2 border-b-2 border-slate-800 p-4 flex items-center justify-center">
              <div className="w-full h-full bg-red-600 rounded-xl border-2 border-white/30" />
            </div>
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-green-600/20 border-l-2 border-b-2 border-slate-800 p-4 flex items-center justify-center">
              <div className="w-full h-full bg-green-600 rounded-xl border-2 border-white/30" />
            </div>
            <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-yellow-600/20 border-l-2 border-t-2 border-slate-800 p-4 flex items-center justify-center">
              <div className="w-full h-full bg-yellow-600 rounded-xl border-2 border-white/30" />
            </div>
            <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-600/20 border-r-2 border-t-2 border-slate-800 p-4 flex items-center justify-center">
              <div className="w-full h-full bg-blue-600 rounded-xl border-2 border-white/30" />
            </div>

            {/* CENTER FINISH TROPHY ZONE */}
            <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-slate-950 border-2 border-slate-700 flex items-center justify-center font-extrabold text-2xl text-amber-400 shadow-inner z-0">
              🏆
            </div>

            {/* TOKENS LAYER */}
            {Object.keys(tokens).map(c => {
              const color = c as PlayerColor;
              return tokens[color].map(token => {
                const coord = getTokenCoords(token);
                const isClickable = activeColor === color && diceValue !== null && !activePlayer.isAI;

                const sameCellCount = Object.values(tokens)
                  .flat()
                  .filter(t => t.position === token.position && t.position !== -1 && t.position !== 999).length;

                const offset = sameCellCount > 1 ? (token.id % 2 === 0 ? -1.2 : 1.2) : 0;

                return (
                  <button
                    key={`${token.color}-${token.id}`}
                    onClick={() => isClickable && executeMove(token, diceValue)}
                    disabled={!isClickable}
                    style={{
                      left: `${((coord.x + 0.5 + offset / 4) / 15) * 100}%`,
                      top: `${((coord.y + 0.5 + offset / 4) / 15) * 100}%`,
                    }}
                    className={`absolute w-[5.2%] h-[5.2%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-[10px] transition-all z-20 ${
                      token.color === 'red'
                        ? 'bg-red-600'
                        : token.color === 'green'
                        ? 'bg-green-600'
                        : token.color === 'yellow'
                        ? 'bg-yellow-500 text-slate-950'
                        : 'bg-blue-600'
                    } ${isClickable ? 'ring-4 ring-white animate-bounce cursor-pointer' : ''}`}
                  >
                    {token.id + 1}
                  </button>
                );
              });
            })}
          </div>
        </>
      )}

      {/* WINNER OVERLAY */}
      {winner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-3">👑</div>
            <h2 className="text-2xl font-extrabold text-amber-400 mb-2">{PLAYERS_CONFIG[winner].name} WINS!</h2>
            <p className="text-slate-300 text-sm mb-6">
              {winner === 'red' ? `You earned $${(stake * 3.6).toFixed(0)}!` : 'Better luck next time!'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-lg hover:brightness-110 transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
