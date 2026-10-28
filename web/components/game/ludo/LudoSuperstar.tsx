"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";import { AnimatePresence, motion } from "framer-motion";

type Color = "red" | "blue" | "yellow" | "green";
type GameMode = "classic" | "quick" | "compact";

type Token = { step: number };
type Player = {
  color: Color;
  name: string;
  flag: string;
  avatar: string;
  tokens: Token[];
};

interface LudoSuperstarProps {
  balance: number;
  onWin: (amount: number) => void;
  onLose: (amount: number) => void;
}

const COLORS: Record<Color, string> = {
  red: "#ed342d",
  blue: "#0879d8",
  yellow: "#ffc52c",
  green: "#07932d",
};

const ORDER: Color[] = ["red", "blue", "yellow", "green"];
const START: Record<Color, number> = {
  red: 19,
  blue: 32,
  yellow: 45,
  green: 6,
};
const TRACK_LENGTH = 52;
const FINISH = 57;
const SAFE = new Set([1, 6, 14, 19, 27, 32, 40, 45]);

const TRACK: [number, number][] = [
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
  [0, 7], [0, 6],
];

const HOME_PATHS: Record<Color, [number, number][]> = {
  red: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
};

// Precise base positions for token circles inside home cards
const BASE_CELLS: Record<Color, [number, number][]> = {
  green: [[1, 1], [4, 1], [1, 4], [4, 4]],
  yellow: [[10, 1], [13, 1], [10, 4], [13, 4]],
  red: [[1, 10], [4, 10], [1, 13], [4, 13]],
  blue: [[10, 10], [13, 10], [10, 13], [13, 13]],
};

function createPlayers(mode: GameMode = "classic"): Player[] {
  // In Quick mode, 2 tokens start out at step 0 (already unlocked)
  const initialTokens = (stepOverride: number) => Array.from({ length: 4 }, (_, i) => ({
    step: mode === "quick" && i < 2 ? 0 : stepOverride,
  }));

  return [
    { color: "red", name: "You", flag: "🇳🇬", avatar: "👑", tokens: initialTokens(-1) },
    { color: "blue", name: "Zaki", flag: "🇳🇬", avatar: "🧙", tokens: initialTokens(-1) },
    { color: "yellow", name: "Martin", flag: "🇮🇳", avatar: "🦁", tokens: initialTokens(-1) },
    { color: "green", name: "Aero", flag: "🇬🇧", avatar: "👹", tokens: initialTokens(-1) },
  ];
}

function trackPosition(color: Color, step: number): [number, number] {
  if (step < 0) return [0, 0];
  if (step === 0) {
    // Exact starting home gate tile for each color
    const gates: Record<Color, [number, number]> = {
      green: [1, 6],
      yellow: [8, 1],
      red: [6, 13],
      blue: [13, 8],
    };
    return gates[color];
  }
  if (step >= 51) {
    const homeIdx = Math.min(step - 51, 5);
    return HOME_PATHS[color][homeIdx];
  }
  return TRACK[(START[color] + (step - 1)) % TRACK_LENGTH];
}

function DiceButton({
  roll,
  rolling,
  onClick,
  disabled,
}: {
  roll?: number;
  rolling?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const renderDots = (value: number) => {
    const dots: { x: string; y: string }[] = [];
    if (value === 1 || value === 3 || value === 5) dots.push({ x: "50%", y: "50%" });
    if (value >= 2) { dots.push({ x: "22%", y: "22%" }, { x: "78%", y: "78%" }); }
    if (value >= 4) { dots.push({ x: "78%", y: "22%" }, { x: "22%", y: "78%" }); }
    if (value === 6) { dots.push({ x: "22%", y: "50%" }, { x: "78%", y: "50%" }); }

    return dots.map((dot, index) => (
      <div
        key={index}
        className="absolute h-2 w-2 rounded-full bg-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
        style={{ left: dot.x, top: dot.y, transform: "translate(-50%, -50%)" }}
      />
    ));
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || rolling}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center focus:outline-none cursor-pointer"
    >
      <motion.div
        animate={
          rolling
            ? { rotateX: [0, 360, 720], rotateY: [0, 360, 720], scale: [1, 1.15, 1] }
            : { rotateX: 0, rotateY: 0, scale: 1 }
        }
        transition={
          rolling
            ? { duration: 0.5, repeat: Infinity, ease: "linear" }
            : { type: "spring", stiffness: 300, damping: 20 }
        }
        className="relative h-full w-full rounded-xl border-2 border-white/90 bg-gradient-to-br from-white via-slate-100 to-slate-300 shadow-[0_6px_16px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-4px_6px_rgba(0,0,0,0.25)] overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-xl" />
        <div className="relative h-full w-full">{renderDots(roll || 1)}</div>
      </motion.div>
    </motion.button>
  );
}

