
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy, ArrowLeft, RefreshCw, Smile, MessageSquare,
  Bot, Plus, Minus, Settings, Sparkles, Volume2,
  VolumeX, Crown, Zap, Shield, Globe, Coins
} from "lucide-react";

type Color = "green" | "yellow" | "red" | "blue";
type Mode = "classic" | "aero";
type Phase = "roll" | "move";

interface Pawn {
  id: number;
  color: Color;
  step: number;
}

interface Player {
  name: string;
  flag: string;
  avatar: string;
  color: Color;
  isHuman?: boolean;
}

const PATH: [number, number][] = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0]
];

const START: Record<Color, number> = {
  green: 1,
  yellow: 14,
  blue: 27,
  red: 40
};

// Gate tile is tile 1.
// The ninth tile is therefore 8 positions after the gate.
const SAFE = new Set([
  1, 9,
  14, 22,
  27, 35,
  40, 48
]);

// Aero launch tiles: fourth tile of each directional section.
const AERO_LAUNCH = new Set([4, 17, 30, 43]);

const HOME: Record<Color, [number, number][]> = {
  green: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  yellow: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  blue: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  red: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
};

const YARD: Record<Color, [number, number][]> = {
  green: [[1,1],[1,4],[4,1],[4,4]],
  yellow: [[1,10],[1,13],[4,10],[4,13]],
  red: [[10,1],[10,4],[13,1],[13,4]],
  blue: [[10,10],[10,13],[13,10],[13,13]]
};

const PLAYERS: Player[] = [
  {
    name: "Manish",
    flag: "🇮🇳",
    avatar: "https://images.unsplash.com/photo-1507003211167-0a1dd7228f2d?w=150",
    color: "green"
  },
  {
    name: "Miray",
    flag: "🇺🇸",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    color: "yellow"
  },
  {
    name: "busybrain",
    flag: "🇳🇬",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    color: "red",
    isHuman: true
  },
  {
    name: "Azeel",
    flag: "🇦🇪",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    color: "blue"
  }
];

const COLORS: Record<Color, string> = {
  green: "#00a82c",
  yellow: "#ffc629",
  red: "#ed3023",
  blue: "#0877db"
};

const DARK: Record<Color, string> = {
  green: "#007b20",
  yellow: "#d99b00",
  red: "#a91612",
  blue: "#0753a6"
};

const STAKES = [
  11000, 100000, 1000000, 5000000, 10000000
];

const formatCoins = (n: number) =>
  n >= 1000000 ? `${n / 1000000}M` :
  n >= 1000 ? `${n / 1000}K` : `${n}`;

const initialPawns = (): Pawn[] =>
  (["green","yellow","red","blue"] as Color[]).flatMap(
    color => Array.from({ length: 4 }, (_, i) => ({
      id: ["green","yellow","red","blue"].indexOf(color) * 4 + i,
      color,
      step: -1
    }))
  );

