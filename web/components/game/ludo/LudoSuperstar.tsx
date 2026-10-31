import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trophy,
  Volume2,
  VolumeX,
  RotateCcw,
  Bot,
  Zap,
  Gem,
  ArrowLeft,
  Settings,
  Flame,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';

// --- TYPES & INTERFACES ---
type PlayerColor = 'green' | 'yellow' | 'blue' | 'red';

interface Token {
  id: number;
  color: PlayerColor;
  step: number; // -1 = home base, 0 to 50 = common track, 51 to 56 = home path / finished
}

interface Player {
  id: PlayerColor;
  name: string;
  avatar: string;
  tokens: Token[];
  isAi: boolean;
  score: number;
  flag: string;
}

// --- CONSTANTS & PATHMAPS ---
const START_INDEX: Record<PlayerColor, number> = {
  green: 0,
  yellow: 13,
  blue: 26,
  red: 39,
};

// Safe spots on the standard 52-tile board
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

// 52 common path tile coordinates mapped to a 15x15 grid (0-indexed)
const COMMON_PATH_GRID: [number, number][] = [
  // Green start & track (0 - 11)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  // Yellow start & track (12 - 24)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  // Blue start & track (25 - 37)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  // Red start & track (38 - 50)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0]
];

// Home stretch tiles (5 tiles per color) leading to center triangle (56)
const HOME_PATHS: Record<PlayerColor, [number, number][]> = {
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  red: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

const COLOR_MAP: Record<PlayerColor, { bg: string; border: string; glow: string; fill: string }> = {
  green: { bg: '#10B981', border: '#059669', glow: 'rgba(16, 185, 129, 0.5)', fill: '#047857' },
  yellow: { bg: '#F59E0B', border: '#D97706', glow: 'rgba(245, 158, 11, 0.5)', fill: '#B45309' },
  blue: { bg: '#3B82F6', border: '#1D4ED8', glow: 'rgba(59, 130, 246, 0.5)', fill: '#1E40AF' },
  red: { bg: '#EF4444', border: '#B91C1C', glow: 'rgba(239, 68, 68, 0.5)', fill: '#991B1B' }
};

interface LudoGameProps {
  balance?: number;
  onWin?: (amount: number) => void;
  onLose?: (amount: number) => void;
}

export default function LudoGame({ balance, onWin, onLose }: LudoGameProps) {
  // --- STATES ---
  const [stakeAmount, setStakeAmount] = useState<number>(500);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [turn, setTurn] = useState<PlayerColor>('green');
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [canRoll, setCanRoll] = useState<boolean>(true);
  const [movableTokens, setMovableTokens] = useState<number[]>([]);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [timer, setTimer] = useState<number>(30);

  const [players, setPlayers] = useState<Record<PlayerColor, Player>>({
    green: {
      id: 'green',
      name: 'Manish',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      isAi: true,
      score: 0,
      flag: '🇮🇳',
      tokens: [
        { id: 0, color: 'green', step: -1 },
        { id: 1, color: 'green', step: -1 },
        { id: 2, color: 'green', step: -1 },
        { id: 3, color: 'green', step: -1 }
      ]
    },
    yellow: {
      id: 'yellow',
      name: 'Miray',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      isAi: true,
      score: 0,
      flag: '🇺🇸',
      tokens: [
        { id: 0, color: 'yellow', step: -1 },
        { id: 1, color: 'yellow', step: -1 },
        { id: 2, color: 'yellow', step: -1 },
        { id: 3, color: 'yellow', step: -1 }
      ]
    },
    red: {
      id: 'red',
      name: 'YOU',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      isAi: false,
      score: 0,
      flag: '🇳🇬',
      tokens: [
        { id: 0, color: 'red', step: -1 },
        { id: 1, color: 'red', step: -1 },
        { id: 2, color: 'red', step: -1 },
        { id: 3, color: 'red', step: -1 }
      ]
    },
    blue: {
      id: 'blue',
      name: 'Azeel',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      isAi: true,
      score: 0,
      flag: '🇸🇦',
      tokens: [
        { id: 0, color: 'blue', step: -1 },
        { id: 1, color: 'blue', step: -1 },
        { id: 2, color: 'blue', step: -1 },
        { id: 3, color: 'blue', step: -1 }
      ]
    }
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound generator effect helper
  const playSound = (freq = 440, type: OscillatorType = 'sine', duration = 0.1) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio errors if restricted by browser context
    }
  };

  // Next player order counterclockwise / around board
  const getNextTurn = (current: PlayerColor): PlayerColor => {
    const order: PlayerColor[] = ['green', 'yellow', 'blue', 'red'];
    const idx = order.indexOf(current);
    return order[(idx + 1) % 4];
  };

  // --- 30s TIMER SYSTEM ---
  useEffect(() => {
    if (!gameStarted || winner) return;

    setTimer(30);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Trigger Auto-Play AI Help for YOU or AI
          handleTimeoutAssist();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [turn, canRoll, movableTokens, gameStarted, winner]);

  // Assist action when 30 seconds run out
  const handleTimeoutAssist = () => {
    if (canRoll) {
      rollDice();
    } else if (movableTokens.length > 0) {
      // Picks first legal token to move
      moveToken(turn, movableTokens[0]);
    }
  };

  // Check valid moves for a player given rolled dice
  const calculateMovableTokens = (playerColor: PlayerColor, rolledValue: number): number[] => {
    const player = players[playerColor];
    const movables: number[] = [];

    player.tokens.forEach((t) => {
      if (t.step === -1) {
        if (rolledValue === 6) movables.push(t.id);
      } else if (t.step + rolledValue <= 56) {
        movables.push(t.id);
      }
    });

    return movables;
  };

  // Execution of dice roll
  const rollDice = () => {
    if (!canRoll || isRolling || winner) return;

    setIsRolling(true);
    playSound(600, 'triangle', 0.2);

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);
      setCanRoll(false);

      const validTokens = calculateMovableTokens(turn, rolled);
      setMovableTokens(validTokens);

      if (validTokens.length === 0) {
        // No legal move, pass turn after brief pause
        setTimeout(() => {
          passTurn(false);
        }, 1000);
      } else if (players[turn].isAi) {
        // AI Auto Move choice
        setTimeout(() => {
          const chosenTokenId = validTokens[Math.floor(Math.random() * validTokens.length)];
          moveToken(turn, chosenTokenId, rolled);
        }, 800);
      }
    }, 600);
  };

  // Pass Turn state handler
  const passTurn = (extraTurn = false) => {
    if (!extraTurn) {
      setTurn(getNextTurn(turn));
    }
    setCanRoll(true);
    setMovableTokens([]);
    setDiceValue(null);
  };

  // Move token logic & collision detection
  const moveToken = (playerColor: PlayerColor, tokenId: number, overrideRoll?: number) => {
    const value = overrideRoll || diceValue;
    if (!value) return;

    playSound(800, 'sine', 0.15);

    setPlayers((prev) => {
      const updated = { ...prev };
      const player = { ...updated[playerColor] };
      const tokens = [...player.tokens];
      const targetToken = { ...tokens[tokenId] };

      let nextStep = targetToken.step;
      if (nextStep === -1) {
        nextStep = 0; // Move out of base onto start tile
      } else {
        nextStep += value;
      }

      targetToken.step = nextStep;
      tokens[tokenId] = targetToken;
      player.tokens = tokens;
      updated[playerColor] = player;

      // Check for capturing opposing tokens (if not on safe spot or home path)
      if (nextStep >= 0 && nextStep <= 50) {
        const globalTile = (START_INDEX[playerColor] + nextStep) % 52;

        if (!SAFE_SPOTS.includes(globalTile)) {
          Object.keys(updated).forEach((key) => {
            const oppColor = key as PlayerColor;
            if (oppColor !== playerColor) {
              const oppPlayer = { ...updated[oppColor] };
              const oppTokens = oppPlayer.tokens.map((t) => {
                if (t.step >= 0 && t.step <= 50) {
                  const oppGlobalTile = (START_INDEX[oppColor] + t.step) % 52;
                  if (oppGlobalTile === globalTile) {
                    playSound(200, 'sawtooth', 0.4); // Capture sound
                    return { ...t, step: -1 }; // Reset captured token to home base
                  }
                }
                return t;
              });
              oppPlayer.tokens = oppTokens;
              updated[oppColor] = oppPlayer;
            }
          });
        }
      }

      // Check win condition
      const allFinished = tokens.every((t) => t.step === 56);
      if (allFinished) {
        setWinner(playerColor);
        playSound(1200, 'sine', 0.8);
      }

      return updated;
    });

    // Bonus roll on 6 or capturing
    const gotSix = value === 6;
    setTimeout(() => {
      passTurn(gotSix);
    }, 400);
  };

  // Auto trigger AI roll if turn belongs to AI player
  useEffect(() => {
    if (gameStarted && players[turn].isAi && canRoll && !isRolling && !winner) {
      const timer = setTimeout(() => {
        rollDice();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, canRoll, gameStarted, isRolling, winner]);

  // Convert token state to 15x15 grid coordinates
  const getTokenGridPosition = (color: PlayerColor, step: number, tokenId: number): [number, number] => {
    if (step === -1) {
      // Inside Base quad positions
      const baseOff: Record<PlayerColor, [number, number][]> = {
        green: [[2, 2], [2, 3], [3, 2], [3, 3]],
        yellow: [[2, 11], [2, 12], [3, 11], [3, 12]],
        blue: [[11, 11], [11, 12], [12, 11], [12, 12]],
        red: [[11, 2], [11, 3], [12, 2], [12, 3]]
      };
      return baseOff[color][tokenId];
    }

    if (step === 56) {
      // Center destination
      return [7, 7];
    }

    if (step >= 51 && step <= 55) {
      // Home stretch path
      return HOME_PATHS[color][step - 51];
    }

    // Common track
    const globalTileIndex = (START_INDEX[color] + step) % 52;
    return COMMON_PATH_GRID[globalTileIndex];
  };

  // Dynamic 2x2 multi-token clustering offset calculation to eliminate overlapping
  const getAllTokensAtPosition = (r: number, c: number) => {
    const list: { color: PlayerColor; id: number }[] = [];
    (Object.keys(players) as PlayerColor[]).forEach((col) => {
      players[col].tokens.forEach((t) => {
        const [tr, tc] = getTokenGridPosition(col, t.step, t.id);
        if (tr === r && tc === c) {
          list.push({ color: col, id: t.id });
        }
      });
    });
    return list;
  };

  // --- AAA 3D GLASS TRANSPARENT DICE COMPONENT ---
  const render3DDice = (playerColor: PlayerColor) => {
    const isActive = turn === playerColor;
    const isPlayerRolling = isActive && isRolling;

    return (
      <div className={`relative flex items-center justify-center transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-40 grayscale-[40%]'}`}>
        <button
          onClick={() => isActive && canRoll && rollDice()}
          disabled={!isActive || !canRoll || isRolling}
          className={`w-14 h-14 rounded-2xl relative cursor-pointer transform-gpu transition-all duration-300 flex items-center justify-center border-2 border-white/20 backdrop-blur-md shadow-2xl ${
            isActive ? 'ring-4 ring-orange-500 ring-offset-2 ring-offset-slate-900 shadow-orange-500/50' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.05) 100%)',
            boxShadow: isActive ? '0 10px 25px -5px rgba(249, 115, 22, 0.6), inset 0 2px 4px rgba(255,255,255,0.8)' : 'inset 0 2px 4px rgba(255,255,255,0.3)'
          }}
        >
          {/* Real 3D dice dots pattern (pips) */}
          <div className={`w-full h-full flex flex-col items-center justify-between p-2.5 transition-transform duration-500 ${isPlayerRolling ? 'animate-spin' : ''}`}>
            {diceValue === 1 && (
              <div className="w-full h-full flex items-center justify-center">
                <span className="w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,1)]"></span>
              </div>
            )}
            {diceValue === 2 && (
              <div className="w-full h-full flex justify-between items-center rotate-45">
                <span className="w-3 h-3 bg-white rounded-full shadow-md"></span>
                <span className="w-3 h-3 bg-white rounded-full shadow-md"></span>
              </div>
            )}
            {diceValue === 3 && (
              <div className="w-full h-full flex justify-between items-center rotate-45">
                <span className="w-2.5 h-2.5 bg-white rounded-full shadow-md"></span>
                <span className="w-2.5 h-2.5 bg-white rounded-full shadow-md"></span>
                <span className="w-2.5 h-2.5 bg-white rounded-full shadow-md"></span>
              </div>
            )}
            {diceValue === 4 && (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex justify-between"><span className="w-2.5 h-2.5 bg-white rounded-full"></span><span className="w-2.5 h-2.5 bg-white rounded-full"></span></div>
                <div className="flex justify-between"><span className="w-2.5 h-2.5 bg-white rounded-full"></span><span className="w-2.5 h-2.5 bg-white rounded-full"></span></div>
              </div>
            )}
            {diceValue === 5 && (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex justify-between"><span className="w-2.5 h-2.5 bg-white rounded-full"></span><span className="w-2.5 h-2.5 bg-white rounded-full"></span></div>
                <div className="flex justify-center"><span className="w-2.5 h-2.5 bg-white rounded-full"></span></div>
                <div className="flex justify-between"><span className="w-2.5 h-2.5 bg-white rounded-full"></span><span className="w-2.5 h-2.5 bg-white rounded-full"></span></div>
              </div>
            )}
            {diceValue === 6 && (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex justify-between"><span className="w-2.5 h-2.5 bg-white rounded-full"></span><span className="w-2.5 h-2.5 bg-white rounded-full"></span></div>
                <div className="flex justify-between"><span className="w-2.5 h-2.5 bg-white rounded-full"></span><span className="w-2.5 h-2.5 bg-white rounded-full"></span></div>
                <div className="flex justify-between"><span className="w-2.5 h-2.5 bg-white rounded-full"></span><span className="w-2.5 h-2.5 bg-white rounded-full"></span></div>
              </div>
            )}
            {!diceValue && (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white/80 animate-pulse" />
              </div>
            )}
          </div>
        </button>

        {/* Dynamic turn highlight badge */}
        {isActive && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-[10px] font-black px-1.5 py-0.5 rounded-full text-white shadow-lg animate-bounce">
            ROLL
          </div>
        )}
      </div>
    );
  };

  // --- PLAYER PROFILE DOCK ---
  const renderPlayerProfile = (color: PlayerColor, extraClasses = '') => {
    const player = players[color];
    const isActive = turn === color;

    return (
      <div className={`flex items-center gap-2 p-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow-xl ${extraClasses}`}>
        {/* Dice Position beside Profile Card */}
        {render3DDice(color)}

        <div className={`relative flex items-center gap-2 p-1.5 rounded-xl transition-all ${isActive ? 'bg-slate-800/90 ring-2 ring-orange-500' : ''}`}>
          <div className="relative">
            <img src={player.avatar} alt={player.name} className="w-11 h-11 rounded-xl object-cover border-2 border-slate-600 shadow-md" />
            <span className="absolute -bottom-1 -right-1 text-xs">{player.flag}</span>
          </div>

          <div className="flex flex-col min-w-[70px]">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-xs text-white truncate max-w-[65px]">{player.name}</span>
              {player.isAi && <Bot className="w-3 h-3 text-cyan-400" />}
            </div>
            {isActive && (
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-orange-400 animate-spin" />
                <span className="text-[10px] font-bold text-orange-400">{timer}s</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-between p-2 sm:p-4 font-sans select-none overflow-x-hidden">
      {/* --- TOP BAR NAVIGATION --- */}
      <div className="w-full max-w-lg flex items-center justify-between bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-lg">
        <button className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
          <Gem className="w-4 h-4 text-cyan-400 fill-cyan-400" />
          <span className="text-xs font-black text-cyan-300">${stakeAmount * 4}</span>
          <span className="text-[10px] text-slate-500 uppercase font-bold">POT</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-xl bg-slate-800 text-slate-300">
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-400" />}
          </button>
          <button className="p-2 rounded-xl bg-slate-800 text-slate-300">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- TOP PLAYER CARDS (GREEN & YELLOW) --- */}
      <div className="w-full max-w-lg flex items-center justify-between my-2 px-1">
        {renderPlayerProfile('green')}
        {renderPlayerProfile('yellow')}
      </div>

      {/* --- REAL 5D INTERACTIVE LUDO BOARD --- */}
      <div className="relative w-full max-w-lg aspect-square bg-slate-950 rounded-3xl p-2 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-4 border-slate-800 flex items-center justify-center">
        {/* Board inner Grid Container */}
        <div className="w-full h-full grid grid-cols-15 grid-rows-15 gap-0.5 rounded-2xl overflow-hidden bg-slate-900 shadow-inner">
          {/* --- TOP LEFT: GREEN HOME BASE --- */}
          <div className="col-span-6 row-span-6 bg-emerald-600 p-3 flex items-center justify-center border-b-2 border-r-2 border-slate-900 shadow-inner">
            <div className="w-full h-full bg-white rounded-2xl shadow-2xl p-3 grid grid-cols-2 grid-rows-2 gap-3 items-center justify-items-center">
              {[0, 1, 2, 3].map((id) => (
                <div key={id} className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-500 shadow-inner flex items-center justify-center" />
              ))}
            </div>
          </div>

          {/* --- TOP MIDDLE: YELLOW HOME TRACK --- */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 bg-amber-50">
            {Array.from({ length: 18 }).map((_, i) => {
              const r = Math.floor(i / 3);
              const c = i % 3;
              const isHomePath = c === 1 && r > 0;
              const isStart = r === 1 && c === 2;
              return (
                <div
                  key={i}
                  className={`border border-slate-200/80 flex items-center justify-center ${
                    isHomePath ? 'bg-amber-400' : isStart ? 'bg-amber-400' : ''
                  }`}
                >
                  {isStart && <Shield className="w-3.5 h-3.5 text-amber-900 fill-amber-700" />}
                </div>
              );
            })}
          </div>

          {/* --- TOP RIGHT: YELLOW HOME BASE --- */}
          <div className="col-span-6 row-span-6 bg-amber-500 p-3 flex items-center justify-center border-b-2 border-l-2 border-slate-900 shadow-inner">
            <div className="w-full h-full bg-white rounded-2xl shadow-2xl p-3 grid grid-cols-2 grid-rows-2 gap-3 items-center justify-items-center">
              {[0, 1, 2, 3].map((id) => (
                <div key={id} className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-500 shadow-inner flex items-center justify-center" />
              ))}
            </div>
          </div>

          {/* --- MIDDLE LEFT: GREEN HOME TRACK --- */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 bg-emerald-50">
            {Array.from({ length: 18 }).map((_, i) => {
              const r = Math.floor(i / 6);
              const c = i % 6;
              const isHomePath = r === 1 && c > 0;
              const isStart = r === 2 && c === 1;
              return (
                <div
                  key={i}
                  className={`border border-slate-200/80 flex items-center justify-center ${
                    isHomePath ? 'bg-emerald-500' : isStart ? 'bg-emerald-500' : ''
                  }`}
                >
                  {isStart && <Shield className="w-3.5 h-3.5 text-emerald-900 fill-emerald-700" />}
                </div>
              );
            })}
          </div>

          {/* --- CENTER TRIANGLE GOAL --- */}
          <div className="col-span-3 row-span-3 relative bg-slate-900 overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
            <div className="absolute top-0 left-0 w-full h-full clip-path-center flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-amber-500 to-blue-500 opacity-80" />
            </div>
            <Trophy className="w-8 h-8 text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] z-10 animate-pulse" />
          </div>

          {/* --- MIDDLE RIGHT: BLUE HOME TRACK --- */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 bg-blue-50">
            {Array.from({ length: 18 }).map((_, i) => {
              const r = Math.floor(i / 6);
              const c = i % 6;
              const isHomePath = r === 1 && c < 5;
              const isStart = r === 0 && c === 4;
              return (
                <div
                  key={i}
                  className={`border border-slate-200/80 flex items-center justify-center ${
                    isHomePath ? 'bg-blue-500' : isStart ? 'bg-blue-500' : ''
                  }`}
                >
                  {isStart && <Shield className="w-3.5 h-3.5 text-blue-900 fill-blue-700" />}
                </div>
              );
            })}
          </div>

          {/* --- BOTTOM LEFT: RED HOME BASE --- */}
          <div className="col-span-6 row-span-6 bg-red-600 p-3 flex items-center justify-center border-t-2 border-r-2 border-slate-900 shadow-inner">
            <div className="w-full h-full bg-white rounded-2xl shadow-2xl p-3 grid grid-cols-2 grid-rows-2 gap-3 items-center justify-items-center">
              {[0, 1, 2, 3].map((id) => (
                <div key={id} className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-500 shadow-inner flex items-center justify-center" />
              ))}
            </div>
          </div>

          {/* --- BOTTOM MIDDLE: RED HOME TRACK --- */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 bg-red-50">
            {Array.from({ length: 18 }).map((_, i) => {
              const r = Math.floor(i / 3);
              const c = i % 3;
              const isHomePath = c === 1 && r < 5;
              const isStart = r === 4 && c === 0;
              return (
                <div
                  key={i}
                  className={`border border-slate-200/80 flex items-center justify-center ${
                    isHomePath ? 'bg-red-500' : isStart ? 'bg-red-500' : ''
                  }`}
                >
                  {isStart && <Shield className="w-3.5 h-3.5 text-red-900 fill-red-700" />}
                </div>
              );
            })}
          </div>

          {/* --- BOTTOM RIGHT: BLUE HOME BASE --- */}
          <div className="col-span-6 row-span-6 bg-blue-600 p-3 flex items-center justify-center border-t-2 border-l-2 border-slate-900 shadow-inner">
            <div className="w-full h-full bg-white rounded-2xl shadow-2xl p-3 grid grid-cols-2 grid-rows-2 gap-3 items-center justify-items-center">
              {[0, 1, 2, 3].map((id) => (
                <div key={id} className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-500 shadow-inner flex items-center justify-center" />
              ))}
            </div>
          </div>
        </div>

        {/* --- DYNAMIC ZERO-OVERLAP 5D TOKEN SEEDS --- */}
        {(Object.keys(players) as PlayerColor[]).map((color) =>
          players[color].tokens.map((token) => {
            const [r, c] = getTokenGridPosition(color, token.step, token.id);
            const tokensHere = getAllTokensAtPosition(r, c);
            const clusterIndex = tokensHere.findIndex((t) => t.color === color && t.id === token.id);
            const totalOnTile = tokensHere.length;

            // Offset 2x2 grid values inside single tile to avoid clipping
            let offsetX = 0;
            let offsetY = 0;
            if (totalOnTile > 1) {
              const subCols = clusterIndex % 2;
              const subRows = Math.floor(clusterIndex / 2);
              offsetX = (subCols - 0.5) * 12;
              offsetY = (subRows - 0.5) * 12;
            }

            const isMovable = turn === color && movableTokens.includes(token.id);

            return (
              <div
                key={`${color}-${token.id}`}
                onClick={() => isMovable && moveToken(color, token.id)}
                className={`absolute transition-all duration-300 ease-out flex items-center justify-center cursor-pointer z-20 ${
                  isMovable ? 'animate-bounce ring-4 ring-white rounded-full' : ''
                }`}
                style={{
                  width: `${100 / 15}%`,
                  height: `${100 / 15}%`,
                  top: `${(r / 15) * 100}%`,
                  left: `${(c / 15) * 100}%`,
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${totalOnTile > 1 ? 0.75 : 1})`
                }}
              >
                {/* 5D Tactile Pawn Rendering */}
                <div
                  className="w-7 h-7 rounded-full relative flex items-center justify-center border-2 border-white shadow-[0_5px_10px_rgba(0,0,0,0.5)]"
                  style={{
                    backgroundColor: COLOR_MAP[color].bg,
                    boxShadow: `0 4px 8px ${COLOR_MAP[color].glow}, inset 0 2px 4px rgba(255,255,255,0.8)`
                  }}
                >
                  <div className="w-3 h-3 rounded-full bg-white/40 border border-white/60" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- BOTTOM PLAYER CARDS (RED / YOU & BLUE) --- */}
      <div className="w-full max-w-lg flex items-center justify-between my-2 px-1">
        {renderPlayerProfile('red')}
        {renderPlayerProfile('blue')}
      </div>

      {/* --- STAKING & MATCH SETTINGS FOOTER --- */}
      {!gameStarted && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
            <Flame className="w-12 h-12 text-orange-500 mx-auto mb-2 animate-bounce" />
            <h2 className="text-2xl font-black text-white">LUDO MULTIPLAYER</h2>
            <p className="text-xs text-slate-400 mb-6">Select Staking Table to Enter Match</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setStakeAmount(amt)}
                  className={`p-4 rounded-2xl border-2 font-black transition-all flex flex-col items-center gap-1 ${
                    stakeAmount === amt
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400 scale-105 shadow-lg'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <Gem className="w-5 h-5 text-cyan-400" />
                  <span className="text-lg">${amt}</span>
                  <span className="text-[10px] text-slate-500">ENTRY</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setGameStarted(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 font-black text-white text-lg shadow-xl shadow-orange-500/30 hover:scale-105 transition-all"
            >
              START GAME
            </button>
          </div>
        </div>
      )}
    </div>
  );
}