"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Trophy, RefreshCw, Sparkles, Volume2, VolumeX, Coins, Plus, ArrowRight, Shield, Star, Zap } from "lucide-react";

type Color = "green" | "yellow" | "red" | "blue";
type Mode = "classic" | "aero";
type Phase = "roll" | "move";
type Point = [number, number];

export interface Pawn { id: number; color: Color; step: number; }
export interface Player {
  name: string;
  flag: string;
  avatar: string;
  color: Color;
  isHuman?: boolean;
  isOnline?: boolean;
}

interface LudoProps {
  balance?: number;
  /** Supply profiles from your matchmaking/backend instead of using local bot profiles. */
  players?: Player[];
  /** Current signed-in player's public profile. */
  userProfile?: Partial<Pick<Player, "name" | "flag" | "avatar">>;
  /** Called after local game state changes; connect this to your realtime backend. */
  onGameStateChange?: (state: {
    pawns: Pawn[]; turn: Color; dice: number; phase: Phase; mode: Mode; stake: number;
  }) => void;
}

const PATH: Point[] = [
  [6,1],[6,2],[6,3],[6,4],[6,5], [5,6],[4,6],[3,6],[2,6],[1,6],[0,6], [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8], [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14], [8,14],[8,13],[8,12],[8,11],[8,10],[8,9], [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7], [14,6],[13,6],[12,6],[11,6],[10,6],[9,6], [8,5],[8,4],[8,3],[8,2],[8,1],[8,0], [7,0]
];

// The start gate is tile 1. Counting the gate itself as tile 1, the safe star is tile 9 (+8).
const START: Record<Color, number> = { green: 1, yellow: 14, blue: 27, red: 40 };
const SAFE_GATES = new Set(Object.values(START));
const SAFE_STARS = new Set(Object.values(START).map(index => (index + 8) % 52));
const SAFE = new Set([...SAFE_GATES, ...SAFE_STARS]);
// Fourth tile relative to each colour's gate. In Aero mode, landing here launches to tile five.
const AERO_LAUNCH = new Set(Object.values(START).map(index => (index + 3) % 52));

const HOME: Record<Color, Point[]> = {
  green: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  yellow: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  blue: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  red: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
};

// Positions are inside each coloured yard's white home pad.
const YARD: Record<Color, Point[]> = {
  green: [[2,2],[2,4],[4,2],[4,4]],
  yellow: [[2,10],[2,12],[4,10],[4,12]],
  red: [[10,2],[10,4],[12,2],[12,4]],
  blue: [[10,10],[10,12],[12,10],[12,12]]
};

const COLORS: Record<Color, string> = {
  green: "#07952d", yellow: "#f5bd28", red: "#e63228", blue: "#1675ca"
};
const DARK: Record<Color, string> = {
  green: "#005f1d", yellow: "#b77a00", red: "#991c19", blue: "#064a91"
};
const LIGHT: Record<Color, string> = {
  green: "#63ed8b", yellow: "#ffe18a", red: "#ff9188", blue: "#83caff"
};
const STAKES = [11000, 100000, 1000000, 5000000, 10000000];
const COLOURS: Color[] = ["green", "yellow", "red", "blue"];
const TURN_ORDER: Color[] = ["red", "green", "yellow", "blue"];
const NAME_POOL = ["Manish", "Miray", "Azeel", "Kemi", "Lucas", "Riya", "Arjun", "Zara", "Noah", "Amara"];
const FLAGS = ["🇮🇳", "🇺🇸", "🇦🇪", "🇳🇬", "🇧🇷", "🇬🇧", "🇨🇦"];
const AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=160",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160"
];

const formatCoins = (n: number) => n >= 1000000 ? `${n / 1000000}M` : n >= 1000 ? `${n / 1000}K` : `${n}`;
const initialPawns = (): Pawn[] => COLOURS.flatMap((color, ci) =>
  Array.from({ length: 4 }, (_, i) => ({ id: ci * 4 + i, color, step: -1 }))
);

