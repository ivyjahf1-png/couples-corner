"use client";

import React, { useState, useRef, useEffect } from "react";

type Color = "red" | "green" | "yellow" | "blue";
type GameMode = "CLASSIC" | "QUICK" | "MASTER";

interface Pawn {
  id: number;
  step: number; // 0 = Yard, 1..51 = Outer Track, 52..56 = Home Column, 57 = Won
}

interface Player {
  id: number;
  color: Color;
  name: string;
  pawns: Pawn[];
}

const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

const PLAYERS_CFG: Record<Color, { hex: string; offset: number; yard: [number, number][] }> = {
  red:    { hex: "#EF4444", offset: 0,  yard: [[2,2],[3,2],[2,3],[3,3]] },
  green:  { hex: "#10B981", offset: 13, yard: [[11,2],[12,2],[11,3],[12,3]] },
  yellow: { hex: "#F59E0B", offset: 26, yard: [[11,11],[12,11],[11,12],[12,12]] },
  blue:   { hex: "#3B82F6", offset: 39, yard: [[2,11],[3,11],[2,12],[3,12]] },
};

const TRACK: [number, number][] = [
  [1,6],[2,6],[3,6],[4,6],[5,6],
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],
  [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],
  [6,14],[6,13],[6,12],[6,11],[6,10],[6,9],
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]
];