function PlayerPanel({
  player,
  active,
  dice,
  rolling,
  canRoll,
  onRoll,
}: {
  player: Player;
  active: boolean;
  dice: number;
  rolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
}) {
  const homeCount = player.tokens.filter((token) => token.step === FINISH).length;

  return (
    <div
      className="flex min-w-0 items-center gap-1.5 rounded-xl border px-1.5 py-1.5 sm:gap-2 sm:px-2 transition-all duration-200"
      style={{
        background: active ? COLORS[player.color] + "35" : "#17164fbd",
        borderColor: active ? COLORS[player.color] : "#ffffff22",
        boxShadow: active ? `0 0 14px ${COLORS[player.color]}40` : undefined,
      }}
    >
      <DiceButton roll={dice} rolling={rolling} disabled={!canRoll} onClick={onRoll} />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/40 text-lg sm:h-9 sm:w-9 shadow-sm"
          style={{ background: COLORS[player.color] }}
        >
          {player.avatar}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-black sm:text-[11px] text-white">
            {player.flag} {player.name}
          </div>
          <div className="mt-0.5 text-[8px] text-white/70 font-semibold">{homeCount}/4 home</div>
        </div>
      </div>
      {active && (
        <span
          className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full shadow-sm"
          style={{ background: COLORS[player.color] }}
        />
      )}
    </div>
  );
}

function Token3DPiece({
  color,
  enabled,
  onClick,
}: {
  color: Color;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={`relative flex h-[88%] w-[88%] items-center justify-center rounded-full transition-transform active:scale-90 ${
        enabled ? "cursor-pointer animate-bounce" : "cursor-default"
      }`}
    >
      <div
        className="h-full w-full rounded-full border-2 border-white/90 text-[clamp(9px,2.2vw,16px)] font-black text-white flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${COLORS[color]} 35%, #0f172a 100%)`,
          boxShadow: `0 4px 8px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.8), 0 0 8px ${
            enabled ? COLORS[color] : "transparent"
          }`,
        }}
      >
        ♟
      </div>
    </button>
  );
}