export default function LudoSuperstar({
  balance = 223890000
}: {
  balance?: number;
}) {
  const [screen, setScreen] = useState<"splash"|"game">("splash");
  const [mode, setMode] = useState<Mode>("aero");
  const [stake, setStake] = useState(1000000);
  const [players] = useState(PLAYERS);
  const [pawns, setPawns] = useState<Pawn[]>(initialPawns);
  const [turn, setTurn] = useState<Color>("red");
  const [dice, setDice] = useState(1);
  const [phase, setPhase] = useState<Phase>("roll");
  const [rolling, setRolling] = useState(false);
  const [lastMessage, setLastMessage] = useState("Your turn! Roll the dice");
  const [sound, setSound] = useState(true);
  const [finished, setFinished] = useState<Color[]>([]);
  const [matchId, setMatchId] = useState(0);

  const isHuman = turn === "red";

  useEffect(() => {
    const timer = setTimeout(() => setScreen("game"), 2500);
    return () => clearTimeout(timer);
  }, []);

  const coords = useCallback((pawn: Pawn): [number,number] => {
    if (pawn.step < 0) {
      return YARD[pawn.color][pawn.id % 4];
    }

    if (pawn.step < 51) {
      return PATH[(START[pawn.color] + pawn.step) % 52];
    }

    return HOME[pawn.color][pawn.step - 51] || [7,7];
  }, []);

  const movable = useCallback((color: Color, roll: number) => {
    return pawns.filter(p => {
      if (p.color !== color || p.step >= 57) return false;
      if (p.step === -1) return roll === 6;
      return p.step + roll <= 57;
    });
  }, [pawns]);

  const nextTurn = useCallback(() => {
    const order: Color[] = ["red","green","yellow","blue"];
    let index = order.indexOf(turn);

    for (let i = 1; i <= 4; i++) {
      const next = order[(index + i) % 4];
      if (!finished.includes(next)) {
        setTurn(next);
        setPhase("roll");
        setLastMessage(
          next === "red" ? "Your turn! Roll the dice" :
          `${players.find(p => p.color === next)?.name}'s turn`
        );
        return;
      }
    }
  }, [turn, finished, players]);

  const rollDice = useCallback(() => {
    if (rolling || phase !== "roll" || finished.includes(turn)) return;

    setRolling(true);

    setTimeout(() => {
      const result = Math.floor(Math.random() * 6) + 1;
      setDice(result);
      setRolling(false);

      const legal = movable(turn, result);

      if (!legal.length) {
        setLastMessage(
          result === 6
            ? "No available moves!"
            : "No moves available. Turn passed."
        );

        setTimeout(() => {
          if (result !== 6) nextTurn();
          else setPhase("roll");
        }, 850);

        return;
      }

      setPhase("move");
      setLastMessage(
        `${result}! ${turn === "red" ? "Choose" : "Opponent choosing"} a pawn`
      );
    }, 650);
  }, [rolling, phase, turn, finished, movable, nextTurn]);

  const movePawn = useCallback((pawnId: number) => {
    if (phase !== "move" || rolling) return;

    const pawn = pawns.find(p => p.id === pawnId);
    if (!pawn || pawn.color !== turn) return;

    if (pawn.step === -1 && dice !== 6) return;
    if (pawn.step !== -1 && pawn.step + dice > 57) return;

    let newStep = pawn.step === -1 ? 0 : pawn.step + dice;
    let captured = false;
    let boost = false;

    // Aero mode: landing on a launch tile shoots the pawn
    // one additional tile forward.
    if (
      mode === "aero" &&
      newStep < 51 &&
      AERO_LAUNCH.has((START[pawn.color] + newStep) % 52)
    ) {
      newStep += 1;
      boost = true;
    }

    const destination: Pawn = {
      ...pawn,
      step: newStep
    };

    const [r,c] = coords(destination);
    const globalIndex = newStep < 51
      ? (START[pawn.color] + newStep) % 52
      : -1;

    const isSafe = globalIndex >= 0 && SAFE.has(globalIndex);

    setPawns(prev => {
      const updated = prev.map(p =>
        p.id === pawnId ? destination : { ...p }
      );

      // Capture opponents on the destination tile.
      // Home lanes and safe squares are protected.
      if (globalIndex >= 0 && !isSafe) {
        updated.forEach(p => {
          if (p.color === pawn.color || p.step < 0 || p.step >= 51) return;

          const [pr,pc] = coords(p);

          if (pr === r && pc === c) {
            p.step = -1;
            captured = true;
          }
        });
      }

      return updated;
    });

    if (newStep === 57) {
      setLastMessage(`${pawn.color.toUpperCase()} pawn reached home!`);
    } else if (captured) {
      setLastMessage("Opponent captured! Great move!");
    } else if (boost) {
      setLastMessage("AERO BOOST! Pawn launched forward!");
    } else {
      setLastMessage("Pawn moved successfully!");
    }

    // Determine whether the player has finished all four pawns.
    setTimeout(() => {
      setPawns(current => {
        const won = current
          .filter(p => p.color === pawn.color)
          .every(p => p.step === 57);

        if (won) {
          setFinished(old =>
            old.includes(pawn.color) ? old : [...old, pawn.color]
          );
        }
        return current;
      });
    }, 100);

    // Six, capture, or finishing gives another turn.
    if (dice === 6 || captured || newStep === 57) {
      setPhase("roll");
      setLastMessage("Bonus turn! Roll again.");
    } else {
      setTimeout(nextTurn, 500);
    }

  }, [phase, rolling, pawns, turn, dice, mode, coords, nextTurn]);

  // AI opponents play automatically.
  useEffect(() => {
    if (screen !== "game" || turn === "red" || finished.includes(turn)) return;

    let timer: ReturnType<typeof setTimeout>;

    if (phase === "roll") {
      timer = setTimeout(() => rollDice(), 1000 + Math.random() * 700);
    } else {
      timer = setTimeout(() => {
        const options = movable(turn, dice);

        if (!options.length) {
          nextTurn();
          return;
        }

        // Prefer captures and reaching home.
        const ranked = [...options].sort((a,b) => {
          const score = (p: Pawn) => {
            if (p.step === -1) return 4;
            if (p.step + dice >= 57) return 10;
            return p.step + dice;
          };
          return score(b) - score(a);
        });

        const selected = ranked[0];
        movePawn(selected.id);
      }, 900 + Math.random() * 700);
    }

    return () => clearTimeout(timer);
  }, [screen, turn, phase, dice, finished, movable, rollDice, movePawn, nextTurn]);

  const resetMatch = () => {
    setPawns(initialPawns());
    setTurn("red");
    setDice(1);
    setPhase("roll");
    setFinished([]);
    setLastMessage("New match started!");
    setMatchId(id => id + 1);
  };

  // Splash screen
  if (screen === "splash") {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#100641] text-white">
        <Trophy size={75} className="text-yellow-400 mb-4 animate-bounce" />
        <h1 className="text-5xl font-black italic text-yellow-400">
          LUDO
        </h1>
        <h2 className="text-2xl font-black tracking-widest">
          SUPERSTAR
        </h2>
        <Sparkles className="text-cyan-300 mt-5 animate-pulse" />
        <p className="text-indigo-300 text-xs mt-4">
          PREPARING YOUR GAME...
        </p>
      </div>
    );
  }

  const currentPlayer = players.find(p => p.color === turn)!;

  const getCell = (r: number, c: number) => {
    const yard =
      r < 6 && c < 6 ? "green" :
      r < 6 && c > 8 ? "yellow" :
      r > 8 && c < 6 ? "red" :
      r > 8 && c > 8 ? "blue" : null;

    const idx = PATH.findIndex(([pr,pc]) => pr === r && pc === c);
    const start = Object.entries(START).find(([,v]) => v === idx);
    const homeColor =
      r === 7 && c >= 1 && c <= 6 ? "green" :
      c === 7 && r >= 1 && r <= 6 ? "yellow" :
      r === 7 && c >= 8 && c <= 13 ? "blue" :
      c === 7 && r >= 8 && r <= 13 ? "red" : null;

    const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

    let background = "#fffdf0";

    if (yard) background = COLORS[yard];
    else if (homeColor) background = COLORS[homeColor];
    else if (isCenter) background = "#ffffff";

    const pawnsHere = pawns.filter(p => {
      const [pr,pc] = coords(p);
      return pr === r && pc === c;
    });

    const isSafe = idx >= 0 && SAFE.has(idx);
    const isLaunch = idx >= 0 && AERO_LAUNCH.has(idx);

    return (
      <div
        key={`${matchId}-${r}-${c}`}
        className="relative flex items-center justify-center border border-slate-400/50 overflow-visible"
        style={{ background }}
      >
        {isSafe && (
          <span className="absolute text-[15px] z-[2] drop-shadow">
            ⭐
          </span>
        )}

        {start && (
          <span className="absolute z-[3] text-[11px]">
            🛡️
          </span>
        )}

        {isLaunch && mode === "aero" && (
          <span className="absolute z-[3] text-[14px] font-black text-blue-600 drop-shadow">
            {idx === 1 || idx === 14 ? "↑" :
             idx === 27 || idx === 40 ? "↓" : "➜"}
          </span>
        )}

        {pawnsHere.map((p, index) => (
          <button
            key={p.id}
            onClick={() => movePawn(p.id)}
            disabled={p.color !== turn || phase !== "move"}
            className="absolute z-20 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125"
            style={{
              width: "72%",
              height: "72%",
              background: `radial-gradient(circle at 30% 25%, white 0%, ${COLORS[p.color]} 38%, ${DARK[p.color]} 100%)`,
              transform: `translate(${index * 12 - 6}px,${index * 7 - 4}px)`,
              cursor: p.color === turn && phase === "move" ? "pointer" : "default"
            }}
          >
            <span className="text-white text-[8px] font-black drop-shadow">
              {index + 1}
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#100743] text-white select-none pb-4">

      {/* TOP BAR */}
      <header className="flex items-center justify-between p-3">
        <button className="p-3 rounded-xl bg-indigo-950 border border-indigo-400">
          <Settings size={22}/>
        </button>

        <div className="text-center">
          <h1 className="text-3xl font-black italic text-yellow-400 drop-shadow-lg">
            🏆 LUDO
          </h1>
          <p className="text-xs font-black tracking-[4px]">SUPERSTAR</p>
        </div>

        <div className="flex items-center gap-2 bg-indigo-950 border border-yellow-400 rounded-2xl px-3 py-2">
          <Coins className="text-yellow-400" size={20}/>
          <span className="font-black text-sm">{formatCoins(balance)}</span>
          <Plus size={18} className="text-green-400"/>
        </div>
      </header>

      {/* MATCH STATUS */}
      <div className="flex justify-center items-center gap-2 mb-3">
        <span className="rounded-full bg-green-500/20 border border-green-400 px-3 py-1 text-[10px] font-black text-green-300">
          <Globe size={12} className="inline mr-1"/>
          {isHuman ? "YOUR TURN" : "LIVE MATCH"}
        </span>
        <span className="text-[10px] text-indigo-200">
          MATCH #{matchId + 1}
        </span>
      </div>

      {/* PLAYERS TOP */}
      <div className="grid grid-cols-2 gap-2 px-3 mb-2">
        {players.slice(0,2).map(p => (
          <div
            key={p.color}
            className={`flex items-center gap-2 rounded-xl p-2 border-2 ${
              turn === p.color
                ? "border-yellow-300 bg-indigo-800 shadow-lg"
                : "border-indigo-700 bg-indigo-950"
            }`}
          >
            <img
              src={p.avatar}
              className="w-11 h-11 rounded-xl object-cover border-2"
              style={{ borderColor: COLORS[p.color] }}
            />
            <div className="min-w-0">
              <p className="font-black text-xs truncate">
                {p.name} {p.flag}
              </p>
              <p className="text-[10px] font-bold" style={{color:COLORS[p.color]}}>
                {p.color.toUpperCase()}
              </p>
              <p className="text-[9px] text-green-300">
                {turn === p.color ? "Playing" : "Online"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* BET AMOUNT */}
      <div className="mx-3 mb-3 flex items-center justify-center gap-4 bg-indigo-950 border border-indigo-500 rounded-2xl p-2">
        <button
          onClick={() => setStake(s => STAKES[Math.max(0,STAKES.indexOf(s)-1)])}
          disabled={stake === STAKES[0]}
          className="p-2 rounded-lg bg-indigo-800"
        >
          <Minus size={18}/>
        </button>

        <div className="text-center">
          <p className="text-[9px] text-indigo-300 font-bold">BET AMOUNT</p>
          <p className="text-xl font-black text-yellow-400">
            🪙 {formatCoins(stake)}
          </p>
        </div>

        <button
          onClick={() => setStake(s => STAKES[Math.min(STAKES.length-1,STAKES.indexOf(s)+1)])}
          disabled={stake === STAKES[STAKES.length-1]}
          className="p-2 rounded-lg bg-indigo-800"
        >
          <Plus size={18}/>
        </button>
      </div>

      {/* LUDO BOARD */}
      <div className="w-full px-2">
        <div className="relative mx-auto aspect-square w-full max-w-[620px] rounded-[28px] border-[5px] border-indigo-400 shadow-[0_0_30px_#4c36ff] overflow-hidden bg-white">
          <div
            className="grid w-full h-full"
            style={{
              gridTemplateColumns: "repeat(15,minmax(0,1fr))",
              gridTemplateRows: "repeat(15,minmax(0,1fr))"
            }}
          >
            {Array.from({length:225},(_,i) => getCell(
              Math.floor(i/15),i%15
            ))}
          </div>

          {/* YARD CENTRES */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2">
            {(["green","yellow","red","blue"] as Color[]).map(color => (
              <div
                key={color}
                className={`flex items-center justify-center ${
                  color === "green" ? "col-start-1 row-start-1" :
                  color === "yellow" ? "col-start-2 row-start-1" :
                  color === "red" ? "col-start-1 row-start-2" :
                  "col-start-2 row-start-2"
                }`}
              >
                <div className="w-[65%] aspect-square rounded-[24%] bg-[#fffdf0] border-[3px] border-white shadow-inner flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-[22%] w-[65%] aspect-square">
                    {Array.from({length:4},(_,i) => (
                      <div
                        key={i}
                        className="rounded-full shadow-inner"
                        style={{background:COLORS[color]}}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CENTRE FINISH */}
          <div className="absolute left-[40%] top-[40%] w-[20%] aspect-square pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
              <path d="M0 0 L100 0 L50 50 Z" fill="#ffc629" stroke="white" strokeWidth="1"/>
              <path d="M100 0 L100 100 L50 50 Z" fill="#0877db" stroke="white" strokeWidth="1"/>
              <path d="M100 100 L0 100 L50 50 Z" fill="#ed3023" stroke="white" strokeWidth="1"/>
              <path d="M0 100 L0 0 L50 50 Z" fill="#00a82c" stroke="white" strokeWidth="1"/>
            </svg>
          </div>
        </div>
      </div>

      {/* MESSAGE */}
      <div className="text-center mt-3 mb-2">
        <p className="text-xs font-bold text-cyan-200">
          {lastMessage}
        </p>
      </div>

      {/* BOTTOM PLAYERS */}
      <div className="grid grid-cols-2 gap-2 px-3 mt-2">
        {players.slice(2).concat(players.slice(0,0)).map(p => (
          <div
            key={p.color}
            className={`flex items-center gap-2 rounded-xl p-2 border-2 ${
              turn === p.color
                ? "border-yellow-300 bg-indigo-800"
                : "border-indigo-700 bg-indigo-950"
            }`}
          >
            <img
              src={p.avatar}
              className="w-11 h-11 rounded-xl object-cover"
              style={{border:`2px solid ${COLORS[p.color]}`}}
            />
            <div className="min-w-0">
              <p className="text-xs font-black truncate">{p.name}</p>
              <p className="text-[10px] font-bold" style={{color:COLORS[p.color]}}>
                {p.color.toUpperCase()}
              </p>
              <p className="text-[9px] text-green-300">
                {p.isHuman ? "YOU" : "Online"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* GAME CONTROLS */}
      <div className="flex items-center justify-around px-3 mt-4">

        <button
          onClick={() => setMode(m => m === "aero" ? "classic" : "aero")}
          className="rounded-xl bg-indigo-900 border border-indigo-400 p-3 text-xs font-black"
        >
          <Settings size={20} className="mx-auto mb-1"/>
          {mode.toUpperCase()}
          <span className="block text-[9px] text-cyan-300">
            MODE
          </span>
        </button>

        <button
          onClick={() => setSound(s => !s)}
          className="rounded-xl bg-indigo-900 border border-indigo-400 p-3"
        >
          {sound ? <Volume2/> : <VolumeX/>}
        </button>

        <button
          onClick={resetMatch}
          className="rounded-xl bg-purple-800 border border-purple-400 p-3 relative"
        >
          <RefreshCw size={23}/>
          <span className="absolute -top-2 -right-2 bg-red-500 rounded-full text-xs px-1">
            25
          </span>
        </button>

        <button
          onClick={rollDice}
          disabled={!isHuman || phase !== "roll" || rolling}
          className={`rounded-2xl p-4 min-w-[110px] font-black text-center shadow-xl border-2 ${
            isHuman && phase === "roll"
              ? "bg-gradient-to-b from-green-400 to-green-700 border-green-200 text-white"
              : "bg-slate-700 border-slate-500 text-slate-300"
          }`}
        >
          <span className={`block text-3xl ${rolling ? "animate-spin" : ""}`}>
            🎲
          </span>
          <span className="text-sm">
            {rolling ? "ROLLING" : phase === "move" && isHuman ? "SELECT PAWN" : "ROLL DICE"}
          </span>
          <span className="block text-[9px]">
            {isHuman ? "YOUR TURN" : "WAITING"}
          </span>
        </button>
      </div>

      {/* STAKE SELECTOR */}
      <div className="mx-3 mt-4 rounded-2xl border border-indigo-500 bg-indigo-950 p-3">
        <p className="text-center text-xs font-black text-yellow-300 mb-3">
          STAKE RANGE: 11K – 10M COINS
        </p>

        <div className="flex gap-2 justify-between">
          {STAKES.map(value => (
            <button
              key={value}
              onClick={() => setStake(value)}
              className={`flex-1 rounded-lg py-3 text-[10px] font-black border ${
                stake === value
                  ? "bg-yellow-400 text-black border-yellow-200 shadow-[0_0_15px_#ffc629]"
                  : "bg-indigo-900 text-white border-indigo-600"
              }`}
            >
              {formatCoins(value)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-[9px] text-indigo-400 mt-4">
        LUDO SUPERSTAR • CLASSIC & AERO EDITION
      </p>

    </main>
  );
}