const HOME_PATHS: Record<Color, [number, number][]> = {
  red:    [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  green:  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  blue:   [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
};

export default function LudoSuperstarPage() {
  const [screen, setScreen] = useState<"dashboard" | "game" | "victory">("dashboard");
  const [wager, setWager] = useState<number>(1000);
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [mode, setMode] = useState<GameMode>("CLASSIC");
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [turnIdx, setTurnIdx] = useState<number>(0);
  const [dice, setDice] = useState<number | null>(null);
  const [waitingMove, setWaitingMove] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("");
  const [winner, setWinner] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Web Audio SFX
  const playSfx = (type: "roll" | "move" | "cut" | "win") => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;

      if (type === "roll") {
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(320, t + 0.12);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
      } else if (type === "move") {
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.setValueAtTime(600, t + 0.05);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.08);
      } else if (type === "cut") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.25);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
      } else if (type === "win") {
        osc.type = "triangle";
        [440, 554, 659, 880].forEach((freq, idx) => {
          osc.frequency.setValueAtTime(freq, t + idx * 0.1);
        });
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
      }
    } catch {
      // Fallback if audio fails
    }
  };

  const startMatch = () => {
    const colors: Color[] = playerCount === 2 ? ["red", "yellow"] : ["red", "green", "yellow", "blue"];
    const initialPlayers: Player[] = colors.map((col, idx) => ({
      id: idx,
      color: col,
      name: Player ${idx + 1} (${col.toUpperCase()}),
      pawns: [0, 1, 2, 3].map((i) => ({ id: i, step: 0 }))
    }));

    setPlayers(initialPlayers);
    setTurnIdx(0);
    setDice(null);
    setWaitingMove(false);
    setStatusText(${initialPlayers[0].name}'s turn. Roll!);
    setScreen("game");
  };

  // Canvas Board Rendering
  const drawBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tile = canvas.width / 15;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Yards
    const drawYard = (gx: number, gy: number, hex: string) => {
      ctx.fillStyle = hex;
      ctx.fillRect(gx * tile, gy * tile, 6 * tile, 6 * tile);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect((gx + 1) * tile, (gy + 1) * tile, 4 * tile, 4 * tile);
    };
    drawYard(0, 0, PLAYERS_CFG.red.hex);
    drawYard(9, 0, PLAYERS_CFG.green.hex);
    drawYard(9, 9, PLAYERS_CFG.yellow.hex);
    drawYard(0, 9, PLAYERS_CFG.blue.hex);

    // Grid strokes
    for (let x = 0; x < 15; x++) {
      for (let y = 0; y < 15; y++) {
        if ((x >= 6 && x <= 8) || (y >= 6 && y <= 8)) {
          ctx.strokeStyle = "#334155";
          ctx.strokeRect(x * tile, y * tile, tile, tile);
        }
      }
    }

    // Home columns
    (Object.keys(HOME_PATHS) as Color[]).forEach((col) => {
      ctx.fillStyle = PLAYERS_CFG[col].hex;
      HOME_PATHS[col].forEach(([hx, hy]) => ctx.fillRect(hx * tile, hy * tile, tile, tile));
    });

    // Safe Stars
    ctx.fillStyle = "#FBBF24";
    ctx.font = ${tile * 0.55}px sans-serif;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    SAFE_INDICES.forEach((idx) => {
      const [tx, ty] = TRACK[idx];
      ctx.fillText("⭐", (tx + 0.5) * tile, (ty + 0.5) * tile);
    });

    // Center Triangles
    const center = 7.5 * tile;
    const drawCenterTri = (hex: string, x1: number, y1: number, x2: number, y2: number) => {
      ctx.fillStyle = hex;
      ctx.beginPath();
      ctx.moveTo(x1 * tile, y1 * tile);
      ctx.lineTo(center, center);
      ctx.lineTo(x2 * tile, y2 * tile);
      ctx.fill();
    };
    drawCenterTri(PLAYERS_CFG.red.hex, 6, 6, 6, 9);
    drawCenterTri(PLAYERS_CFG.green.hex, 6, 6, 9, 6);
    drawCenterTri(PLAYERS_CFG.yellow.hex, 9, 6, 9, 9);
    drawCenterTri(PLAYERS_CFG.blue.hex, 6, 9, 9, 9);

    // Pawns
    players.forEach((player) => {
      player.pawns.forEach((pawn, idx) => {
        const { x, y } = getPawnCoords(player.color, pawn.step, idx, tile);
        ctx.beginPath();
        ctx.arc(x, y, tile * 0.36, 0, Math.PI * 2);
        ctx.fillStyle = PLAYERS_CFG[player.color].hex;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#FFFFFF";
        ctx.stroke();
      });
    });
  };

  const getPawnCoords = (color: Color, step: number, idx: number, tile: number) => {
    if (step === 0) {
      const [gx, gy] = PLAYERS_CFG[color].yard[idx];
      return { x: (gx + 0.5) * tile, y: (gy + 0.5) * tile };
    }
    if (step <= 51) {
      const globalIdx = (PLAYERS_CFG[color].offset + step - 1) % 52;
      const [gx, gy] = TRACK[globalIdx];
      return { x: (gx + 0.5) * tile, y: (gy + 0.5) * tile };
    }
    const homeIdx = Math.min(step - 52, 5);
    const [gx, gy] = HOME_PATHS[color][homeIdx];
    return { x: (gx + 0.5) * tile, y: (gy + 0.5) * tile };
  };

  useEffect(() => {
    if (screen === "game") drawBoard();
  }, [players, turnIdx, screen]);

  // Dice Logic
  const handleRoll = () => {
    if (waitingMove) return;
    playSfx("roll");

    const rolled = Math.floor(Math.random() * 6) + 1;
    setDice(rolled);

    const active = players[turnIdx];
    const canMove = active.pawns.some((p) => (p.step === 0 ? rolled === 6 : p.step + rolled <= 57));

    if (!canMove) {
      setStatusText(Rolled a ${rolled}. No moves!);
      setTimeout(() => advanceTurn(false), 900);
    } else {
      setWaitingMove(true);
      setStatusText(Rolled ${rolled}! Tap a token to move.);
    }
  };

  // Canvas Click -> Move Pawn
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!waitingMove || dice === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const tile = canvasRef.current.width / 15;

    const active = players[turnIdx];
    for (let i = 0; i < active.pawns.length; i++) {
      const pawn = active.pawns[i];
      const coords = getPawnCoords(active.color, pawn.step, i, tile);

      if (Math.hypot(coords.x - cx, coords.y - cy) < tile * 0.5) {
        if (pawn.step === 0 && dice !== 6) return;
        if (pawn.step + dice > 57) return;

        playSfx("move");
        const nextStep = pawn.step === 0 ? 1 : pawn.step + dice;
        let bonusTurn = dice === 6;

        const nextPlayers = [...players];
        nextPlayers[turnIdx].pawns[i].step = nextStep;

        // Knockout / Capture check
        if (nextStep >= 1 && nextStep <= 51) {
          const landGlobal = (PLAYERS_CFG[active.color].offset + nextStep - 1) % 52;
          if (!SAFE_INDICES.includes(landGlobal)) {
            nextPlayers.forEach((opp, oIdx) => {
              if (oIdx !== turnIdx) {
                opp.pawns.forEach((ep) => {
                  if (ep.step >= 1 && ep.step <= 51) {
                    const oppGlobal = (PLAYERS_CFG[opp.color].offset + ep.step - 1) % 52;
                    if (oppGlobal === landGlobal) {
                      ep.step = 0; // Cut back to yard
                      bonusTurn = true;
                      playSfx("cut");
                      setStatusText(Captured ${opp.name}! Bonus roll awarded!);
                    }
                  }
                });
              }
            });
          }
        }

        setPlayers(nextPlayers);
        setWaitingMove(false);

        // Win Verification
        const finished = nextPlayers[turnIdx].pawns.filter((p) => p.step === 57).length;
        const target = mode === "QUICK" ? 1 : 4;
        if (finished >= target) {
          playSfx("win");
          setWinner(active.name);
          setScreen("victory");
          return;
        }

        if (bonusTurn) {
          setStatusText("Bonus Turn! Roll again.");
        } else {
          advanceTurn(false);
        }
        break;
      }
    }
  };

  const advanceTurn = (bonus: boolean) => {
    setWaitingMove(false);
    setDice(null);
    if (!bonus) {
      setTurnIdx((prev) => (prev + 1) % players.length);
      setStatusText(${players[(turnIdx + 1) % players.length].name}'s Turn);
    }
  };

  return (
    <div className="w-full min-h-screen max-w-[480px] mx-auto bg-slate-950 text-white font-sans flex flex-col justify-between shadow-2xl relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-amber-500/30">
        <div className="text-xl font-black text-amber-400 tracking-wider">LUDO PRO SUPERSTAR</div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-lg bg-slate-800 text-amber-400 border border-amber-500/30"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* DASHBOARD */}
      {screen === "dashboard" && (
        <div className="p-6 flex-1 flex flex-col justify-center space-y-5">
          <div className="bg-slate-900/90 border border-amber-500/40 p-6 rounded-2xl space-y-4">
            <h2 className="text-2xl font-black text-amber-400 text-center">MATCH STAKE</h2>

            <div>
              <label className="text-xs text-slate-400 uppercase font-bold">Wager Coin Pot</label>
              <select
                value={wager}
                onChange={(e) => setWager(Number(e.target.value))}
                className="w-full bg-slate-800 border border-amber-500/30 text-amber-400 font-extrabold px-4 py-3 rounded-xl mt-1 text-lg"
              >
                <option value={500}>🪙 500 Coins (Pot: 1,800)</option>
                <option value={1000}>🪙 1,000 Coins (Pot: 3,600)</option>
                <option value={5000}>🪙 5,000 Coins (Pot: 18,000)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase font-bold">Players</label>
              <select
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="w-full bg-slate-800 border border-amber-500/30 text-white px-4 py-3 rounded-xl mt-1"
              >
                <option value={2}>2 Players (Red vs Yellow)</option>
                <option value={4}>4 Players (Full Arena)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase font-bold">Game Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as GameMode)}
                className="w-full bg-slate-800 border border-amber-500/30 text-white px-4 py-3 rounded-xl mt-1"
              >
                <option value="CLASSIC">Classic (All 4 Home)</option>
                <option value="QUICK">Quick Rush (1st Token Wins)</option>
              </select>
            </div>

            <button
              onClick={startMatch}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xl rounded-xl shadow-lg mt-4 active:scale-95"
            >
              ENTER ARENA
            </button>
          </div>
        </div>
      )}

      {/* GAMEPLAY */}
      {screen === "game" && (
        <div className="flex-1 p-3 flex flex-col justify-between items-center">
          {/* Status */}
          <div className="w-full bg-slate-900 border border-amber-500/30 p-3 rounded-xl flex justify-between items-center">
            <span style={{ color: PLAYERS_CFG[players[turnIdx]?.color]?.hex }} className="font-extrabold text-sm uppercase">
              Turn: {players[turnIdx]?.name}
            </span>
            <span className="text-xs text-slate-300 font-semibold">{statusText}</span>
          </div>

          {/* Ludo Canvas Board */}
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            onClick={handleCanvasClick}
            className="rounded-xl border-2 border-amber-500/40 shadow-2xl bg-slate-900 my-auto cursor-pointer"
          />

          {/* Bottom Dice Actions */}
          <div className="w-full flex items-center justify-between gap-4 mt-2 mb-2">
            <button
              onClick={handleRoll}
              disabled={waitingMove}
              className={`flex-1 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xl rounded-2xl border-2 border-amber-300 shadow-xl transition-all ${
                waitingMove ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
              }`}
            >
              {dice ? DICE: ${dice} : "🎲 ROLL DICE"}
            </button>

            <button
              onClick={() => {
                if (confirm("Forfeit match?")) setScreen("dashboard");
              }}
              className="px-4 py-4 bg-red-950/60 border border-red-500/30 text-red-400 font-bold rounded-2xl text-xs"
            >
              Forfeit
            </button>
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {screen === "victory" && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-8 text-center max-w-sm w-full space-y-4">
            <div className="text-6xl animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-amber-400">{winner} WINS!</h2>
            <p className="text-slate-300 font-bold">
              Pot Collected: +{(wager * playerCount * 0.9).toLocaleString()} Coins
            </p>
            <button
              onClick={() => setScreen("dashboard")}
              className="w-full py-3 bg-amber-500 text-slate-950 font-black rounded-xl hover:bg-amber-400"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}