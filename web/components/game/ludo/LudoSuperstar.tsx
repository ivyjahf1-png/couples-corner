"use client";

import React, { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Color = "red" | "blue" | "yellow" | "green";
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

const HOME: Record<Color, [number, number][]> = {
  red: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
};

function createPlayers(): Player[] {
  return [
    { color: "red", name: "You", flag: "🇳🇬", avatar: "👑", tokens: Array.from({ length: 4 }, () => ({ step: -1 })) },
    { color: "blue", name: "Zaki", flag: "🇳🇬", avatar: "🧙", tokens: Array.from({ length: 4 }, () => ({ step: -1 })) },
    { color: "yellow", name: "Martin", flag: "🇮🇳", avatar: "🦁", tokens: Array.from({ length: 4 }, () => ({ step: -1 })) },
    { color: "green", name: "Aero", flag: "🇬🇧", avatar: "👹", tokens: Array.from({ length: 4 }, () => ({ step: -1 })) },
  ];
}

function trackPosition(color: Color, step: number): [number, number] {
  return TRACK[(START[color] + step) % TRACK_LENGTH];
}

function Dice({
  value,
  rolling,
  disabled,
  onRoll,
}: {
  value: number;
  rolling: boolean;
  disabled: boolean;
  onRoll: () => void;
}) {
  const rotations: Record<number, [number, number]> = {
    1: [0, 0], 2: [-90, 0], 3: [0, -90],
    4: [0, 90], 5: [90, 0], 6: [0, 180],
  };
  const [rx, ry] = rotations[value] ?? [0, 0];

  const patterns: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const face = (n: number, transform: string) => (
    <div
      key={n}
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-lg border border-slate-300 bg-gradient-to-br from-white to-slate-300 p-1 shadow-inner"
      style={{ transform, backfaceVisibility: "hidden" }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex items-center justify-center">
          {patterns[n].includes(i) && (
            <span className="h-1 w-1 rounded-full bg-slate-900 sm:h-1.5 sm:w-1.5" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={disabled || rolling}
      aria-label="Roll dice"
      className="flex shrink-0 flex-col items-center gap-1 disabled:opacity-50"
    >
      <motion.div
        className="relative h-8 w-8 sm:h-10 sm:w-10"
        style={{ perspective: 400 }}
        animate={rolling
          ? { rotateX: [0, 180, 360, 540, 720], rotateY: [0, 270, 540, 810, 1080] }
          : { rotateX: rx, rotateY: ry }}
        transition={rolling ? { duration: 0.8 } : { type: "spring", stiffness: 160 }}
      >
        <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }}>
          {face(1, "translateZ(16px)")}
          {face(6, "rotateY(180deg) translateZ(16px)")}
          {face(3, "rotateY(90deg) translateZ(16px)")}
          {face(4, "rotateY(-90deg) translateZ(16px)")}
          {face(2, "rotateX(90deg) translateZ(16px)")}
          {face(5, "rotateX(-90deg) translateZ(16px)")}
        </div>
      </motion.div>
      <span className="text-[8px] font-black uppercase tracking-wider text-white/65">
        {rolling ? "Rolling" : "Roll"}
      </span>
    </button>
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
      className="flex min-w-0 items-center gap-1.5 rounded-xl border px-1.5 py-1.5 sm:gap-2 sm:px-2"
      style={{
        background: active ? `${COLORS[player.color]}30` : "#17164fbd",
        borderColor: active ? COLORS[player.color] : "#ffffff22",
        boxShadow: active ? `0 0 12px ${COLORS[player.color]}30` : undefined,
      }}
    >
      <Dice
        value={dice}
        rolling={rolling}
        disabled={!canRoll}
        onRoll={onRoll}
      />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/40 text-lg sm:h-9 sm:w-9"
          style={{ background: COLORS[player.color] }}
        >
          {player.avatar}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-black sm:text-[11px]">
            {player.flag} {player.name}
          </div>
          <div className="mt-1 text-[8px] text-white/60">{homeCount}/4 home</div>
        </div>
      </div>
      {active && (
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full" style={{ background: COLORS[player.color] }} />
      )}
    </div>
  );
}

function TokenButton({
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
      className="flex h-[90%] w-[90%] items-center justify-center rounded-full border-2 border-white/80 text-[clamp(8px,2vw,15px)] font-black text-white shadow-[0_3px_3px_#0006,inset_0_2px_3px_#fff8] disabled:cursor-default"
      style={{
        background: `radial-gradient(circle at 30% 25%, white 0%, ${COLORS[color]} 28%, #222 180%)`,
      }}
    >
      ♟
    </button>
  );
}

function LudoBoard({
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
  const tokenPositions = useMemo(() => {
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

  const homeCells = useMemo(() => {
    const map = new Map<string, Color>();
    Object.entries(HOME).forEach(([color, cells]) => {
      cells.forEach(([x, y]) => map.set(`${x},${y}`, color as Color));
    });
    return map;
  }, []);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[5%] border-[3px] border-[#b99151] bg-[#fffce9] p-[1px] shadow-[0_8px_25px_#0005,inset_0_0_0_2px_#fff7]">
      <div className="grid h-full w-full grid-cols-15 grid-rows-15">
        {Array.from({ length: 225 }, (_, index) => {
          const x = index % 15;
          const y = Math.floor(index / 15);
          const key = `${x},${y}`;

          let base: Color | null = null;
          if (x < 6 && y < 6) base = "green";
          else if (x > 8 && y < 6) base = "yellow";
          else if (x < 6 && y > 8) base = "red";
          else if (x > 8 && y > 8) base = "blue";

          const homeColor = homeCells.get(key);
          const trackIndex = TRACK.findIndex(([tx, ty]) => tx === x && ty === y);
          const isTrack = trackIndex >= 0;
          const center = x >= 6 && x <= 8 && y >= 6 && y <= 8;
          const pieces = tokenPositions.get(key) ?? [];

          let background = "#fffdf2";
          if (base) background = COLORS[base];
          else if (homeColor) background = `${COLORS[homeColor]}e6`;
          else if (SAFE.has(trackIndex)) background = "#f4e7cd";
          else if (isTrack) background = "#fffdf3";
          else if (center) background = "#f4e4c3";

          const inBaseHome =
            base &&
            x >= (base === "yellow" || base === "blue" ? 10 : 1) &&
            x <= (base === "yellow" || base === "blue" ? 13 : 4) &&
            y >= (base === "red" || base === "blue" ? 10 : 1) &&
            y <= (base === "red" || base === "blue" ? 13 : 4);

          return (
            <div
              key={key}
              className="relative flex items-center justify-center border-[0.5px] border-[#a79a79]/60"
              style={{ background }}
            >
              {base && (
                <div className="absolute inset-[12%] rounded-[18%] border border-white/75 bg-white/15" />
              )}

              {inBaseHome && (
                <div className="absolute inset-[9%] rounded-[20%] border-2 border-white/80 bg-[#fffceb] shadow-inner" />
              )}

              {homeColor && (
                <div className="absolute inset-[12%] rounded-sm" style={{ background: COLORS[homeColor] }} />
              )}

              {SAFE.has(trackIndex) && isTrack && (
                <span className="relative z-[1] text-[clamp(8px,2vw,16px)] text-white drop-shadow">★</span>
              )}

              {center && (
                <svg viewBox="0 0 3 3" className="absolute inset-0 h-full w-full">
                  <polygon points="0,0 3,0 1.5,1.5" fill={COLORS.yellow} />
                  <polygon points="3,0 3,3 1.5,1.5" fill={COLORS.blue} />
                  <polygon points="3,3 0,3 1.5,1.5" fill={COLORS.red} />
                  <polygon points="0,3 0,0 1.5,1.5" fill={COLORS.green} />
                </svg>
              )}

              {pieces.map((piece, pieceIndex) => (
                <div
                  key={`${piece.color}-${piece.index}`}
                  className="absolute z-20 flex h-full w-full items-center justify-center"
                  style={{ transform: `translate(${pieceIndex * 12}%, ${pieceIndex * 10}%)` }}
                >
                  <TokenButton
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

export default function LudoSuperstar({
  balance,
  onWin,
  onLose,
}: LudoSuperstarProps) {
  const [players, setPlayers] = useState<Player[]>(createPlayers);
  const [turn, setTurn] = useState<Color>("red");
  const [dice, setDice] = useState<Record<Color, number>>({
    red: 1, blue: 1, yellow: 1, green: 1,
  });
  const [rolling, setRolling] = useState(false);
  const [rolled, setRolled] = useState(false);
  const [message, setMessage] = useState("Roll the dice to begin");
  const [winner, setWinner] = useState<Color | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wager, setWager] = useState(100);
  const [settled, setSettled] = useState(false);

  const current = players.find((player) => player.color === turn)!;
  const value = dice[turn];

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

  const nextTurn = useCallback(() => {
    setTurn((old) => ORDER[(ORDER.indexOf(old) + 1) % ORDER.length]);
    setRolled(false);
  }, []);

  const roll = useCallback(() => {
    if (rolling || rolled || winner) return;

    setRolling(true);
    const result = Math.floor(Math.random() * 6) + 1;

    window.setTimeout(() => {
      setDice((old) => ({ ...old, [turn]: result }));
      setRolling(false);
      setRolled(true);
      setMessage(`${current.name} rolled ${result}`);

      const canMove = current.tokens.some((token) =>
        token.step === -1
          ? result === 6
          : token.step !== FINISH && token.step + result <= FINISH
      );

      if (!canMove) {
        setMessage(result === 6 ? "No move available. Roll again." : "No available move.");
        if (result === 6) setRolled(false);
        else window.setTimeout(nextTurn, 700);
      }
    }, 800);
  }, [current, nextTurn, rolling, rolled, turn, winner]);

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
            const prize = wager * 2;
            onWin(prize);
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
            ? "Capture! Opponent returned to base."
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

  const restart = () => {
    setPlayers(createPlayers());
    setTurn("red");
    setDice({ red: 1, blue: 1, yellow: 1, green: 1 });
    setRolling(false);
    setRolled(false);
    setWinner(null);
    setSettled(false);
    setMessage("New game started");
  };

  const startWager = (amount: number) => {
    if (!Number.isFinite(amount) || amount < 1 || amount > balance) {
      setMessage("Choose a valid wager within your balance.");
      return;
    }
    setWager(amount);
    setMessage(`Wager selected: ${amount}`);
  };

  return (
    <main className="ludo-screen relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden text-white">
      <style jsx global>{`
        * { box-sizing: border-box; }
        .ludo-screen {
          background-color: #211568;
          background-image:
            radial-gradient(circle, rgba(8,7,76,.28) 3px, transparent 4px),
            radial-gradient(ellipse at 50% 35%, #5140c6 0%, #32238e 48%, #130b4b 100%);
          background-size: 27px 27px, 100% 100%;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .grid-cols-15 { grid-template-columns: repeat(15, minmax(0, 1fr)); }
        .grid-rows-15 { grid-template-rows: repeat(15, minmax(0, 1fr)); }
        .ludo-content { width: 100%; max-width: 900px; min-height: 0; margin-inline: auto; }
      `}</style>

      <header className="ludo-content flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-[max(8px,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-1.5">
          <button onClick={() => setMenuOpen((v) => !v)} className="h-9 w-9 rounded-lg bg-white/15 text-xl">☰</button>
          <button onClick={() => setMessage("Trophy room")} className="h-9 w-9 rounded-lg bg-white/15">🏆</button>
          <button onClick={() => setMessage("Spectator mode")} className="h-9 w-9 rounded-lg bg-white/15">◉</button>
          <button onClick={() => setMessage("Missions")} className="h-9 w-9 rounded-lg bg-white/15">🎯</button>
          <span className="hidden rounded-lg bg-white/15 px-3 py-2 text-xs font-black sm:block">Aero</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-[#15114f] px-2 py-1 text-sm font-black">
          <span className="text-2xl">💎</span>
          {Math.floor(balance).toLocaleString()}
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-green-950">+</span>
        </div>
      </header>

      <section className="ludo-content flex min-h-0 flex-1 flex-col justify-center gap-1 overflow-hidden px-2">
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-fuchsia-300 bg-purple-900 text-2xl">👹</div>
            <button className="h-9 min-w-0 flex-1 rounded-xl bg-[#100b50]/65 text-xl text-white/40">ϟ</button>
            <button className="h-9 w-8 shrink-0 rounded-xl bg-[#100b50]/65">🎁</button>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <button className="h-9 w-8 shrink-0 rounded-xl bg-[#100b50]/65">🎁</button>
            <button className="h-9 min-w-0 flex-1 rounded-xl bg-[#100b50]/65 text-xl text-white/40">ϟ</button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-amber-300 bg-green-700 text-2xl">🌞</div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 px-1">
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

        <div className="flex min-h-0 flex-1 items-center justify-center py-1">
          <div className="w-full max-w-[min(96vw,62vh)]">
            <LudoBoard players={players} turn={turn} canMove={rolled && movable.length > 0} onMove={moveToken} />
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 px-1">
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

        <div className="flex shrink-0 items-center justify-between gap-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-red-800 text-xl">👑</div>
            <button onClick={() => setMessage("Emoji controls")} className="rounded-full bg-white/15 px-3 py-2 text-xs font-black">EMOJI</button>
            <button onClick={() => setMessage("Chat controls")} className="rounded-full bg-white/15 px-3
            py-2 text-xs font-black">EMOJI</button>
            <button onClick={() => setMessage("Chat controls")} className="rounded-full bg-white/15 px-3 py-2 text-xs font-black">CHAT</button>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={() => setMessage("Power-ups")} className="h-9 w-9 rounded-lg bg-[#100b50]/65 text-xl text-white/40">ϟ</button>
            <button onClick={() => setMessage("Gifts")} className="h-9 w-9 rounded-lg bg-[#100b50]/65 text-xl">🎁</button>
            <button onClick={restart} className="h-9 w-9 rounded-lg bg-[#100b50]/65 text-lg">↻</button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-3 top-14 z-40 w-48 rounded-2xl border border-white/15 bg-[#21165f] p-3 shadow-2xl"
          >
            <div className="mb-2 font-black">Game menu</div>
            <button onClick={restart} className="w-full rounded-lg bg-white/10 p-2 text-left text-sm">Restart game</button>
            <label className="mt-3 block text-xs text-white/70">Wager amount</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, balance)}
              value={wager}
              onChange={(e) => startWager(Number(e.target.value))}
              className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm text-white"
            />
            <button onClick={() => setMenuOpen(false)} className="mt-2 w-full rounded-lg bg-white/10 p-2 text-sm">Close</button>
          </motion.div>
        )}
        {winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/75
p-5 backdrop-blur-sm"
          >
            <div className="w-full max-w-xs rounded-3xl border border-white/20 bg-[#21165f] p-7 text-center shadow-2xl">
              <div className="text-5xl">🏆</div>
              <h2 className="mt-3 text-2xl font-black" style={{ color: COLORS[winner] }}>{winner.toUpperCase()} WINS!</h2>
              <button onClick={restart} className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950">Play again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div aria-live="polite" className="pointer-events-none absolute left-1/2 top-[13%] z-30 max-w-[90%] -translate-x-1/2 truncate rounded-full border border-white/10 bg-[#100b50]/85 px-3 py-1 text-center text-[10px] font-bold text-white/80">
        {message}
      </div>
    </main>
  );
}