function makeLocalPlayers(userProfile?: LudoProps["userProfile"]): Player[] {
  const names = [...NAME_POOL].sort(() => Math.random() - 0.5);
  const others: Player[] = ["green", "yellow", "blue"].map((color, i) => ({
    color: color as Color, name: names[i], flag: FLAGS[Math.floor(Math.random() * FLAGS.length)],
    avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)], isHuman: false, isOnline: false
  }));
  const user: Player = {
    color: "red", name: userProfile?.name || "YOU", flag: userProfile?.flag || "🇳🇬",
    avatar: userProfile?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160",
    isHuman: true, isOnline: true
  };
  return [...others.filter(p => p.color === "green"), ...others.filter(p => p.color === "yellow"), user, ...others.filter(p => p.color === "blue")];
}

function PawnToken({ color, selected, onClick, disabled }: {
  color: Color; selected?: boolean; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      aria-label={`${color} pawn`}
      className={`relative flex items-end justify-center rounded-t-[48%] rounded-b-[34%] border-[1.5px] border-white/90 shadow-[0_3px_3px_rgba(0,0,0,.5),inset_0_2px_3px_rgba(255,255,255,.8)] transition-transform ${selected ? "ring-2 ring-yellow-300 scale-110" : ""} ${disabled ? "cursor-default" : "cursor-pointer"}`}
      style={{ width: "68%", height: "91%", background: `radial-gradient(ellipse at 28% 18%, #fff 0%, ${LIGHT[color]} 13%, ${COLORS[color]} 48%, ${DARK[color]} 100%)` }}>
      <span className="absolute left-[18%] top-[13%] h-[20%] w-[23%] rounded-full bg-white/70 blur-[1px]" />
      <span className="mb-[8%] h-[17%] w-[66%] rounded-full border border-white/50 bg-black/15 shadow-inner" />
      <span className="absolute -bottom-[9%] h-[18%] w-[115%] rounded-[50%] border border-white/50"
        style={{ background: `linear-gradient(90deg, ${DARK[color]}, ${COLORS[color]}, ${DARK[color]})` }} />
    </button>
  );
}