function HighFidelityBoard({
  players,
  turn,
  canMove,
  onMove,
}: {
  players: Player[];
  turn: Color;
  canMove: boolean;
  onMove: (color: Color, index: number) => void;
}) {
  const tokenMap = useMemo(() => {
    const map = new Map<string, Array<{ color: Color; index: number }>>();
    players.forEach((player) => {
      player.tokens.forEach((token, index) => {
        if (token.step < 0 || token.step >= FINISH) return;
        const [x, y] = trackPosition(player.color, token.step);
        const key = `${x},${y}`;
        map.set(key, [...(map.get(key) ?? []), { color: player.color, index }]);
      });
    });
    return map;
  }, [players]);

  const baseTokenMap = useMemo(() => {
    const map = new Map<string, { color: Color; index: number }>();
    players.forEach((player) => {
      const baseCoords = BASE_CELLS[player.color];
      player.tokens.forEach((token, index) => {
        if (token.step === -1 && baseCoords[index]) {
          const [bx, by] = baseCoords[index];
          map.set(`${bx},${by}`, { color: player.color, index });
        }
      });
    });
    return map;
  }, [players]);

  const homeCells = useMemo(() => {
    const map = new Map<string, Color>();
    Object.entries(HOME_PATHS).forEach(([color, cells]) => {
      cells.forEach(([x, y]) => map.set(`${x},${y}`, color as Color));
    });
    return map;
  }, []);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[24px] border-4 border-[#b99151] bg-[#ffffff] p-[2px] shadow-[0_12px_32px_rgba(0,0,0,0.6)] select-none">
      <div className="grid h-full w-full grid-cols-15 grid-rows-15">
        {Array.from({ length: 225 }, (_, index) => {
          const x = index % 15;
          const y = Math.floor(index / 15);
          const key = `${x},${y}`;

          const isGreenBase = x < 6 && y < 6;
          const isYellowBase = x > 8 && y < 6;
          const isRedBase = x < 6 && y > 8;
          const isBlueBase = x > 8 && y > 8;

          const homeColor = homeCells.get(key);
          const trackIndex = TRACK.findIndex(([tx, ty]) => tx === x && ty === y);
          const isTrack = trackIndex >= 0;
          const center = x >= 6 && x <= 8 && y >= 6 && y <= 8;

          let cellBg = "#ffffff";
          if (isGreenBase) cellBg = COLORS.green;
          else if (isYellowBase) cellBg = COLORS.yellow;
          else if (isRedBase) cellBg = COLORS.red;
          else if (isBlueBase) cellBg = COLORS.blue;
          else if (homeColor) cellBg = COLORS[homeColor];

          const trackTokens = tokenMap.get(key) ?? [];

          if (isGreenBase || isYellowBase || isRedBase || isBlueBase) {
            const isBaseTopLeft =
              (isGreenBase && x === 0 && y === 0) ||
              (isYellowBase && x === 9 && y === 0) ||
              (isRedBase && x === 0 && y === 9) ||
              (isBlueBase && x === 9 && y === 9);

            if (!isBaseTopLeft) return null;

            const baseColor: Color = isGreenBase
              ? "green"
              : isYellowBase
              ? "yellow"
              : isRedBase
              ? "red"
              : "blue";

            return (
              <div
                key={key}
                className="col-span-6 row-span-6 relative flex items-center justify-center p-3"
                style={{ background: COLORS[baseColor] }}
              >
                <div className="relative h-full w-full rounded-[28%] bg-white p-3 shadow-md grid grid-cols-2 grid-rows-2 gap-3 items-center justify-items-center">
                  {BASE_CELLS[baseColor].map(([bx, by], slotIdx) => {
                    const slotKey = `${bx},${by}`;
                    const slotToken = baseTokenMap.get(slotKey);
                    return (
                      <div
                        key={slotIdx}
                        className="relative flex h-full w-full max-h-[80%] max-w-[80%] items-center justify-center rounded-full"
                        style={{ background: COLORS[baseColor] }}
                      >
                        {slotToken && (
                          <Token3DPiece
                            color={slotToken.color}
                            enabled={canMove && slotToken.color === turn}
                            onClick={() => onMove(slotToken.color, slotToken.index)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <div
              key={key}
              className="relative flex items-center justify-center border-[0.5px] border-slate-300"
              style={{ background: cellBg }}
            >
              {SAFE.has(trackIndex) && isTrack && (
                <span
                  className="relative z-[1] text-[clamp(10px,2vw,16px)] font-black"
                  style={{
                    color:
                      trackIndex === 6
                        ? COLORS.green
                        : trackIndex === 19
                        ? COLORS.red
                        : trackIndex === 32
                        ? COLORS.blue
                        : trackIndex === 45
                        ? COLORS.yellow
                        : "#f59e0b",
                  }}
                >
                  ★
                </span>
              )}

              {center && (
                <svg viewBox="0 0 3 3" className="absolute inset-0 h-full w-full">
                  <polygon points="0,0 3,0 1.5,1.5" fill={COLORS.yellow} />
                  <polygon points="3,0 3,3 1.5,1.5" fill={COLORS.blue} />
                  <polygon points="3,3 0,3 1.5,1.5" fill={COLORS.red} />
                  <polygon points="0,3 0,0 1.5,1.5" fill={COLORS.green} />
                </svg>
              )}

              {trackTokens.map((piece, pieceIndex) => (
                <div
                  key={`${piece.color}-${piece.index}`}
                  className="absolute z-30 flex h-full w-full items-center justify-center p-[1px]"
                  style={{ transform: `translate(${pieceIndex * 10}%, ${pieceIndex * 10}%)` }}
                >
                  <Token3DPiece
                    color={piece.color}
                    enabled={canMove && piece.color === turn}
                    onClick={() => onMove(piece.color, piece.index)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LudoSuperstar({ balance, onWin, onLose }: LudoSuperstarProps) {
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [players, setPlayers] = useState<Player[]>(() => createPlayers("classic"));
  const [turn, setTurn] = useState<Color>("red");
  const [dice, setDice] = useState<Record<Color, number>>({ red: 1, blue: 1, yellow: 1, green: 1 });
  const [rolling, setRolling] = useState(false);
  const [rolled, setRolled] = useState(false);
  const [message, setMessage] = useState("Roll the dice to begin");
  const [winner, setWinner] = useState<Color | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wager, setWager] = useState(100);
  const [settled, setSettled] = useState(false);

  const current = players.find((player) => player.color === turn)!;
  const value = dice[turn];

  const nextTurn = useCallback(() => {
    setTurn((old) => ORDER[(ORDER.indexOf(old) + 1) % ORDER.length]);
    setRolled(false);
  }, []);

  const moveToken = useCallback(
    (color: Color, index: number) => {
      if (color !== turn || !rolled || rolling || winner) return;

      const result = dice[color];
      const player = players.find((p) => p.color === color)!;
      const token = player.tokens[index];

      if (!token || token.step === FINISH) return;
      if (token.step === -1 && result !== 6) return;

      const destination = token.step === -1 ? 0 : token.step + result;
      if (destination > FINISH) return;

      const updated = players.map((p) => ({
        ...p,
        tokens: p.tokens.map((t) => ({ ...t })),
      }));
      const movingPlayer = updated.find((p) => p.color === color)!;
      movingPlayer.tokens[index].step = destination;

      let captured = false;

      if (destination < 51) {
        const [tx, ty] = trackPosition(color, destination);
        const globalCell = (START[color] + destination) % TRACK_LENGTH;

        if (!SAFE.has(globalCell)) {
          updated.forEach((opponent) => {
            if (opponent.color === color) return;
            opponent.tokens.forEach((other) => {
              if (other.step < 0 || other.step >= 51) return;
              const [ox, oy] = trackPosition(opponent.color, other.step);
              if (ox === tx && oy === ty) {
                other.step = -1;
                captured = true;
              }
            });
          });
        }
      }

      setPlayers(updated);

      if (movingPlayer.tokens.every((t) => t.step === FINISH)) {
        setWinner(color);
        setMessage(`${movingPlayer.name} wins!`);

        if (!settled) {
          setSettled(true);
          if (color === "red") {
            onWin(wager * 2);
          } else {
            onLose(wager);
          }
        }
        return;
      }

      setMessage(
        destination === FINISH
          ? "Token reached home!"
          : captured
          ? "Captured opponent! Rolling again."
          : "Token moved."
      );

      if (result === 6 || captured || destination === FINISH) {
        setRolled(false);
      } else {
        nextTurn();
      }
    },
    [dice, nextTurn, onLose, onWin, players, rolled, rolling, settled, turn, wager, winner]
  );

  // Automated AI Turn Handler
  useEffect(() => {
    if (turn === "red" || winner) return;

    const timer = window.setTimeout(() => {
      const aiResult = Math.floor(Math.random() * 6) + 1;
      setDice((old) => ({ ...old, [turn]: aiResult }));
      setMessage(`${current.name} rolled a ${aiResult}`);

      const aiMovable = current.tokens
        .map((token, index) => {
          if (token.step === FINISH) return -1;
          if (token.step === -1) return aiResult === 6 ? index : -1;
          return token.step + aiResult <= FINISH ? index : -1;
        })
        .filter((index) => index >= 0);

      if (aiMovable.length > 0) {
        const chosenTokenIndex = aiMovable[0];
        window.setTimeout(() => {
          moveToken(turn, chosenTokenIndex);
        }, 800);
      } else {
        window.setTimeout(nextTurn, 1000);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [turn, winner, current, moveToken, nextTurn]);

  const movable = useMemo(
    () =>
      current.tokens
        .map((token, index) => {
          if (token.step === FINISH) return -1;
          if (token.step === -1) return value === 6 ? index : -1;
          return token.step + value <= FINISH ? index : -1;
        })
        .filter((index) => index >= 0),
    [current, value]
  );

  const switchGameMode = (mode: GameMode) => {
    setGameMode(mode);
    setPlayers(createPlayers(mode));
    setTurn("red");
    setDice({ red: 1, blue: 1, yellow: 1, green: 1 });
    setRolling(false);
    setRolled(false);
    setWinner(null);
    setSettled(false);
    setMessage(`Switched to ${mode.toUpperCase()} Ludo mode!`);
  };

  const roll = useCallback(() => {
    if (rolling || rolled || winner) return;

    setRolling(true);
    const result = Math.floor(Math.random() * 6) + 1;

    window.setTimeout(() => {
      setDice((old) => ({ ...old, [turn]: result }));
      setRolling(false);
      setRolled(true);
      setMessage(`${current.name} rolled a ${result}`);

      const canMove = current.tokens.some((token) =>
        token.step === -1
          ? result === 6
          : token.step !== FINISH && token.step + result <= FINISH
      );

      if (!canMove) {
        setMessage(result === 6 ? "No move available. Roll again!" : "No available move.");
        if (result === 6) setRolled(false);
        else window.setTimeout(nextTurn, 700);
      }
    }, 700);
  }, [current, nextTurn, rolling, rolled, turn, winner]);

  const restart = () => {
    setPlayers(createPlayers(gameMode));
    setTurn("red");
    setDice({ red: 1, blue: 1, yellow: 1, green: 1 });
    setRolling(false);
    setRolled(false);
    setWinner(null);
    setSettled(false);
    setMessage("New game started");
  };

  return (
    <main className="relative flex h-[100dvh] w-full flex-col items-center justify-between overflow-hidden bg-[#0F172A] p-2 select-none">
      {/* Header */}
      <header className="flex shrink-0 w-full max-w-md items-center justify-between gap-2 px-2 pt-1">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMenuOpen((v) => !v)} className="h-9 w-9 rounded-lg bg-white/15 text-xl text-white">
            ☰
          </button>
          <button onClick={() => setMessage("Trophy room")} className="h-9 w-9 rounded-lg bg-white/15 text-white">🏆</button>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#15114f] px-3 py-1 text-sm font-black text-white border border-white/10">
          <span className="text-xl">💎</span>
          {Math.floor(balance).toLocaleString()}
        </div>
      </header>

      {/* Top Players (Green & Yellow) */}
      <div className="grid shrink-0 w-full max-w-md grid-cols-2 gap-2 px-1 py-1">
        {(["green", "yellow"] as Color[]).map((color) => (
          <PlayerPanel
            key={color}
            player={players.find((p) => p.color === color)!}
            active={turn === color}
            dice={dice[color]}
            rolling={rolling && turn === color}
            canRoll={turn === color && !rolled && !winner}
            onRoll={roll}
          />
        ))}
      </div>
      {/* Board Container */}
      <div className="relative flex w-full max-w-[min(100vw-16px,calc(100dvh-280px))] aspect-square items-center justify-center my-auto">
        <div className="absolute inset-0 rounded-[24px] bg-[#1E293B]/80 backdrop-blur-md p-2 shadow-2xl border border-white/10 flex items-center justify-center">
          <HighFidelityBoard
            players={players}
            turn={turn}
            canMove={rolled && movable.length > 0}
            onMove={moveToken}
          />
        </div>
      </div>

      {/* Bottom Players (Red & Blue) */}
      <div className="grid shrink-0 w-full max-w-md grid-cols-2 gap-2 px-1 py-1">
        {(["red", "blue"] as Color[]).map((color) => (
          <PlayerPanel
            key={color}
            player={players.find((p) => p.color === color)!}
            active={turn === color}
            dice={dice[color]}
            rolling={rolling && turn === color}
            canRoll={turn === color && !rolled && !winner}
            onRoll={roll}
          />
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex shrink-0 w-full max-w-md items-center justify-between gap-2 px-1 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-300 bg-red-800 text-xl">👑</div>
          <button onClick={() => setMessage("Emoji list")} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black text-white">EMOJI</button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={restart} className="h-9 w-9 rounded-lg bg-white/15 text-lg text-white">↻</button>
        </div>
      </div>

      {/* Menu Drawer & Winner Modal */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-3 top-14 z-50 w-56 rounded-2xl border border-white/20 bg-[#1E293B] p-4 shadow-2xl text-white"
          >
            <div className="mb-3 font-black text-sm">Select Ludo Mode</div>
            <div className="flex flex-col gap-1.5">
              {(["classic", "quick", "compact"] as GameMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { switchGameMode(m); setMenuOpen(false); }}
                  className={`rounded-lg p-2 text-left text-xs font-bold capitalize ${
                    gameMode === m ? "bg-amber-500 text-slate-950" : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {m} Ludo
                </button>
              ))}
            </div>
            <button onClick={() => setMenuOpen(false)} className="mt-4 w-full rounded-lg bg-white/10 p-2 text-xs">Close</button>
          </motion.div>
        )}
        {winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
          >
            <div className="w-full max-w-xs rounded-3xl border border-white/20 bg-[#1E293B] p-6 text-center shadow-2xl text-white">
              <div className="text-5xl">🏆</div>
              <h2 className="mt-3 text-2xl font-black" style={{ color: COLORS[winner] }}>
                {winner.toUpperCase()} WINS!
              </h2>
              <button onClick={restart} className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950">
                Play again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute left-1/2 top-[12%] z-40 max-w-[90%] -translate-x-1/2 truncate rounded-full border border-white/10 bg-[#0F172A]/90 px-3 py-1 text-center text-[10px] font-bold text-white shadow-lg">
        {message}
      </div>
    </main>
  );
}