export default function LudoSuperstar({
  balance = 223890000, players: suppliedPlayers, userProfile, onGameStateChange
}: LudoProps) {
  const [screen, setScreen] = useState<"splash" | "game">("splash");
  const [mode, setMode] = useState<Mode>("aero");
  const [stake, setStake] = useState(1000000);
  const [players, setPlayers] = useState<Player[]>(() => suppliedPlayers?.length ? suppliedPlayers : makeLocalPlayers(userProfile));
  const [pawns, setPawns] = useState<Pawn[]>(initialPawns);
  const [turn, setTurn] = useState<Color>("red");
  const [dice, setDice] = useState(0);
  const [phase, setPhase] = useState<Phase>("roll");
  const [rolling, setRolling] = useState(false);
  const [lastMessage, setLastMessage] = useState("Your turn! Roll the dice");
  const [sound, setSound] = useState(true);
  const [finished, setFinished] = useState<Color[]>([]);
  const [matchId, setMatchId] = useState(1);
  const [showDice, setShowDice] = useState(false);
  const [diceOwner, setDiceOwner] = useState<Color | null>(null);
  const rollLock = useRef(false);
  const currentPlayer = players.find(p => p.color === turn);
  const isHuman = currentPlayer?.isHuman !== false;

  useEffect(() => {
    const timer = setTimeout(() => setScreen("game"), 1700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (suppliedPlayers?.length) setPlayers(suppliedPlayers);
  }, [suppliedPlayers]);

  const coords = useCallback((pawn: Pawn): Point => {
    if (pawn.step < 0) return YARD[pawn.color][pawn.id % 4];
    if (pawn.step < 51) return PATH[(START[pawn.color] + pawn.step) % 52];
    return HOME[pawn.color][pawn.step - 51] || [7, 7];
  }, []);

  const globalIndex = useCallback((pawn: Pawn) =>
    pawn.step >= 0 && pawn.step < 51 ? (START[pawn.color] + pawn.step) % 52 : -1, []);

  const movable = useCallback((color: Color, roll: number, list = pawns) => list.filter(p => {
    if (p.color !== color || p.step === 57) return false;
    if (p.step === -1) return roll === 6;
    return p.step + roll <= 57;
  }), [pawns]);

  const nextTurn = useCallback((from = turn, alreadyFinished = finished) => {
    const index = TURN_ORDER.indexOf(from);
    for (let i = 1; i <= 4; i++) {
      const candidate = TURN_ORDER[(index + i) % 4];
      if (!alreadyFinished.includes(candidate)) {
        setTurn(candidate);
        setPhase("roll");
        setDice(0);
        setLastMessage(candidate === "red" ? "Your turn! Roll the dice" : `${players.find(p => p.color === candidate)?.name || "Opponent"}'s turn`);
        return;
      }
    }
    setLastMessage("Match complete!");
  }, [turn, finished, players]);

  const rollDice = useCallback(() => {
    if (rollLock.current || rolling || phase !== "roll" || finished.includes(turn)) return;
    rollLock.current = true;
    setRolling(true);
    setLastMessage(isHuman ? "Rolling the dice…" : `${currentPlayer?.name || "Opponent"} is rolling…`);
    setTimeout(() => {
      const result = Math.floor(Math.random() * 6) + 1;
      setDice(result);
      setDiceOwner(turn);
      setShowDice(true);
      setTimeout(() => setShowDice(false), 1550);
      setRolling(false);
      rollLock.current = false;
      const legal = movable(turn, result);
      if (!legal.length) {
        setLastMessage("No legal move. Turn passed.");
        setTimeout(() => nextTurn(turn), 750);
        return;
      }
      setPhase("move");
      setLastMessage(`${result}! ${turn === "red" ? "Choose one of your pawns" : "Opponent is choosing a pawn"}`);
    }, 650);
  }, [rolling, phase, finished, turn, isHuman, currentPlayer, movable, nextTurn]);

  const movePawn = useCallback((pawnId: number) => {
    if (phase !== "move" || rolling) return;
    const pawn = pawns.find(p => p.id === pawnId);
    if (!pawn || pawn.color !== turn) return;
    if (pawn.step === -1 && dice !== 6) return;
    if (pawn.step !== -1 && pawn.step + dice > 57) return;

    let newStep = pawn.step === -1 ? 0 : pawn.step + dice;
    let boosted = false;
    if (mode === "aero" && newStep >= 0 && newStep < 51) {
      const landingIndex = (START[pawn.color] + newStep) % 52;
      if (AERO_LAUNCH.has(landingIndex)) {
        newStep += 1;
        boosted = true;
      }
    }

    const movedPawn = { ...pawn, step: newStep };
    const destinationIndex = newStep < 51 ? (START[pawn.color] + newStep) % 52 : -1;
    const destination = destinationIndex >= 0 ? PATH[destinationIndex] : null;
    const protectedTile = destinationIndex >= 0 && SAFE.has(destinationIndex);
    let captured = false;
    const updated = pawns.map(p => ({ ...p }));
    const moving = updated.find(p => p.id === pawnId)!;
    moving.step = newStep;

    // Capture is evaluated after any Aero launch, at the actual fifth-tile destination.
    if (destination && !protectedTile) {
      updated.forEach(opponent => {
        if (opponent.color === pawn.color || opponent.step < 0 || opponent.step >= 51) return;
        const opponentIndex = (START[opponent.color] + opponent.step) % 52;
        const [r, c] = PATH[opponentIndex];
        if (r === destination[0] && c === destination[1]) {
          opponent.step = -1;
          captured = true;
        }
      });
    }

    setPawns(updated);
    const won = updated.filter(p => p.color === pawn.color).every(p => p.step === 57);
    let nextFinished = finished;
    if (won && !finished.includes(pawn.color)) {
      nextFinished = [...finished, pawn.color];
      setFinished(nextFinished);
    }

    if (newStep === 57) setLastMessage(`${pawn.color.toUpperCase()} pawn reached home!`);
    else if (boosted && captured) setLastMessage("AERO LAUNCH! Opponent captured on tile five!");
    else if (boosted) setLastMessage("AERO LAUNCH! Pawn fired from tile four to tile five!");
    else if (captured) setLastMessage("Opponent captured! Great move!");
    else setLastMessage("Pawn moved successfully!");

    const bonus = dice === 6 || captured || newStep === 57;
    if (nextFinished.length === 4) {
      setLastMessage("🏆 You have completed the match!");
      setPhase("roll");
      return;
    }
    if (bonus) {
      setPhase("roll");
      setDice(0);
      setLastMessage(won ? "All four pawns are home!" : "Bonus turn! Roll again.");
    } else {
      setTimeout(() => nextTurn(turn, nextFinished), 550);
    }
  }, [phase, rolling, pawns, turn, dice, mode, finished, nextTurn]);

  // Local AI opponents. They roll and select legal moves automatically.
  useEffect(() => {
    if (screen !== "game" || isHuman || finished.includes(turn)) return;
    const timer = setTimeout(() => {
      if (phase === "roll") rollDice();
      else {
        const options = movable(turn, dice);
        if (!options.length) { nextTurn(turn); return; }
        const score = (p: Pawn) => {
          if (p.step === -1) return 18;
          const targetStep = p.step + dice;
          const targetIndex = targetStep < 51 ? (START[p.color] + targetStep) % 52 : -1;
          let value = targetStep * 0.35;
          if (targetStep === 57) value += 100;
          if (targetIndex >= 0 && SAFE_STARS.has(targetIndex)) value += 12;
          if (targetIndex >= 0 && !SAFE.has(targetIndex)) {
            const [r, c] = PATH[targetIndex];
            if (pawns.some(o => o.color !== p.color && o.step >= 0 && o.step < 51 && PATH[(START[o.color] + o.step) % 52][0] === r && PATH[(START[o.color] + o.step) % 52][1] === c)) value += 35;
          }
          return value + Math.random() * 5;
        };
        const chosen = [...options].sort((a, b) => score(b) - score(a))[0];
        movePawn(chosen.id);
      }
    }, phase === "roll" ? 900 + Math.random() * 700 : 750 + Math.random() * 650);
    return () => clearTimeout(timer);
  }, [screen, isHuman, turn, phase, dice, finished, rollDice, movable, pawns, movePawn, nextTurn]);

  useEffect(() => {
    onGameStateChange?.({ pawns, turn, dice, phase, mode, stake });
  }, [pawns, turn, dice, phase, mode, stake, onGameStateChange]);

  const resetMatch = () => {
    setPawns(initialPawns()); setTurn("red"); setDice(0); setPhase("roll");
    setFinished([]); setRolling(false); rollLock.current = false; setMatchId(v => v + 1);
    setLastMessage("New match started! Your turn.");
  };

  const getCell = (r: number, c: number) => {
    const yard: Color | null = r < 6 && c < 6 ? "green" : r < 6 && c > 8 ? "yellow" : r > 8 && c < 6 ? "red" : r > 8 && c > 8 ? "blue" : null;
    const index = PATH.findIndex(([pr, pc]) => pr === r && pc === c);
    const homeColor: Color | null = r === 7 && c >= 1 && c <= 6 ? "green" : c === 7 && r >= 1 && r <= 6 ? "yellow" : r === 7 && c >= 8 && c <= 13 ? "blue" : c === 7 && r >= 8 && r <= 13 ? "red" : null;
    const center = r >= 6 && r <= 8 && c >= 6 && c <= 8;
    const isTrack = index >= 0;
    const background = yard ? COLORS[yard] : homeColor ? COLORS[homeColor] : center ? "#fffdf3" : isTrack ? "#fffdf3" : "#fffdf3";
    const isGate = index >= 0 && SAFE_GATES.has(index);
    const isStar = index >= 0 && SAFE_STARS.has(index);
    const launchColor = index >= 0 && AERO_LAUNCH.has(index) ? COLOURS.find(colour => (START[colour] + 3) % 52 === index) : undefined;
    const arrowNext = index >= 0 ? PATH[(index + 1) % 52] : null;
    const arrowAngle = arrowNext ? (() => { const dr = arrowNext[0] - r, dc = arrowNext[1] - c; return dc > 0 ? 0 : dr > 0 ? 90 : dc < 0 ? 180 : 270; })() : 0;
    return (
      <div key={`${r}-${c}`} className="relative flex items-center justify-center border border-[#b8b8a9]" style={{ background }}>
        {isStar && <Star className="h-[72%] w-[72%] text-amber-400 fill-amber-300 drop-shadow" strokeWidth={1.5} />}
        {isGate && !isStar && <Shield className="h-[62%] w-[62%] text-white/80 fill-black/10" />}
        {mode === "aero" && launchColor && <span className="absolute z-[4] flex h-full w-full items-center justify-center" style={{ color: COLORS[launchColor] }}>
          <ArrowRight size="72%" strokeWidth={3.5} style={{ transform: `rotate(${arrowAngle}deg)`, filter: "drop-shadow(0 1px 1px #fff)" }} />
        </span>}
      </div>
    );
  };


  const playerCard = (color: Color) => {
    const p = players.find(player => player.color === color);
    if (!p) return null;
    const active = turn === color;
    return (
      <div key={color} className={`relative flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5 ${active ? "border-yellow-300 bg-[#342a9b] shadow-[0_0_12px_rgba(255,220,60,.35)]" : "border-indigo-700 bg-[#17114a]"}`}>
        <img src={p.avatar} alt="" className="h-9 w-9 shrink-0 rounded-lg border-2 object-cover" style={{ borderColor: COLORS[color] }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-black">{p.isHuman ? "YOU" : p.name} <span>{p.flag}</span></div>
          <div className="text-[9px] font-bold uppercase" style={{ color: COLORS[color] }}>{color}</div>
          <div className="text-[9px] text-emerald-300">{finished.includes(color) ? "Finished" : active ? "Playing" : "Ready"}</div>
        </div>
        {showDice && diceOwner === color && <div className="absolute -right-3 -top-3 z-50 grid h-9 w-9 place-items-center rounded-xl border-2 border-amber-300 bg-white text-xl font-black text-slate-900 shadow-lg animate-bounce">{dice}</div>}
      </div>
    );
  };

  if (screen === "splash") return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#3421a0,#100638_65%)] text-white">
      <div className="mb-5 grid h-24 w-24 place-items-center rounded-[28px] border-2 border-yellow-300 bg-indigo-900 shadow-[0_0_45px_rgba(255,210,50,.35)]"><Trophy size={54} className="text-yellow-300" /></div>
      <h1 className="text-5xl font-black italic tracking-tight text-yellow-300 drop-shadow-lg">LUDO</h1>
      <h2 className="text-xl font-black tracking-[.35em]">SUPERSTAR</h2>
      <Sparkles className="mt-5 animate-pulse text-cyan-300" />
      <p className="mt-3 text-[10px] font-bold tracking-[.25em] text-indigo-200">PREPARING YOUR GAME</p>
    </main>
  );

  return (
    <main className="flex h-[100dvh] min-h-0 w-full flex-col gap-1 overflow-hidden bg-[radial-gradient(circle_at_top,#25156e,#09051f_72%)] p-2 text-white select-none">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between">
        <button type="button" onClick={resetMatch} className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-500 bg-indigo-950" aria-label="Restart match"><RefreshCw size={16}/></button>
        <div className="text-center leading-none"><div className="text-[15px] font-black italic tracking-wider text-yellow-300">🏆 LUDO SUPERSTAR</div><div className="mt-1 text-[8px] font-bold tracking-[.25em] text-indigo-200">CLASSIC & AERO EDITION</div></div>
        <div className="flex items-center gap-1 rounded-lg border border-yellow-400/70 bg-indigo-950 px-2 py-1"><Coins size={14} className="text-yellow-300"/><span className="text-[10px] font-black">{formatCoins(balance)}</span><Plus size={13} className="text-emerald-300"/></div>
      </header>

      {/* Player profiles */}
      <section className="grid shrink-0 grid-cols-2 gap-1.5">
        {playerCard("green")}{playerCard("yellow")}
      </section>

      {/* Board only: mode and stake controls are intentionally outside this board. */}
      <section className="flex min-h-0 flex-1 items-center justify-center py-0.5">
        <div className="relative aspect-square w-full max-h-full max-w-full overflow-hidden rounded-[15px] border-[3px] border-indigo-400 bg-[#fffdf3] shadow-[0_0_24px_rgba(75,55,255,.65)]">
          <div className="grid h-full w-full" style={{ gridTemplateColumns: "repeat(15,minmax(0,1fr))", gridTemplateRows: "repeat(15,minmax(0,1fr))" }}>
            {Array.from({ length: 225 }, (_, i) => getCell(Math.floor(i / 15), i % 15))}
          </div>
          {/* White home pads */}
          {(["green", "yellow", "red", "blue"] as Color[]).map(color => {
            const position = color === "green" ? { left: "6.667%", top: "6.667%" } : color === "yellow" ? { right: "6.667%", top: "6.667%" } : color === "red" ? { left: "6.667%", bottom: "6.667%" } : { right: "6.667%", bottom: "6.667%" };
            return <div key={color} className="pointer-events-none absolute flex aspect-square w-[26.666%] items-center justify-center rounded-[23%] border-[2px] border-white bg-[#fffdf0] shadow-inner" style={position}>
              <div className="grid aspect-square w-[65%] grid-cols-2 grid-rows-2 gap-[17%]">
                {Array.from({ length: 4 }, (_, i) => <span key={i} className="rounded-full shadow-inner" style={{ background: COLORS[color] }} />)}
              </div>
            </div>;
          })}
          {/* Centre four-colour finish */}
          <div className="pointer-events-none absolute left-[40%] top-[40%] z-10 aspect-square w-[20%]">
            <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow">
              <path d="M0 0 L100 0 L50 50 Z" fill={COLORS.yellow} stroke="white" strokeWidth="1.5"/>
              <path d="M100 0 L100 100 L50 50 Z" fill={COLORS.blue} stroke="white" strokeWidth="1.5"/>
              <path d="M100 100 L0 100 L50 50 Z" fill={COLORS.red} stroke="white" strokeWidth="1.5"/>
              <path d="M0 100 L0 0 L50 50 Z" fill={COLORS.green} stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
          {/* Pawns are overlaid after the home pads so they remain visible. */}
          {pawns.map(p => {
            const [r, c] = coords(p);
            const movablePawn = p.color === turn && phase === "move" && movable(turn, dice).some(m => m.id === p.id);
            const offset = p.step < 0 ? 0 : 0;
            return <div key={p.id} className="absolute z-30 flex items-center justify-center" style={{ left: `${(c / 15) * 100}%`, top: `${(r / 15) * 100}%`, width: `${100 / 15}%`, height: `${100 / 15}%` }}>
              <div className="flex h-full w-full items-center justify-center" style={{ transform: `translate(${offset}px,0)` }}>
                <PawnToken color={p.color} selected={movablePawn} disabled={!movablePawn || !isHuman} onClick={() => movePawn(p.id)} />
              </div>
            </div>;
          })}
        </div>
      </section>

      {/* Turn message */}
      <div className="flex shrink-0 items-center justify-center gap-2 py-0.5 text-center">
        <span className={`h-1.5 w-1.5 rounded-full ${isHuman ? "bg-emerald-400" : "bg-amber-300 animate-pulse"}`} />
        <p className="max-w-[90%] truncate text-[10px] font-extrabold text-cyan-100">{lastMessage}</p>
      </div>

      {/* Bottom player cards */}
      <section className="grid shrink-0 grid-cols-2 gap-1.5">
        {playerCard("red")}{playerCard("blue")}
      </section>

      {/* Mode feature: independent from the board and stake selector */}
      <section className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-indigo-500/80 bg-[#17104e] p-2">
        <div className="min-w-0"><div className="text-[10px] font-black text-white">GAME MODE</div><div className="text-[8px] text-indigo-200">Choose your Ludo rules</div></div>
        <div className="flex rounded-lg bg-[#09052d] p-1">
          <button type="button" onClick={() => setMode("classic")} className={`rounded-md px-3 py-1.5 text-[10px] font-black ${mode === "classic" ? "bg-indigo-500 text-white shadow" : "text-indigo-200"}`}>CLASSIC</button>
          <button type="button" onClick={() => setMode("aero")} className={`rounded-md px-3 py-1.5 text-[10px] font-black ${mode === "aero" ? "bg-cyan-400 text-slate-950 shadow" : "text-indigo-200"}`}>AERO <Zap size={10} className="inline"/></button>
        </div>
        <button type="button" onClick={() => setSound(v => !v)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-indigo-500 bg-indigo-900" aria-label="Toggle sound">{sound ? <Volume2 size={16}/> : <VolumeX size={16}/>}</button>
      </section>

      {/* Dice action and temporary result beside active profile */}
      <section className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-indigo-400 bg-indigo-950"><span className="text-xl">🎲</span></div>
          <div className="min-w-0"><div className="text-[10px] font-black">{isHuman ? "YOUR TURN" : `${currentPlayer?.name || "OPPONENT"}'S TURN`}</div><div className="text-[8px] text-indigo-200">{phase === "move" ? "Select a highlighted pawn" : "Roll to play"}</div></div>
        </div>
        <button type="button" onClick={rollDice} disabled={!isHuman || phase !== "roll" || rolling || finished.includes(turn)}
          className={`flex min-w-[118px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-[11px] font-black shadow-lg ${isHuman && phase === "roll" && !rolling ? "border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-700 text-white" : "border-slate-600 bg-slate-700 text-slate-300"}`}>
          <span className={`text-xl ${rolling ? "animate-spin" : ""}`}>🎲</span>{rolling ? "ROLLING…" : phase === "move" && isHuman ? "SELECT PAWN" : "ROLL DICE"}
        </button>
      </section>

      {/* Staking is its own feature, not mixed into the board or mode selector. */}
      <section className="shrink-0 rounded-xl border border-indigo-500 bg-[#17104e] px-2 py-2">
        <div className="mb-1.5 flex items-center justify-between"><span className="text-[9px] font-black text-yellow-300">STAKE AMOUNT</span><span className="text-[10px] font-black text-white">🪙 {formatCoins(stake)}</span></div>
        <div className="grid grid-cols-5 gap-1.5">
          {STAKES.map(value => <button key={value} type="button" onClick={() => setStake(value)} className={`rounded-lg border py-2 text-[9px] font-black ${stake === value ? "border-yellow-200 bg-yellow-400 text-black shadow-[0_0_12px_rgba(255,204,0,.55)]" : "border-indigo-600 bg-indigo-900 text-white"}`}>{formatCoins(value)}</button>)}
        </div>
      </section>
      <footer className="shrink-0 pb-0.5 text-center text-[8px] font-bold tracking-wider text-indigo-400">MATCH #{matchId} · {mode.toUpperCase()} MODE · LUDO SUPERSTAR</footer>
    </main>
  );
}
